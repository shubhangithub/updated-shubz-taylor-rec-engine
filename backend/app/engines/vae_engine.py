"""Runtime engine for VAE latent space similarity.
Trained on 384-dim MiniLM lyrics embeddings (z-scored) -> 16-dim latent
(24:1 compression) with a beta=0.1 VAE; see ml/train_vae.py."""
import json, os, numpy as np
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)
ML_DATA = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'ml_data')
_latents = None
_index = None

def _load():
    global _latents, _index
    if _latents is not None: return
    lat_path = os.path.join(ML_DATA, 'vae_latents.npy')
    idx_path = os.path.join(ML_DATA, 'vae_index.json')
    if not os.path.exists(lat_path):
        _latents = np.array([]); _index = []; return
    _latents = np.load(lat_path)
    with open(idx_path) as f: raw = json.load(f)
    _index = [e if isinstance(e, dict) else {'name': e, 'artist': 'Taylor Swift'} for e in raw]
    logger.info(f"Loaded VAE latents: {_latents.shape}")

def recommend(song_names: List[str], limit: int = 10, **kwargs) -> List[Dict]:
    _load()
    if _latents is None or len(_latents) == 0: return []
    from app.engines.utils import resolve_seed_indices
    seed_indices = resolve_seed_indices(song_names, _index)
    if not seed_indices: return []

    seed = np.mean(_latents[seed_indices], axis=0, keepdims=True)
    distances = np.linalg.norm(_latents - seed, axis=1)
    # Scale-free transform: comparable across queries, unlike normalizing by
    # the farthest song (which pinned the farthest to 0 per query).
    sims = 1.0 / (1.0 + distances)

    dim = _latents.shape[1]
    results = []
    seen = set()
    for idx in np.argsort(distances):
        if idx in seed_indices: continue
        e = _index[idx]
        dedup_key = (e['name'].lower(), e.get('artist', 'Taylor Swift').lower())
        if dedup_key in seen: continue
        seen.add(dedup_key)
        results.append({
            'name': e['name'], 'artist': e.get('artist', 'Taylor Swift'),
            'similarity': round(float(sims[idx]), 4),
            'recommendation_type': 'vae_latent',
            'explanation': f"VAE latent distance: {round(float(distances[idx]), 3)} in {dim}-dim compressed lyrics space (384→{dim})",
        })
        if len(results) >= limit * 3: break

    from app.engines.utils import interleave_results, diversify_results
    diversified = diversify_results(results, temperature=0.25)
    return interleave_results(diversified, limit)
