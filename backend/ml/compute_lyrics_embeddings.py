"""
Engine 1: Transformer Semantic Lyrics Embeddings
Uses sentence-transformers all-MiniLM-L6-v2 to encode lyrics into 384-dim vectors.
Encodes BOTH Taylor Swift songs AND cross-artist songs for cross-artist semantic matching.

Run once: python -m ml.compute_lyrics_embeddings
"""
import json
import numpy as np
import os

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app')
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml_data')


def main():
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
                'lyrics': s['lyrics'][:2000],
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
                    'lyrics': s['lyrics'][:2000],
                })
        print(f"Cross-artist songs: {len(cross_songs)}")
    else:
        print("No cross-artist lyrics found. Run: python -m ml.scrape_artist_lyrics")

    print(f"Total songs to encode: {len(all_songs)}")

    # Encode lyrics
    model = SentenceTransformer('all-MiniLM-L6-v2')
    lyrics_texts = [s['lyrics'] for s in all_songs]
    embeddings = model.encode(lyrics_texts, show_progress_bar=True, batch_size=32)

    # Save
    os.makedirs(OUT_DIR, exist_ok=True)
    np.save(os.path.join(OUT_DIR, 'lyrics_embeddings.npy'), embeddings.astype(np.float32))

    index = [{'name': s['name'], 'artist': s['artist']} for s in all_songs]
    with open(os.path.join(OUT_DIR, 'lyrics_index.json'), 'w') as f:
        json.dump(index, f)

    print(f"Saved {embeddings.shape} embeddings to ml_data/")
    print(f"  Taylor songs: {sum(1 for s in index if s['artist'] == 'Taylor Swift')}")
    print(f"  Cross-artist: {sum(1 for s in index if s['artist'] != 'Taylor Swift')}")


if __name__ == '__main__':
    main()
