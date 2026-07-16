"""
Engine 3: Node2Vec graph embeddings (Grover & Leskovec, 2016, KDD).

Multi-artist song graph over the FULL lyrics corpus (Taylor + cross-artist).
Every song has a lyrics embedding, so lyric-similarity is the backbone that
connects all artists; on top of that we add audio-feature similarity and
same-era edges (Taylor songs, which have audio features) and editorial-bridge
edges that link a Taylor song directly to its bridged cross-artist target.
Second-order biased walks (p=1, q=2) then a skip-gram Word2Vec learn 64-dim
structural embeddings for every song — so the graph engine now surfaces
cross-artist neighbours, not just Taylor ones.

Requires ml_data/lyrics_embeddings.npy — run ml.compute_lyrics_embeddings first.
Run once: cd backend && python -m ml.compute_graph_embeddings
"""
import json
import numpy as np
import os
import networkx as nx

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app')
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml_data')

FEATURE_KEYS = ['danceability', 'energy', 'loudness', 'speechiness', 'acousticness',
                'instrumentalness', 'liveness', 'valence', 'tempo']

# node2vec walk parameters (see HowItWorks "Engine 3")
P = 1.0   # return parameter
Q = 2.0   # in-out parameter (>1 = BFS-leaning, structural similarity)
NUM_WALKS = 15
WALK_LENGTH = 40
LYRIC_K = 8   # lyric-similarity neighbours per node (backbone across artists)
AUDIO_K = 5   # audio-similarity neighbours (Taylor songs with features)


def node2vec_walk(G, start, walk_length, p=P, q=Q, rng=None):
    """Second-order biased random walk per Grover & Leskovec (2016)."""
    rng = rng or np.random
    walk = [start]
    while len(walk) < walk_length:
        curr = walk[-1]
        nbrs = list(G.neighbors(curr))
        if not nbrs:
            break
        if len(walk) == 1:
            weights = [G[curr][x].get('weight', 1.0) for x in nbrs]
        else:
            prev = walk[-2]
            prev_nbrs = set(G.neighbors(prev))
            weights = []
            for x in nbrs:
                w = G[curr][x].get('weight', 1.0)
                if x == prev:
                    w /= p
                elif x not in prev_nbrs:
                    w /= q
                weights.append(w)
        probs = np.asarray(weights, dtype=np.float64)
        probs /= probs.sum()
        walk.append(int(rng.choice(nbrs, p=probs)))
    return walk


