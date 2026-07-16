"""
Engine 3: Node2Vec graph embeddings (Grover & Leskovec, 2016, KDD).
Builds a sparse song graph from three signals (audio-feature similarity,
same-era membership, editorial bridges), runs second-order biased random
walks with return parameter p=1 and in-out parameter q=2 (BFS-leaning,
favors structural similarity), and trains skip-gram Word2Vec on the walks.

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
NUM_WALKS = 20
WALK_LENGTH = 40
TOP_K = 5  # similarity neighbors per node — keeps the graph genuinely sparse


def node2vec_walk(G, start, walk_length, p=P, q=Q, rng=None):
    """Second-order biased random walk per Grover & Leskovec (2016).

    Transition weight from curr to x given previous node t:
      w(curr,x)/p  if x == t          (return)
      w(curr,x)    if x is a neighbor of t   (distance 1)
      w(curr,x)/q  otherwise          (explore outward)
    """
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

    with open(os.path.join(DATA_DIR, 'taylor_complete.json'), 'r') as f:
        songs = json.load(f)

    from app.editorial import EDITORIAL_BRIDGES

    valid_songs = [s for s in songs if all(s.get(k) is not None for k in FEATURE_KEYS)]
    names = [s.get('name', f'song_{i}') for i, s in enumerate(valid_songs)]
    print(f"Building graph for {len(names)} songs")

    # z-score features before cosine — raw Spotify features are all
    # non-negative, which pushes almost every pairwise cosine above 0.85
    # and would make a threshold graph nearly complete.
    feat = np.array([[float(s[k]) for k in FEATURE_KEYS] for s in valid_songs], dtype=np.float32)
    feat = (feat - feat.mean(axis=0)) / np.clip(feat.std(axis=0), 1e-8, None)
    norm = feat / np.clip(np.linalg.norm(feat, axis=1, keepdims=True), 1e-8, None)
    sim_matrix = norm @ norm.T

    G = nx.Graph()
    for i, name in enumerate(names):
        G.add_node(i, name=name, album=valid_songs[i].get('album', ''))

    # Signal 1: editorial bridges first, so they always contribute edges —
    # bridges point at cross-artist songs that aren't nodes here, so the
    # source song is linked to Taylor songs from the bridge's era_connection.
    name_to_idx = {n.lower(): i for i, n in enumerate(names)}
    bridge_edges = 0
    for song_name, bridges in EDITORIAL_BRIDGES.items():
        src_idx = name_to_idx.get(song_name.lower())
        if src_idx is None:
            continue
        for bridge in bridges:
            era = bridge.get('era_connection', '')
            for j, s in enumerate(valid_songs):
                if s.get('album', '').lower() == era.lower() and j != src_idx:
                    if not G.has_edge(src_idx, j):
                        G.add_edge(src_idx, j, weight=0.7)
                        bridge_edges += 1

    # Signal 2: top-K audio-similarity neighbors per node (sparse by design)
    sim_edges = 0
    for i in range(len(names)):
        for j in np.argsort(-sim_matrix[i])[1:TOP_K + 1]:
            j = int(j)
            if sim_matrix[i][j] <= 0.0:
                continue
            if G.has_edge(i, j):
                G[i][j]['weight'] = max(G[i][j]['weight'], float(sim_matrix[i][j]))
            else:
                G.add_edge(i, j, weight=float(sim_matrix[i][j]))
                sim_edges += 1

    # Signal 3: same-era membership (weaker)
    era_edges = 0
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            if valid_songs[i].get('album') == valid_songs[j].get('album'):
                if not G.has_edge(i, j):
                    G.add_edge(i, j, weight=0.5)
                    era_edges += 1

    print(f"Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges "
          f"(bridges {bridge_edges}, similarity {sim_edges}, era {era_edges})")

    # Second-order biased walks (p=1, q=2), then skip-gram Word2Vec
    print(f"Generating node2vec walks (p={P}, q={Q})...")
    walks = []
    nodes = list(G.nodes())
    for _ in range(NUM_WALKS):
        np.random.shuffle(nodes)
        for start in nodes:
            walk = node2vec_walk(G, start, WALK_LENGTH)
            walks.append([str(n) for n in walk])
    print(f"Generated {len(walks)} walks")

    from gensim.models import Word2Vec
    print("Training skip-gram on walks...")
    model = Word2Vec(
        walks,
        vector_size=64,
        window=10,
        min_count=1,
        sg=1,  # skip-gram
        workers=4,
        epochs=30,
        seed=42,
    )

    embeddings = np.zeros((len(names), 64), dtype=np.float32)
    for i in range(len(names)):
        if str(i) in model.wv:
            embeddings[i] = model.wv[str(i)]

    os.makedirs(OUT_DIR, exist_ok=True)
    np.save(os.path.join(OUT_DIR, 'graph_embeddings.npy'), embeddings)
    with open(os.path.join(OUT_DIR, 'graph_index.json'), 'w') as f:
        json.dump(names, f)

    print(f"Saved {embeddings.shape} graph embeddings to ml_data/")


if __name__ == '__main__':
    main()
