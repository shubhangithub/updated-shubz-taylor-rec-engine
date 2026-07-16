"""
Engine 6: Contrastive Self-Supervised Learning (SimCLR-style, on lyrics)

Adapts the SimCLR recipe to song lyrics, with one major simplification:
the encoder (all-MiniLM-L6-v2) stays FROZEN and only a projection head is
trained. Pipeline:
1. Start from pre-computed MiniLM sentence embeddings (384-dim)
2. Create augmented views via lyrics perturbation (word dropout, line shuffle,
   section-header removal) and re-encode them with the same frozen encoder
3. Train a projection head with NT-Xent (InfoNCE) contrastive loss
4. Serve the 64-dim POST-projection space (a deliberate deviation from
   SimCLR, whose transfer results favor pre-projection features — the
   pre-projection space here is already served by Engine 1)

Papers:
- Chen et al. (2020) "A Simple Framework for Contrastive Learning of Visual
  Representations" (SimCLR), ICML — the implemented recipe (NT-Xent,
  projection head, augmentation-defined invariance)
- Spijkervet & Burgoyne (2021) "Contrastive Learning of Musical
  Representations" (CLMR), ISMIR — inspiration only: CLMR trains a SampleCNN
  end-to-end on raw audio waveforms, which this text-only pipeline does not do

Run once: cd backend && python -m ml.train_contrastive
"""
import json
import numpy as np
import os
import random
import re
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app')
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml_data')


class ProjectionHead(nn.Module):
    """SimCLR projection head: maps 384-dim BERT embeddings to 64-dim contrastive space."""
    def __init__(self, input_dim=384, hidden_dim=128, output_dim=64):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, output_dim),
        )

    def forward(self, x):
        return self.net(x)


def nt_xent_loss(z_i, z_j, temperature=0.07):
    """
    NT-Xent (Normalized Temperature-scaled Cross Entropy) loss.
    The core SimCLR contrastive objective.

    z_i, z_j: batch of positive pairs (N, D)
    For each sample i, z_j[i] is its positive pair.
    All other samples in the batch are negatives.
    """
    batch_size = z_i.size(0)

    # L2 normalize
    z_i = nn.functional.normalize(z_i, dim=1)
    z_j = nn.functional.normalize(z_j, dim=1)

    # Concatenate all representations
    z = torch.cat([z_i, z_j], dim=0)  # (2N, D)

    # Similarity matrix
    sim = torch.mm(z, z.t()) / temperature  # (2N, 2N)

    # Mask out self-similarity (diagonal)
    mask = torch.eye(2 * batch_size, dtype=torch.bool)
    sim.masked_fill_(mask, -1e9)

    # Positive pairs: (i, i+N) and (i+N, i)
    pos_i = torch.arange(batch_size)
    pos_j = pos_i + batch_size

    # For each anchor in [0..N-1], its positive is at [N..2N-1]
    labels_top = pos_j  # anchor i → positive at i+N
    labels_bottom = pos_i  # anchor i+N → positive at i
    labels = torch.cat([labels_top, labels_bottom])

    loss = nn.functional.cross_entropy(sim, labels)
    return loss


