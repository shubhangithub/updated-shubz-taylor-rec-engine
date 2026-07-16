"""Runtime engine for the NCF-style neural song-pair model.
48-dim embeddings over 801 songs, PCA-initialized from multi-modal features
(384-d lyrics + 9 z-scored audio) and fine-tuned by an MLP pair scorer on
synthetic pairs (lyrics similarity, audio similarity, editorial bridges).
No real users or listening data — see ml/train_ncf.py."""
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
    from app.engines.utils import resolve_seed_indices
    seed_indices = resolve_seed_indices(song_names, _index)
    if not seed_indices: return []

    # Cosine similarity — raw dot products let large-norm embeddings dominate,
    # and a per-query min-max rescale pinned the top result to ~100% always.
    seed = np.mean(_embeddings[seed_indices], axis=0, keepdims=True)
    norms = np.linalg.norm(_embeddings, axis=1, keepdims=True)
    norms[norms == 0] = 1
    normalized = _embeddings / norms
    seed_norm = seed / max(np.linalg.norm(seed), 1e-8)
    sims = (normalized @ seed_norm.T).flatten()

    dim = _embeddings.shape[1]
    # Collect top Taylor AND top cross-artist separately to guarantee diversity
    taylor_results = []
    cross_results = []
    seen = set()
    for idx in np.argsort(-sims):
        if idx in seed_indices: continue
        e = _index[idx]
        dedup_key = (e['name'].lower(), e.get('artist', 'Taylor Swift').lower())
        if dedup_key in seen: continue
        seen.add(dedup_key)
        entry = {
            'name': e['name'], 'artist': e.get('artist', 'Taylor Swift'),
            'similarity': round(float(sims[idx]), 4),
            'recommendation_type': 'ncf',
            'explanation': f"NCF-style pair model: cosine {round(float(sims[idx]), 2)} ({dim}-dim embedding from lyrics + audio + bridge signals; synthetic pairs, no real listener data)",
        }
        if e.get('artist', 'Taylor Swift') == 'Taylor Swift':
            if len(taylor_results) < limit: taylor_results.append(entry)
        else:
            if len(cross_results) < limit: cross_results.append(entry)
        if len(taylor_results) >= limit and len(cross_results) >= limit: break

    from app.engines.utils import interleave_results, diversify_results, filter_seed_variants
    combined = filter_seed_variants(taylor_results + cross_results, song_names)
    diversified = diversify_results(combined, temperature=0.25)
    return interleave_results(diversified, limit)
