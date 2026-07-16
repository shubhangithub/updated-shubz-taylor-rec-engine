"""
Engine 7: Modern instruction-aware lyrics embeddings via Qwen3-Embedding-0.6B.
Encodes the same 801-song corpus as Engine 1, but with a 2025-era 0.6B
embedding model (32K context — full lyrics, no truncation) instead of the
2019-era all-MiniLM-L6-v2 (which truncates at 256 wordpieces).

Paper: Zhang et al. (2025) "Qwen3 Embedding: Advancing Text Embedding and
Reranking Through Foundation Models", arXiv:2506.05176. Apache 2.0.

Run once: cd backend && python -m ml.compute_qwen3_embeddings
"""
import json
import numpy as np
import os

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app')
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml_data')

MODEL_ID = 'Qwen/Qwen3-Embedding-0.6B'


def main():
    import torch
    from sentence_transformers import SentenceTransformer

    # Load Taylor songs
    with open(os.path.join(DATA_DIR, 'taylor_complete.json'), 'r') as f:
        taylor_songs = json.load(f)

    all_songs = []
    for s in taylor_songs:
        if s.get('lyrics') and len(s['lyrics']) > 50:
            all_songs.append({
                'name': s.get('name', ''),
                'artist': 'Taylor Swift',
                'lyrics': s['lyrics'],  # full lyrics — 32K context, no truncation
            })

    print(f"Taylor songs with lyrics: {len(all_songs)}")

    # Load cross-artist lyrics if available
    cross_path = os.path.join(OUT_DIR, 'cross_artist_lyrics.json')
    if os.path.exists(cross_path):
        with open(cross_path, 'r') as f:
            cross_songs = json.load(f)
        for s in cross_songs:
            if s.get('lyrics') and len(s['lyrics']) > 50:
                all_songs.append({
                    'name': s.get('name', ''),
                    'artist': s.get('artist', ''),
                    'lyrics': s['lyrics'],
                })
        print(f"Cross-artist songs: {len(cross_songs)}")
    else:
        print("No cross-artist lyrics found. Run: python -m ml.scrape_artist_lyrics")

    print(f"Total songs to encode: {len(all_songs)}")

    device = 'mps' if torch.backends.mps.is_available() else 'cpu'
    print(f"Encoding on {device} with {MODEL_ID}...")
    model = SentenceTransformer(MODEL_ID, device=device)

    # Song-to-song similarity is symmetric document matching, so plain
    # encode() (no instruction prompt) is used for all texts.
    lyrics_texts = [s['lyrics'] for s in all_songs]
    embeddings = model.encode(lyrics_texts, show_progress_bar=True, batch_size=8)

    # Save
    os.makedirs(OUT_DIR, exist_ok=True)
    np.save(os.path.join(OUT_DIR, 'qwen3_embeddings.npy'), embeddings.astype(np.float32))

    index = [{'name': s['name'], 'artist': s['artist']} for s in all_songs]
    with open(os.path.join(OUT_DIR, 'qwen3_index.json'), 'w') as f:
        json.dump(index, f)

    print(f"Saved {embeddings.shape} embeddings to ml_data/")
    print(f"  Taylor songs: {sum(1 for s in index if s['artist'] == 'Taylor Swift')}")
    print(f"  Cross-artist: {sum(1 for s in index if s['artist'] != 'Taylor Swift')}")


if __name__ == '__main__':
    main()
