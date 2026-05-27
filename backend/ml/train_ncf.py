"""
Engine 4: Neural Collaborative Filtering.
Trains a neural network on synthetic song-song interactions derived from
editorial bridges, era co-occurrence, and feature similarity.
Run once: python -m ml.train_ncf
"""
import json
import numpy as np
import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
from sklearn.metrics.pairwise import cosine_similarity

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app')
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml_data')

FEATURE_KEYS = ['danceability', 'energy', 'loudness', 'speechiness', 'acousticness',
                'instrumentalness', 'liveness', 'valence', 'tempo']

class NCFModel(nn.Module):
    def __init__(self, num_songs, embedding_dim=32, hidden_dim=64):
        super().__init__()
        self.song_embedding = nn.Embedding(num_songs, embedding_dim)
        self.mlp = nn.Sequential(
            nn.Linear(embedding_dim * 2, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim // 2, 1),
            nn.Sigmoid(),
        )
        nn.init.xavier_uniform_(self.song_embedding.weight)

    def forward(self, song_a, song_b):
        emb_a = self.song_embedding(song_a)
        emb_b = self.song_embedding(song_b)
        combined = torch.cat([emb_a, emb_b], dim=1)
        return self.mlp(combined).squeeze(1)

def normalize_feature(key, val):
    val = float(val)
    if key == 'loudness':
        return (val + 60) / 60
    elif key == 'tempo':
        return (val - 50) / 150
    return max(0, min(1, val))

def main():
    with open(os.path.join(DATA_DIR, 'taylor_complete.json'), 'r') as f:
        songs = json.load(f)

    from app.editorial import EDITORIAL_BRIDGES

    # Filter songs with features
    valid_songs = [s for s in songs if all(s.get(k) is not None for k in FEATURE_KEYS[:5])]
    names = [s.get('name', '') for s in valid_songs]
    name_to_idx = {n.lower(): i for i, n in enumerate(names)}
    num_songs = len(names)

    print(f"Training NCF on {num_songs} songs")

    # Build feature matrix for similarity computation
    feat_matrix = np.array([
        [normalize_feature(k, s.get(k, 0)) for k in FEATURE_KEYS]
        for s in valid_songs
    ], dtype=np.float32)
    sim_matrix = cosine_similarity(feat_matrix)

    # Generate training pairs
    positive_pairs = []
    negative_pairs = []

    # Positive: high feature similarity (>0.9)
    for i in range(num_songs):
        for j in range(i + 1, num_songs):
            if sim_matrix[i][j] > 0.9:
                positive_pairs.append((i, j, 1.0))

    # Positive: same era (weaker signal)
    for i in range(num_songs):
        for j in range(i + 1, num_songs):
            if valid_songs[i].get('album') == valid_songs[j].get('album'):
                positive_pairs.append((i, j, 0.7))

    # Positive: editorial bridge connection
    for song_name, bridges in EDITORIAL_BRIDGES.items():
        src_idx = name_to_idx.get(song_name.lower())
        if src_idx is None:
            continue
        era = bridges[0].get('era_connection', '') if bridges else ''
        for j, s in enumerate(valid_songs):
            if s.get('album', '').lower() == era.lower() and j != src_idx:
                positive_pairs.append((src_idx, j, 0.8))

    # Negative: random pairs with low similarity
    np.random.seed(42)
    neg_count = len(positive_pairs) * 2
    for _ in range(neg_count):
        i, j = np.random.randint(0, num_songs, 2)
        if i != j and sim_matrix[i][j] < 0.5:
            negative_pairs.append((i, j, 0.0))

    # Deduplicate
    seen = set()
    all_pairs = []
    for a, b, label in positive_pairs + negative_pairs:
        key = (min(a, b), max(a, b))
        if key not in seen:
            seen.add(key)
            all_pairs.append((a, b, label))

    print(f"Training pairs: {len(all_pairs)} ({len(positive_pairs)} pos, {len(negative_pairs)} neg)")

    # Prepare tensors
    pairs_a = torch.LongTensor([p[0] for p in all_pairs])
    pairs_b = torch.LongTensor([p[1] for p in all_pairs])
    labels = torch.FloatTensor([p[2] for p in all_pairs])

    dataset = TensorDataset(pairs_a, pairs_b, labels)
    loader = DataLoader(dataset, batch_size=128, shuffle=True)

    model = NCFModel(num_songs, embedding_dim=32, hidden_dim=64)
    optimizer = optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-5)
    criterion = nn.BCELoss()

    model.train()
    for epoch in range(300):
        total_loss = 0
        for batch_a, batch_b, batch_labels in loader:
            optimizer.zero_grad()
            preds = model(batch_a, batch_b)
            loss = criterion(preds, batch_labels)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        if (epoch + 1) % 50 == 0:
            print(f"  Epoch {epoch+1}/300, Loss: {total_loss/len(loader):.4f}")

    # Extract learned embeddings
    model.eval()
    with torch.no_grad():
        embeddings = model.song_embedding.weight.numpy()

    os.makedirs(OUT_DIR, exist_ok=True)
    np.save(os.path.join(OUT_DIR, 'ncf_embeddings.npy'), embeddings.astype(np.float32))
    with open(os.path.join(OUT_DIR, 'ncf_index.json'), 'w') as f:
        json.dump(names, f)

    torch.save(model.state_dict(), os.path.join(OUT_DIR, 'ncf_model.pt'))

    print(f"Saved {embeddings.shape} NCF embeddings to ml_data/")

if __name__ == '__main__':
    main()
