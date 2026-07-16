"""Runtime engine for modern instruction-aware lyrics embeddings.
1024-dim Qwen3-Embedding-0.6B vectors over full, untruncated lyrics
(32K-token context vs MiniLM's 256-wordpiece limit) — the 2025-era
counterpart to Engine 1's 2019-era encoder; see ml/compute_qwen3_embeddings.py."""
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
    emb_path = os.path.join(ML_DATA, 'qwen3_embeddings.npy')
    idx_path = os.path.join(ML_DATA, 'qwen3_index.json')
    if not os.path.exists(emb_path) or not os.path.exists(idx_path):
        logger.warning("Qwen3 embeddings not found. Run: cd backend && python -m ml.compute_qwen3_embeddings")
        _embeddings = np.array([]); _index = []; return
    _embeddings = np.load(emb_path)
    with open(idx_path) as f: raw = json.load(f)
    _index = [e if isinstance(e, dict) else {'name': e, 'artist': 'Taylor Swift'} for e in raw]
    logger.info(f"Loaded Qwen3 embeddings: {_embeddings.shape}")

def recommend(song_names: List[str], limit: int = 10, **kwargs) -> List[Dict]:
    _load()
    if _embeddings is None or len(_embeddings) == 0: return []
    from app.engines.utils import resolve_seed_indices
    seed_indices = resolve_seed_indices(song_names, _index)
    if not seed_indices: return []

    seed = np.mean(_embeddings[seed_indices], axis=0, keepdims=True)
    norms = np.linalg.norm(_embeddings, axis=1, keepdims=True)
    norms[norms == 0] = 1
    normalized = _embeddings / norms
    seed_norm = seed / max(np.linalg.norm(seed), 1e-8)
    sims = (normalized @ seed_norm.T).flatten()

    dim = _embeddings.shape[1]
    results = []
    seen = set()
    for idx in np.argsort(-sims):
        if idx in seed_indices: continue
        e = _index[idx]
        dedup_key = (e['name'].lower(), e.get('artist', 'Taylor Swift').lower())
        if dedup_key in seen: continue
        seen.add(dedup_key)
        results.append({
            'name': e['name'], 'artist': e.get('artist', 'Taylor Swift'),
            'similarity': round(float(sims[idx]), 4),
            'recommendation_type': 'qwen3_embed',
            'explanation': f"Modern-encoder semantic similarity: cosine {round(float(sims[idx]), 2)} ({dim}-dim Qwen3 embedding of the full lyrics)",
        })
        if len(results) >= limit * 3: break

    from app.engines.utils import interleave_results, diversify_results
    diversified = diversify_results(results, temperature=0.25)
    return interleave_results(diversified, limit)
