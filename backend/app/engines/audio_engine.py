"""Runtime engine for CLAP audio similarity.
512-dim joint audio-text embeddings of 30s iTunes previews
(laion/larger_clap_music) — the only engine that hears the recording
instead of reading lyrics or metadata. Songs without a preview are
skipped; see ml/download_previews.py + ml/compute_audio_embeddings.py."""
import json, os, numpy as np
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)
ML_DATA = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'ml_data')
_embeddings = None
_index = None
_mood_vecs = None
_moods: Optional[List[str]] = None

def _load():
    global _embeddings, _index
    if _embeddings is not None: return
    emb_path = os.path.join(ML_DATA, 'audio_embeddings.npy')
    idx_path = os.path.join(ML_DATA, 'audio_index.json')
    if not os.path.exists(emb_path) or not os.path.exists(idx_path):
        logger.warning("Audio embeddings not found. Run: cd backend && python -m ml.download_previews && python -m ml.compute_audio_embeddings")
        _embeddings = np.array([]); _index = []; return
    _embeddings = np.load(emb_path)
    with open(idx_path) as f:
        _index = json.load(f)
    logger.info(f"Loaded CLAP audio embeddings: {_embeddings.shape}")

def _load_moods():
    global _mood_vecs, _moods
    if _mood_vecs is not None: return
    vec_path = os.path.join(ML_DATA, 'mood_text_embeddings.npy')
    phr_path = os.path.join(ML_DATA, 'mood_phrases.json')
    if not os.path.exists(vec_path) or not os.path.exists(phr_path):
        _mood_vecs = np.array([]); _moods = []; return
    vecs = np.load(vec_path)
    # Mean-center across moods to cancel CLAP's audio-text modality gap: raw
    # audio-text cosines are dominated by the shared "this is text" direction,
    # so every mood ranks songs almost identically. Centering leaves each mood's
    # DEVIATION from the average prompt, which is what actually discriminates.
    vecs = vecs - vecs.mean(axis=0, keepdims=True)
    vecs = vecs / np.clip(np.linalg.norm(vecs, axis=1, keepdims=True), 1e-8, None)
    _mood_vecs = vecs
    with open(phr_path) as f:
        _moods = json.load(f)['moods']

def recommend(song_names: List[str], limit: int = 10, **kwargs) -> List[Dict]:
    _load()
    if _embeddings is None or len(_embeddings) == 0: return []
    from app.engines.utils import resolve_seed_indices
    seed_indices = [i for i in resolve_seed_indices(song_names, _index)
                    if _embeddings[i].any()]  # seeds need audio
    if not seed_indices: return []

    seed = np.mean(_embeddings[seed_indices], axis=0, keepdims=True)
    seed_norm = seed / max(np.linalg.norm(seed), 1e-8)
    sims = (_embeddings @ seed_norm.T).flatten()  # rows are already unit-norm

    results = []
    seen = set()
    for idx in np.argsort(-sims):
        if idx in seed_indices: continue
        e = _index[idx]
        if not e.get('has_audio', bool(_embeddings[idx].any())): continue
        dedup_key = (e['name'].lower(), e.get('artist', 'Taylor Swift').lower())
        if dedup_key in seen: continue
        seen.add(dedup_key)
        results.append({
            'name': e['name'], 'artist': e.get('artist', 'Taylor Swift'),
            'similarity': round(float(sims[idx]), 4),
            'recommendation_type': 'clap_audio',
            'explanation': f"Sounds similar: CLAP audio cosine {round(float(sims[idx]), 2)} (512-dim joint audio-text embedding of the 30s preview)",
        })
        if len(results) >= limit * 3: break

    from app.engines.utils import interleave_results, diversify_results, filter_seed_variants
    results = filter_seed_variants(results, song_names)
    diversified = diversify_results(results, temperature=0.25)
    return interleave_results(diversified, limit)

def mood_search(mood: str, limit: int = 12) -> List[Dict]:
    """Rank songs by how much their AUDIO sounds like a mood's text prompt
    (CLAP joint space — zero model inference at runtime)."""
    _load(); _load_moods()
    if _embeddings is None or len(_embeddings) == 0 or not _moods: return []
    mood = mood.lower()
    if mood not in _moods: return []
    vec = _mood_vecs[_moods.index(mood)]
    sims = _embeddings @ vec  # unit-norm rows; zero rows score 0

    results = []
    seen = set()
    for idx in np.argsort(-sims):
        e = _index[idx]
        if not e.get('has_audio', bool(_embeddings[idx].any())): continue
        dedup_key = (e['name'].lower(), e.get('artist', 'Taylor Swift').lower())
        if dedup_key in seen: continue
        seen.add(dedup_key)
        results.append({
            'name': e['name'], 'artist': e.get('artist', 'Taylor Swift'),
            'similarity': round(float(sims[idx]), 4),
            'recommendation_type': 'sound_mood',
            'explanation': f"Audio matches '{mood}' at CLAP cosine {round(float(sims[idx]), 2)}",
        })
        if len(results) >= limit: break
    return results

def available_moods() -> List[str]:
    _load_moods()
    return list(_moods or [])
