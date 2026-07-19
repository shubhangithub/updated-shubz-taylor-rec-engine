"""Incremental-embedding helpers.

The weekly pipeline only ADDS songs, so re-encoding the whole ~1,000-song
corpus every run is wasteful (and blew past the CI job timeout). These helpers
reuse existing embeddings by (name, artist) key and encode only the new songs,
so a weekly run does O(new songs) work instead of O(corpus).

Force a full recompute by deleting the target .npy first (e.g. after changing
the embedding model).
"""
import json
import os

import numpy as np


def _key(entry):
    if isinstance(entry, dict):
        return (entry.get('name', '').lower(), entry.get('artist', 'Taylor Swift').lower())
    return (str(entry).lower(), 'taylor swift')


def load_embedding_cache(npy_path, index_path, expected_dim):
    """Return {(name, artist): vector} from an existing embeddings/index pair.

    Empty if the files are missing or the stored dim doesn't match expected_dim
    (which forces a full recompute — the right thing when the model changed).
    """
    if not (os.path.exists(npy_path) and os.path.exists(index_path)):
        return {}
    emb = np.load(npy_path)
    if emb.ndim != 2 or emb.shape[1] != expected_dim:
        return {}
    with open(index_path) as f:
        idx = json.load(f)
    if len(idx) != emb.shape[0]:
        return {}
    return {_key(e): emb[i] for i, e in enumerate(idx)}


def assemble_incremental(songs, cache, encode_new, dim):
    """Build the full embedding matrix in `songs` order, reusing cached rows.

    songs: list of dicts each with at least 'name' and 'artist'.
    cache: {(name, artist): vector} from load_embedding_cache.
    encode_new: fn(list_of_songs) -> np.ndarray (len x dim) for the new songs.
    Returns (matrix float32 [len(songs) x dim], n_new).
    """
    keys = [_key(s) for s in songs]
    new_positions = [i for i, k in enumerate(keys) if k not in cache]
    if new_positions:
        new_vecs = np.asarray(encode_new([songs[i] for i in new_positions]), dtype=np.float32)
    else:
        new_vecs = np.zeros((0, dim), dtype=np.float32)

    out = np.zeros((len(songs), dim), dtype=np.float32)
    n = 0
    for i, k in enumerate(keys):
        if k in cache:
            out[i] = cache[k]
        else:
            out[i] = new_vecs[n]
            n += 1
    return out, len(new_positions)
