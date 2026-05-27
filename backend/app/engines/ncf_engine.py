"""Runtime engine for Multi-Modal Neural Collaborative Filtering.
Trained on lyrics similarity (384-dim BERT) + audio features (9-dim) + editorial bridges."""
import json, os, numpy as np
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)
ML_DATA = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'ml_data')
_embeddings = None
_index = None

def _load():
    global _embeddings, _index
    if _embeddings is not None: return
    emb_path = os.path.join(ML_DATA, 'ncf_embeddings.npy')
    idx_path = os.path.join(ML_DATA, 'ncf_index.json')
    if not os.path.exists(emb_path):
        _embeddings = np.array([]); _index = []; return
    _embeddings = np.load(emb_path)
    with open(idx_path) as f: raw = json.load(f)
    _index = [e if isinstance(e, dict) else {'name': e, 'artist': 'Taylor Swift'} for e in raw]
    logger.info(f"Loaded NCF embeddings: {_embeddings.shape}")

def recommend(song_names: List[str], limit: int = 10, **kwargs) -> List[Dict]:
    _load()
    if _embeddings is None or len(_embeddings) == 0: return []
    name_map = {e['name'].lower(): i for i, e in enumerate(_index)}
    seed_indices = [name_map[n.lower()] for n in song_names if n.lower() in name_map]
    if not seed_indices: return []

    seed = np.mean(_embeddings[seed_indices], axis=0, keepdims=True)
    sims = (_embeddings @ seed.T).flatten()
    mn, mx = sims.min(), sims.max()
    if mx > mn: sims = (sims - mn) / (mx - mn)

    # Collect top Taylor AND top cross-artist separately to guarantee diversity
    taylor_results = []
    cross_results = []
    for idx in np.argsort(-sims):
        if idx in seed_indices: continue
        e = _index[idx]
        entry = {
            'name': e['name'], 'artist': e.get('artist', 'Taylor Swift'),
            'similarity': round(float(sims[idx]), 4),
            'recommendation_type': 'ncf',
            'explanation': f"Multi-modal NCF: {round(float(sims[idx])*100)}% (48-dim embedding from lyrics + audio + bridge signals)",
        }
        if e.get('artist', 'Taylor Swift') == 'Taylor Swift':
            if len(taylor_results) < limit: taylor_results.append(entry)
        else:
            if len(cross_results) < limit: cross_results.append(entry)
        if len(taylor_results) >= limit and len(cross_results) >= limit: break

    from app.engines.utils import interleave_results, diversify_results
    diversified = diversify_results(taylor_results + cross_results, temperature=0.25)
    return interleave_results(diversified, limit)
