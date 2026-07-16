"""
Engine 4: NCF-style neural song-pair model.
Adapts the MLP interaction function of Neural Collaborative Filtering
(He et al., 2017, WWW) to song-song pairs — there are NO real users or
listening histories here, so this is an adaptation of the paper's learned
interaction function, not an implementation of user-item NeuMF.

48-dim song embeddings over the full 801-song corpus (Taylor + cross-artist),
initialized from a PCA projection of 393-dim multi-modal features
(384-d lyrics embeddings + 9 z-scored audio features), then fine-tuned by an
MLP (96->48->1, dropout) with BCE on synthetic positive/negative pairs from
three signals: lyrics similarity, audio-feature similarity, and editorial
bridges.

Requires ml_data/lyrics_embeddings.npy — run ml.compute_lyrics_embeddings first.
Run once: cd backend && python -m ml.train_ncf
"""
import json
import numpy as np
import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
from sklearn.decomposition import PCA

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app')
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml_data')

FEATURE_KEYS = ['danceability', 'energy', 'loudness', 'speechiness', 'acousticness',
                'instrumentalness', 'liveness', 'valence', 'tempo']

EMBEDDING_DIM = 48
EPOCHS = 200


class NCFModel(nn.Module):
    """Song-pair scorer: shared song embedding table + MLP interaction function."""

    def __init__(self, num_songs, embedding_dim=EMBEDDING_DIM, init_weights=None):
        super().__init__()
        self.song_embedding = nn.Embedding(num_songs, embedding_dim)
        if init_weights is not None:
            with torch.no_grad():
                self.song_embedding.weight.copy_(torch.FloatTensor(init_weights))
        else:
            nn.init.xavier_uniform_(self.song_embedding.weight)
        # MLP interaction function: concat(48, 48) = 96 -> 48 -> 1
        self.mlp = nn.Sequential(
            nn.Linear(embedding_dim * 2, embedding_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(embedding_dim, 1),
            nn.Sigmoid(),
        )

    def forward(self, song_a, song_b):
        emb_a = self.song_embedding(song_a)
        emb_b = self.song_embedding(song_b)
        combined = torch.cat([emb_a, emb_b], dim=1)
        return self.mlp(combined).squeeze(1)


def main():
    np.random.seed(42)
    torch.manual_seed(42)

    # Full 801-song corpus: same universe as the lyrics engine
    lyrics_emb = np.load(os.path.join(OUT_DIR, 'lyrics_embeddings.npy')).astype(np.float32)
    with open(os.path.join(OUT_DIR, 'lyrics_index.json')) as f:
        index = json.load(f)
    num_songs = len(index)
    print(f"Training NCF-style pair model on {num_songs} songs")

    # Audio features (z-scored) for songs that have them; zeros (= mean) otherwise
    with open(os.path.join(DATA_DIR, 'taylor_complete.json')) as f:
        taylor = json.load(f)
    audio_by_name = {}
    for s in taylor:
        if all(s.get(k) is not None for k in FEATURE_KEYS):
            audio_by_name[s.get('name', '').lower()] = [float(s[k]) for k in FEATURE_KEYS]

    audio_raw = np.zeros((num_songs, len(FEATURE_KEYS)), dtype=np.float32)
    has_audio = np.zeros(num_songs, dtype=bool)
    for i, e in enumerate(index):
        if e.get('artist') == 'Taylor Swift':
            row = audio_by_name.get(e.get('name', '').lower())
            if row is not None:
                audio_raw[i] = row
                has_audio[i] = True
    mask = has_audio
    mu, sd = audio_raw[mask].mean(axis=0), audio_raw[mask].std(axis=0)
    sd[sd == 0] = 1
    audio_z = np.zeros_like(audio_raw)
    audio_z[mask] = (audio_raw[mask] - mu) / sd

    # 393-dim multi-modal features -> PCA projection initializes the embeddings
    features = np.concatenate([lyrics_emb, audio_z], axis=1)  # (N, 393)
    pca = PCA(n_components=EMBEDDING_DIM, random_state=42)
    init_weights = pca.fit_transform(features).astype(np.float32)
    init_weights /= max(np.abs(init_weights).max(), 1e-8)  # keep init in a sane range
    print(f"Initialized {init_weights.shape} embeddings from PCA of {features.shape[1]}-dim features")

    # --- Synthetic training pairs from three signals ---
    lyr_norm = lyrics_emb / np.clip(np.linalg.norm(lyrics_emb, axis=1, keepdims=True), 1e-8, None)
    lyr_sim = lyr_norm @ lyr_norm.T

    positive_pairs = {}

    def add_pos(i, j, label):
        key = (min(i, j), max(i, j))
        if i != j and (key not in positive_pairs or positive_pairs[key] < label):
            positive_pairs[key] = label

    # 1) lyrics similarity: top-2 neighbors per song (floor 0.5)
    for i in range(num_songs):
        order = np.argsort(-lyr_sim[i])
        added = 0
        for j in order:
            if j == i:
                continue
            if lyr_sim[i][j] < 0.5 or added >= 2:
                break
            add_pos(i, int(j), 1.0)
            added += 1

    # 2) audio-feature similarity among songs with real features
    # (z-scored first — raw Spotify features are all non-negative, which
    #  inflates cosine similarity so much that thresholds become vacuous)
    audio_idx = np.where(mask)[0]
    a = audio_z[audio_idx]
    a_norm = a / np.clip(np.linalg.norm(a, axis=1, keepdims=True), 1e-8, None)
    a_sim = a_norm @ a_norm.T
    iu = np.triu_indices(len(audio_idx), k=1)
    audio_thresh = np.quantile(a_sim[iu], 0.995)  # top 0.5% of pairs
    for ii, jj in zip(*np.where(a_sim > audio_thresh)):
        if ii < jj:
            add_pos(int(audio_idx[ii]), int(audio_idx[jj]), 0.8)

    # 3) editorial bridges: direct source-song -> bridged-song pairs
    from app.editorial import EDITORIAL_BRIDGES
    pos_by_key = {}
    for i, e in enumerate(index):
        pos_by_key[(e.get('name', '').lower(), e.get('artist', '').lower())] = i
    name_only = {}
    for i, e in enumerate(index):
        name_only.setdefault(e.get('name', '').lower(), i)
    bridge_hits = 0
    for song_name, bridges in EDITORIAL_BRIDGES.items():
        src = pos_by_key.get((song_name.lower(), 'taylor swift'))
        if src is None:
            src = name_only.get(song_name.lower())
        if src is None:
            continue
        for b in bridges:
            tgt = pos_by_key.get((str(b.get('song', '')).lower(), str(b.get('artist', '')).lower()))
            if tgt is not None:
                add_pos(src, tgt, 1.0)
                bridge_hits += 1
    print(f"Editorial-bridge pairs matched into the corpus: {bridge_hits}")

    # Negatives: random pairs from the least-similar decile of lyrics
    # similarity, 2x positives. The threshold is a quantile of the actual
    # distribution — a fixed absolute cutoff can silently yield zero
    # negatives and collapse training to all-positive labels.
    iu_all = np.triu_indices(num_songs, k=1)
    neg_thresh = float(np.quantile(lyr_sim[iu_all], 0.10))
    negative_pairs = {}
    target_neg = 2 * len(positive_pairs)
    rng = np.random.default_rng(42)
    attempts = 0
    while len(negative_pairs) < target_neg and attempts < target_neg * 50:
        i, j = rng.integers(0, num_songs, 2)
        attempts += 1
        key = (min(int(i), int(j)), max(int(i), int(j)))
        if i == j or key in positive_pairs or key in negative_pairs:
            continue
        if lyr_sim[i][j] < neg_thresh:
            negative_pairs[key] = 0.0
    assert negative_pairs, "negative sampling produced zero pairs — check thresholds"

    all_pairs = [(a_, b_, l_) for (a_, b_), l_ in positive_pairs.items()]
    all_pairs += [(a_, b_, l_) for (a_, b_), l_ in negative_pairs.items()]
    print(f"Training pairs: {len(all_pairs)} ({len(positive_pairs)} pos, {len(negative_pairs)} neg)")

    pairs_a = torch.LongTensor([p[0] for p in all_pairs])
    pairs_b = torch.LongTensor([p[1] for p in all_pairs])
    labels = torch.FloatTensor([p[2] for p in all_pairs])

    dataset = TensorDataset(pairs_a, pairs_b, labels)
    loader = DataLoader(dataset, batch_size=128, shuffle=True)

    model = NCFModel(num_songs, embedding_dim=EMBEDDING_DIM, init_weights=init_weights)
    optimizer = optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-5)
    criterion = nn.BCELoss()

    model.train()
    for epoch in range(EPOCHS):
        total_loss = 0
        for batch_a, batch_b, batch_labels in loader:
            optimizer.zero_grad()
            preds = model(batch_a, batch_b)
            loss = criterion(preds, batch_labels)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        if (epoch + 1) % 50 == 0:
            print(f"  Epoch {epoch+1}/{EPOCHS}, Loss: {total_loss/len(loader):.4f}")

    model.eval()
    with torch.no_grad():
        embeddings = model.song_embedding.weight.numpy()

    os.makedirs(OUT_DIR, exist_ok=True)
    np.save(os.path.join(OUT_DIR, 'ncf_embeddings.npy'), embeddings.astype(np.float32))
    with open(os.path.join(OUT_DIR, 'ncf_index.json'), 'w') as f:
        json.dump(index, f)
    torch.save(model.state_dict(), os.path.join(OUT_DIR, 'ncf_model.pt'))

    print(f"Saved {embeddings.shape} NCF embeddings to ml_data/")


if __name__ == '__main__':
    main()