def augment_lyrics(lyrics: str, seed: int) -> str:
    """
    Create an augmented view of lyrics.
    Augmentations:
    1. Random word dropout (20%)
    2. Sentence order shuffle within sections
    3. Random section removal
    """
    rng = random.Random(seed)
    lines = lyrics.split('\n')

    # Remove section headers randomly (30% chance each)
    filtered = []
    for line in lines:
        if re.match(r'^\[.*\]$', line.strip()):
            if rng.random() > 0.3:
                filtered.append(line)
        else:
            filtered.append(line)
    lines = filtered

    # Shuffle sentences within random sections
    if len(lines) > 4 and rng.random() > 0.5:
        start = rng.randint(0, len(lines) // 2)
        end = min(start + rng.randint(3, 8), len(lines))
        chunk = lines[start:end]
        rng.shuffle(chunk)
        lines = lines[:start] + chunk + lines[end:]

    text = '\n'.join(lines)

    # Word dropout (20%)
    words = text.split()
    words = [w for w in words if rng.random() > 0.2]

    return ' '.join(words)


def main():
    os.environ['TOKENIZERS_PARALLELISM'] = 'false'

    # Load original BERT embeddings and lyrics
    print("Loading pre-computed BERT embeddings...", flush=True)
    orig_embeddings = np.load(os.path.join(OUT_DIR, 'lyrics_embeddings.npy'))
    with open(os.path.join(OUT_DIR, 'lyrics_index.json')) as f:
        index = json.load(f)

    # Load raw lyrics for augmentation
    with open(os.path.join(DATA_DIR, 'taylor_complete.json')) as f:
        taylor = json.load(f)
    cross_path = os.path.join(OUT_DIR, 'cross_artist_lyrics.json')
    cross = json.load(open(cross_path)) if os.path.exists(cross_path) else []

    # Build lyrics lookup
    lyrics_map = {}
    for s in taylor:
        if s.get('lyrics'):
            lyrics_map[s.get('name', '').lower()] = s['lyrics'][:1000]
    for s in cross:
        if s.get('lyrics'):
            lyrics_map[s.get('name', '').lower()] = s['lyrics'][:1000]

    N = len(index)
    print(f"Songs: {N}, Embedding dim: {orig_embeddings.shape[1]}", flush=True)

    # Create augmented views and encode them through BERT
    print("Creating augmented lyrics views and encoding...", flush=True)
    from sentence_transformers import SentenceTransformer
    # Must be the same encoder that produced lyrics_embeddings.npy
    bert = SentenceTransformer('all-MiniLM-L6-v2', device='cpu')

    aug_lyrics_1 = []
    aug_lyrics_2 = []
    valid_indices = []

    for i, entry in enumerate(index):
        name = entry.get('name', '').lower() if isinstance(entry, dict) else entry.lower()
        lyrics = lyrics_map.get(name, '')
        if len(lyrics) < 50:
            continue
        aug_lyrics_1.append(augment_lyrics(lyrics, seed=i * 2))
        aug_lyrics_2.append(augment_lyrics(lyrics, seed=i * 2 + 1))
        valid_indices.append(i)

    print(f"Augmenting {len(valid_indices)} songs with valid lyrics...", flush=True)

    # Encode augmented views
    aug_emb_1 = bert.encode(aug_lyrics_1, batch_size=16, show_progress_bar=True, device='cpu')
    aug_emb_2 = bert.encode(aug_lyrics_2, batch_size=16, show_progress_bar=True, device='cpu')

    print(f"Augmented embeddings: {aug_emb_1.shape}", flush=True)

    # Also keep original embeddings for valid songs
    orig_valid = orig_embeddings[valid_indices]

    # Train projection head with contrastive loss
    print("Training SimCLR projection head...", flush=True)

    proj = ProjectionHead(input_dim=384, hidden_dim=128, output_dim=64)
    optimizer = optim.Adam(proj.parameters(), lr=3e-4, weight_decay=1e-5)

    X1 = torch.FloatTensor(aug_emb_1)
    X2 = torch.FloatTensor(aug_emb_2)

    proj.train()
    for epoch in range(100):
        # Shuffle pairs together
        perm = torch.randperm(X1.size(0))
        total_loss = 0
        n_batches = 0

        for start in range(0, X1.size(0), 64):
            end = min(start + 64, X1.size(0))
            if end - start < 4:  # Need at least 4 samples for contrastive
                continue

            batch_idx = perm[start:end]
            b1 = X1[batch_idx]
            b2 = X2[batch_idx]

            optimizer.zero_grad()
            z1 = proj(b1)
            z2 = proj(b2)
            loss = nt_xent_loss(z1, z2, temperature=0.07)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
            n_batches += 1

        if (epoch + 1) % 20 == 0:
            avg_loss = total_loss / max(n_batches, 1)
            print(f"  Epoch {epoch+1}/100, NT-Xent Loss: {avg_loss:.4f}", flush=True)

    # Extract final contrastive embeddings for ALL songs (using original embeddings)
    print("Extracting contrastive embeddings for all songs...", flush=True)
    proj.eval()

    # For songs with valid lyrics, project their original BERT embeddings
    all_contrastive = np.zeros((N, 64), dtype=np.float32)
    with torch.no_grad():
        # Process valid songs
        valid_emb = torch.FloatTensor(orig_valid)
        # Process in batches to avoid BatchNorm issues with single samples
        for start in range(0, valid_emb.size(0), 64):
            end = min(start + 64, valid_emb.size(0))
            batch = valid_emb[start:end]
            if batch.size(0) > 1:
                projected = proj(batch).numpy()
            else:
                proj.eval()
                projected = proj(batch).numpy()
            for j, vi in enumerate(valid_indices[start:end]):
                all_contrastive[vi] = projected[j]

    # Save
    os.makedirs(OUT_DIR, exist_ok=True)
    np.save(os.path.join(OUT_DIR, 'contrastive_embeddings.npy'), all_contrastive)
    with open(os.path.join(OUT_DIR, 'contrastive_index.json'), 'w') as f:
        json.dump(index, f)

    torch.save(proj.state_dict(), os.path.join(OUT_DIR, 'contrastive_model.pt'))

    print(f"Saved contrastive embeddings: {all_contrastive.shape}", flush=True)
    taylor_count = sum(1 for e in index if (e.get('artist', '') if isinstance(e, dict) else 'Taylor Swift') == 'Taylor Swift')
    print(f"  Taylor: {taylor_count}, Cross-artist: {N - taylor_count}", flush=True)
    print(f"  Projection: 384-dim BERT → 64-dim contrastive (6:1 compression)", flush=True)


if __name__ == '__main__':
    main()
