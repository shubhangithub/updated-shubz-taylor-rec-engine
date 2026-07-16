"""Runtime engine for transformer-based lyrics similarity.
Handles both Taylor-only and cross-artist indices."""
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
    emb_path = os.path.join(ML_DATA, 'lyrics_embeddings.npy')
    idx_path = os.path.join(ML_DATA, 'lyrics_index.json')
    if not os.path.exists(emb_path) or not os.path.exists(idx_path):
        logger.warning("Lyrics embeddings not found. Run: cd backend && python -m ml.compute_lyrics_embeddings")
        _embeddings = np.array([])
        _index = []
        return
    _embeddings = np.load(emb_path)
    with open(idx_path) as f:
        raw_index = json.load(f)

    # Handle both old format (list of strings) and new format (list of {name, artist} dicts)
    if raw_index and isinstance(raw_index[0], str):
        _index = [{'name': n, 'artist': 'Taylor Swift'} for n in raw_index]
    else:
        _index = raw_index

    logger.info(f"Loaded lyrics embeddings: {_embeddings.shape}, {len(_index)} songs")


def recommend(song_names: List[str], limit: int = 10, **kwargs) -> List[Dict]:
    _load()
    if _embeddings is None or len(_embeddings) == 0 or not _index:
        return []

    from app.engines.utils import resolve_seed_indices
    seed_indices = resolve_seed_indices(song_names, _index)
    if not seed_indices:
        return []

    # Average seed embeddings
    seed_emb = np.mean(_embeddings[seed_indices], axis=0, keepdims=True)

    # Cosine similarity
    norms = np.linalg.norm(_embeddings, axis=1, keepdims=True)
    norms[norms == 0] = 1
    normalized = _embeddings / norms
    seed_norm = seed_emb / max(np.linalg.norm(seed_emb), 1e-8)

    sims = (normalized @ seed_norm.T).flatten()

    # Rank, excluding seeds. Prioritize cross-artist results if available.
    ranked = np.argsort(-sims)
    results = []
    seen_names = set()

    for idx in ranked:
        if idx in seed_indices:
            continue
        entry = _index[idx]
        # Deduplicate by (name, artist) — same-titled songs by different artists are distinct
        dedup_key = (entry['name'].lower(), entry.get('artist', 'Taylor Swift').lower())
        if dedup_key in seen_names:
            continue
        seen_names.add(dedup_key)

        results.append({
            'name': entry['name'],
            'artist': entry.get('artist', 'Taylor Swift'),
            'similarity': round(float(sims[idx]), 4),
            'recommendation_type': 'lyrics_transformer',
            'explanation': f"Semantic lyrics similarity: cosine {round(float(sims[idx]), 2)} ({_embeddings.shape[1]}-dim MiniLM sentence embedding)",
        })
        if len(results) >= limit * 3:  # Collect extra for interleaving
            break

    from app.engines.utils import interleave_results, diversify_results, filter_seed_variants
    results = filter_seed_variants(results, song_names)
    diversified = diversify_results(results, temperature=0.25)
    return interleave_results(diversified, limit)