def main():
    np.random.seed(42)

    # Full corpus: every song has a lyrics embedding
    lyr = np.load(os.path.join(OUT_DIR, 'lyrics_embeddings.npy')).astype(np.float32)
    with open(os.path.join(OUT_DIR, 'lyrics_index.json')) as f:
        index = json.load(f)
    N = len(index)
    names = [e['name'] for e in index]
    artists = [e.get('artist', 'Taylor Swift') for e in index]
    print(f"Building multi-artist graph for {N} songs "
          f"({sum(a=='Taylor Swift' for a in artists)} Taylor + "
          f"{sum(a!='Taylor Swift' for a in artists)} cross-artist)")

    # Audio features for the Taylor songs that have them
    with open(os.path.join(DATA_DIR, 'taylor_complete.json')) as f:
        taylor = json.load(f)
    audio_by_name = {
        s.get('name', '').lower(): [float(s[k]) for k in FEATURE_KEYS]
        for s in taylor if all(s.get(k) is not None for k in FEATURE_KEYS)
    }

    from app.editorial import EDITORIAL_BRIDGES

    G = nx.Graph()
    for i in range(N):
        G.add_node(i, name=names[i], artist=artists[i])

    # Backbone: top-K lyric-similarity neighbours per song (connects all artists)
    lyr_norm = lyr / np.clip(np.linalg.norm(lyr, axis=1, keepdims=True), 1e-8, None)
    lyric_edges = 0
    for i in range(N):
        sims = lyr_norm @ lyr_norm[i]
        for j in np.argsort(-sims)[1:LYRIC_K + 1]:
            j = int(j)
            w = float(sims[j])
            if w <= 0.1:
                continue
            if not G.has_edge(i, j):
                G.add_edge(i, j, weight=w)
                lyric_edges += 1

    # Audio-feature similarity among Taylor songs with features (z-scored)
    aud_idx = [i for i in range(N) if names[i].lower() in audio_by_name and artists[i] == 'Taylor Swift']
    audio_edges = 0
    if len(aud_idx) > AUDIO_K:
        A = np.array([audio_by_name[names[i].lower()] for i in aud_idx], dtype=np.float32)
        A = (A - A.mean(0)) / np.clip(A.std(0), 1e-8, None)
        A = A / np.clip(np.linalg.norm(A, axis=1, keepdims=True), 1e-8, None)
        asim = A @ A.T
        for a in range(len(aud_idx)):
            for b in np.argsort(-asim[a])[1:AUDIO_K + 1]:
                i, j = aud_idx[a], aud_idx[int(b)]
                if not G.has_edge(i, j):
                    G.add_edge(i, j, weight=float(asim[a][int(b)]))
                    audio_edges += 1

    # Same-era membership among Taylor songs (album match)
    era_edges = 0
    taylor_idx = [i for i in range(N) if artists[i] == 'Taylor Swift']
    album_of = {s.get('name', '').lower(): s.get('album', '') for s in taylor}
    for a in range(len(taylor_idx)):
        for b in range(a + 1, len(taylor_idx)):
            i, j = taylor_idx[a], taylor_idx[b]
            al_i = album_of.get(names[i].lower(), '')
            if al_i and al_i == album_of.get(names[j].lower(), ''):
                if not G.has_edge(i, j):
                    G.add_edge(i, j, weight=0.5)
                    era_edges += 1

    # Editorial bridges: Taylor song -> its actual bridged cross-artist target
    key_to_idx = {(names[i].lower(), artists[i].lower()): i for i in range(N)}
    name_to_idx = {}
    for i in range(N):
        name_to_idx.setdefault(names[i].lower(), i)
    bridge_edges = 0
    for src_name, bridges in EDITORIAL_BRIDGES.items():
        src = name_to_idx.get(src_name.lower())
        if src is None:
            continue
        for b in bridges:
            tgt = key_to_idx.get((b.get('song', '').lower(), b.get('artist', '').lower()))
            if tgt is None:
                tgt = name_to_idx.get(b.get('song', '').lower())
            if tgt is not None and tgt != src and not G.has_edge(src, tgt):
                G.add_edge(src, tgt, weight=0.9)  # strong: hand-curated link
                bridge_edges += 1

    print(f"Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges "
          f"(lyric {lyric_edges}, audio {audio_edges}, era {era_edges}, bridges {bridge_edges})")

    print(f"Generating node2vec walks (p={P}, q={Q})...")
    walks = []
    nodes = list(G.nodes())
    for _ in range(NUM_WALKS):
        np.random.shuffle(nodes)
        for start in nodes:
            walks.append([str(n) for n in node2vec_walk(G, start, WALK_LENGTH)])
    print(f"Generated {len(walks)} walks")

    from gensim.models import Word2Vec
    print("Training skip-gram on walks...")
    model = Word2Vec(walks, vector_size=64, window=10, min_count=1, sg=1,
                     workers=4, epochs=30, seed=42)

    embeddings = np.zeros((N, 64), dtype=np.float32)
    for i in range(N):
        if str(i) in model.wv:
            embeddings[i] = model.wv[str(i)]

    os.makedirs(OUT_DIR, exist_ok=True)
    np.save(os.path.join(OUT_DIR, 'graph_embeddings.npy'), embeddings)
    # dict index carries artist so the runtime engine can surface cross-artist songs
    with open(os.path.join(OUT_DIR, 'graph_index.json'), 'w') as f:
        json.dump([{'name': names[i], 'artist': artists[i]} for i in range(N)], f)

    print(f"Saved {embeddings.shape} multi-artist graph embeddings to ml_data/")


if __name__ == '__main__':
    main()
