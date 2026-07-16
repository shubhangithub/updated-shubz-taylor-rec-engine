"""Runtime engine for Node2Vec graph embeddings."""
import json
import os
import numpy as np
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

ML_DATA = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'ml_data')

_embeddings = None
_index = None

def _load():
    global _embeddings, _index
    if _embeddings is not None:
        return
    emb_path = os.path.join(ML_DATA, 'graph_embeddings.npy')
    idx_path = os.path.join(ML_DATA, 'graph_index.json')
    if not os.path.exists(emb_path) or not os.path.exists(idx_path):
        logger.warning("Graph embeddings not found. Run: cd backend && python -m ml.compute_graph_embeddings")
        _embeddings = np.array([])
        _index = []
        return
    _embeddings = np.load(emb_path)
    with open(idx_path) as f:
        _index = json.load(f)
    logger.info(f"Loaded graph embeddings: {_embeddings.shape}")

def recommend(song_names: List[str], limit: int = 10, **kwargs) -> List[Dict]:
    _load()
    if _embeddings is None or len(_embeddings) == 0:
        return []

    name_lower = {n.lower(): i for i, n in enumerate(_index)}
    seed_indices = [name_lower[n.lower()] for n in song_names if n.lower() in name_lower]

    if not seed_indices:
        return []

    seed_emb = np.mean(_embeddings[seed_indices], axis=0, keepdims=True)

    norms = np.linalg.norm(_embeddings, axis=1, keepdims=True)
    norms[norms == 0] = 1
    normalized = _embeddings / norms
    seed_norm = seed_emb / max(np.linalg.norm(seed_emb), 1e-8)

    sims = (normalized @ seed_norm.T).flatten()

    ranked = np.argsort(-sims)
    results = []
    for idx in ranked:
        if idx in seed_indices:
            continue
        results.append({
            'name': _index[idx],
            'artist': 'Taylor Swift',
            'similarity': round(float(sims[idx]), 4),
            'recommendation_type': 'graph_node2vec',
            'explanation': f"Graph structural similarity: {round(float(sims[idx])*100)}% (64-dim Node2Vec embedding from biased random walks)",
        })
        if len(results) >= limit:
            break

    from app.engines.utils import diversify_results, filter_seed_variants
    results = filter_seed_variants(results, song_names)
    return diversify_results(results, temperature=0.25)
