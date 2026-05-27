"""
Engine 3: Node2Vec graph embeddings.
Builds a song similarity graph and learns structural embeddings via biased random walks.
Run once: python -m ml.compute_graph_embeddings
"""
import json
import numpy as np
import os
import networkx as nx
from sklearn.metrics.pairwise import cosine_similarity

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app')
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml_data')

FEATURE_KEYS = ['danceability', 'energy', 'loudness', 'speechiness', 'acousticness',
                'instrumentalness', 'liveness', 'valence', 'tempo']

def normalize_feature(key, val):
    val = float(val)
    if key == 'loudness':
        return (val + 60) / 60
    elif key == 'tempo':
        return (val - 50) / 150
    return val

def main():
    with open(os.path.join(DATA_DIR, 'taylor_complete.json'), 'r') as f:
        songs = json.load(f)

    # Load editorial bridges
    from app.editorial import EDITORIAL_BRIDGES

    # Filter songs with features
    valid_songs = []
    for s in songs:
        if all(s.get(k) is not None for k in FEATURE_KEYS[:5]):
            valid_songs.append(s)

    names = [s.get('name', f'song_{i}') for i, s in enumerate(valid_songs)]
    print(f"Building graph for {len(names)} songs")

    # Build feature matrix
    feat_matrix = []
    for s in valid_songs:
        row = [normalize_feature(k, s.get(k, 0)) for k in FEATURE_KEYS]
        feat_matrix.append(row)
    feat_matrix = np.array(feat_matrix, dtype=np.float32)

    # Compute pairwise cosine similarity
    sim_matrix = cosine_similarity(feat_matrix)

    # Build graph
    G = nx.Graph()
    for i, name in enumerate(names):
        G.add_node(i, name=name, album=valid_songs[i].get('album', ''))

    # Add edges based on feature similarity (threshold > 0.85)
    edge_count = 0
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            sim = sim_matrix[i][j]
            if sim > 0.85:
                G.add_edge(i, j, weight=float(sim))
                edge_count += 1

    # Add edges for same-era songs (weaker)
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            if valid_songs[i].get('album') == valid_songs[j].get('album'):
                if not G.has_edge(i, j):
                    G.add_edge(i, j, weight=0.5)
                    edge_count += 1

    # Add edges for editorial bridges
    name_to_idx = {n.lower(): i for i, n in enumerate(names)}
    for song_name, bridges in EDITORIAL_BRIDGES.items():
        src_idx = name_to_idx.get(song_name.lower())
        if src_idx is None:
            continue
        # Connect bridged Taylor songs to each other
        for bridge in bridges:
            era = bridge.get('era_connection', '')
            # Find Taylor songs from that era
            for j, s in enumerate(valid_songs):
                if s.get('album', '').lower() == era.lower() and j != src_idx:
                    if not G.has_edge(src_idx, j):
                        G.add_edge(src_idx, j, weight=0.7)
                        edge_count += 1

    print(f"Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

    # If graph is too sparse, lower threshold
    if G.number_of_edges() < len(names) * 2:
        print("Graph too sparse, adding more edges at 0.75 threshold...")
        for i in range(len(names)):
            for j in range(i + 1, len(names)):
                sim = sim_matrix[i][j]
                if sim > 0.75 and not G.has_edge(i, j):
                    G.add_edge(i, j, weight=float(sim))
        print(f"Graph now: {G.number_of_edges()} edges")

    # Node2Vec using gensim Word2Vec on random walks
    from gensim.models import Word2Vec

    # Generate biased random walks
    print("Generating random walks...")
    walks = []
    num_walks = 20
    walk_length = 40

    nodes = list(G.nodes())
    for _ in range(num_walks):
        np.random.shuffle(nodes)
        for start in nodes:
            walk = [start]
            for _ in range(walk_length - 1):
                current = walk[-1]
                neighbors = list(G.neighbors(current))
                if not neighbors:
                    break
                # Weighted random choice
                weights = [G[current][n].get('weight', 1.0) for n in neighbors]
                total = sum(weights)
                probs = [w / total for w in weights]
                next_node = np.random.choice(neighbors, p=probs)
                walk.append(next_node)
            walks.append([str(n) for n in walk])

    print(f"Generated {len(walks)} walks")

    # Train Word2Vec on walks (this IS Node2Vec)
    print("Training Node2Vec embeddings...")
    model = Word2Vec(
        walks,
        vector_size=64,
        window=10,
        min_count=1,
        sg=1,  # Skip-gram
        workers=4,
        epochs=30,
    )

    # Extract embeddings
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
