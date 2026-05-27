"""Runtime engine for VAE latent space similarity.
Now trained on 384-dim BERT lyrics embeddings → 16-dim latent (24:1 compression)."""
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
    name_map = {e['name'].lower(): i for i, e in enumerate(_index)}
    seed_indices = [name_map[n.lower()] for n in song_names if n.lower() in name_map]
    if not seed_indices: return []

    seed = np.mean(_latents[seed_indices], axis=0, keepdims=True)
    distances = np.linalg.norm(_latents - seed, axis=1)
    max_d = max(distances.max(), 1e-8)
    sims = 1 - (distances / max_d)

    results = []
    for idx in np.argsort(distances):
        if idx in seed_indices: continue
        e = _index[idx]
        results.append({
            'name': e['name'], 'artist': e.get('artist', 'Taylor Swift'),
            'similarity': round(float(sims[idx]), 4),
            'recommendation_type': 'vae_latent',
            'explanation': f"VAE latent distance: {round(float(distances[idx]), 3)} in 16-dim compressed space (384→16, 24:1 compression)",
        })
        if len(results) >= limit * 3: break

    from app.engines.utils import interleave_results, diversify_results
    diversified = diversify_results(results, temperature=0.25)
    return interleave_results(diversified, limit)
