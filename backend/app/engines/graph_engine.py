"""Runtime engine for Node2Vec graph embeddings (multi-artist).
64-dim structural embeddings over the full Taylor + cross-artist corpus;
see ml/compute_graph_embeddings.py."""
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
        raw = json.load(f)
    # Accept both the old list-of-names format and the new {name, artist} dicts
    _index = [e if isinstance(e, dict) else {'name': e, 'artist': 'Taylor Swift'} for e in raw]
    logger.info(f"Loaded graph embeddings: {_embeddings.shape}")

def recommend(song_names: List[str], limit: int = 10, **kwargs) -> List[Dict]:
    _load()
    if _embeddings is None or len(_embeddings) == 0:
        return []

    from app.engines.utils import resolve_seed_indices
    seed_indices = resolve_seed_indices(song_names, _index)
    if not seed_indices:
        return []

    seed_emb = np.mean(_embeddings[seed_indices], axis=0, keepdims=True)
    norms = np.linalg.norm(_embeddings, axis=1, keepdims=True)
    norms[norms == 0] = 1
    normalized = _embeddings / norms
    seed_norm = seed_emb / max(np.linalg.norm(seed_emb), 1e-8)
    sims = (normalized @ seed_norm.T).flatten()

    results = []
    seen = set()
    for idx in np.argsort(-sims):
        if idx in seed_indices:
            continue
        if not _embeddings[idx].any():  # nodes that never appeared in a walk
            continue
        e = _index[idx]
        dedup_key = (e['name'].lower(), e.get('artist', 'Taylor Swift').lower())
        if dedup_key in seen:
            continue
        seen.add(dedup_key)
        results.append({
            'name': e['name'],
            'artist': e.get('artist', 'Taylor Swift'),
            'similarity': round(float(sims[idx]), 4),
            'recommendation_type': 'graph_node2vec',
            'explanation': f"Graph structural similarity: cosine {round(float(sims[idx]), 2)} (64-dim node2vec embedding from biased random walks)",
        })
        if len(results) >= limit * 3:
            break

    from app.engines.utils import interleave_results, diversify_results, filter_seed_variants
    results = filter_seed_variants(results, song_names)
    diversified = diversify_results(results, temperature=0.25)
    return interleave_results(diversified, limit)
