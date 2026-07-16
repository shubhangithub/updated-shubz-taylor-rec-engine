"""
Pipeline: Expand cross-artist pool.
Finds 3-5 new artists related to ones already in our corpus,
scrapes their top songs from Genius, appends to cross_artist_lyrics.json.

Run: cd backend && python -m ml.pipeline_expand_artists
Requires: GENIUS_ACCESS_TOKEN, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
"""
import json
import os
import time
import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ML_DATA = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml_data')
LYRICS_PATH = os.path.join(ML_DATA, 'cross_artist_lyrics.json')
MAX_NEW_ARTISTS = 5
SONGS_PER_ARTIST = 10


def get_related_artists_spotify(seed_artists: list, existing_artists: set) -> list:
    """Use Spotify API to find artists related to our existing pool."""
    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
    if not client_id or not client_secret:
        logger.warning("No Spotify credentials — using fallback artist discovery")
        return []

    import spotipy
    from spotipy.oauth2 import SpotifyClientCredentials

    try:
        sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(
            client_id=client_id, client_secret=client_secret
        ))

        candidates = set()
        # Sample a few existing artists and find their related artists
        import random
        sample = random.sample(seed_artists, min(5, len(seed_artists)))

        for artist_name in sample:
            try:
                results = sp.search(q=f"artist:{artist_name}", type="artist", limit=1)
                artists = results.get("artists", {}).get("items", [])
                if not artists:
                    continue
                artist_id = artists[0]["id"]
                related = sp.artist_related_artists(artist_id)
                for ra in related.get("artists", []):
                    name = ra["name"]
                    if name.lower() not in existing_artists and ra.get("popularity", 0) > 30:
                        candidates.add(name)
            except Exception as e:
                logger.warning(f"Spotify error for {artist_name}: {e}")
            time.sleep(0.3)

        return list(candidates)[:MAX_NEW_ARTISTS * 3]  # Return extras for filtering
    except Exception as e:
        logger.error(f"Spotify related artists failed: {e}")
        return []


def scrape_lyrics(artist_name: str, max_songs: int = SONGS_PER_ARTIST) -> list:
    """Scrape top songs for an artist from Genius."""
    token = os.getenv("GENIUS_ACCESS_TOKEN")
    if not token:
        logger.error("GENIUS_ACCESS_TOKEN not set")
        return []

    import lyricsgenius
    genius = lyricsgenius.Genius(token)
    genius.timeout = 15
    genius.retries = 3

    songs = []
    try:
        artist = genius.search_artist(artist_name, max_songs=max_songs, sort="popularity")
        if not artist:
            return []

        for song in artist.songs:
            lyrics = song.lyrics or ""
            if len(lyrics) < 50:
                continue
            # Clean lyrics
            lines = lyrics.split("\n")
            if lines and "Lyrics" in lines[0]:
                lines = lines[1:]
            clean = "\n".join(lines).strip()
            if clean.endswith("Embed"):
                clean = clean[:-5].strip()

            album = ""
            try:
                album = (song.album.name if hasattr(song.album, "name")
                         else (song.album.get("name", "") if isinstance(song.album, dict)
                               else str(song.album or "")))
            except:
                pass

            songs.append({
                "name": song.title,
                "artist": artist_name,
                "album": album,
                "lyrics": clean,
            })
    except Exception as e:
        logger.error(f"Genius scrape failed for {artist_name}: {e}")

    return songs


def main():
    # Load existing data
    if os.path.exists(LYRICS_PATH):
        with open(LYRICS_PATH) as f:
            existing = json.load(f)
    else:
        existing = []

    existing_artists = {s.get("artist", "").lower() for s in existing}
    existing_artist_list = list({s.get("artist", "") for s in existing})

    logger.info(f"Current corpus: {len(existing)} songs from {len(existing_artists)} artists")

    # Find new artists via Spotify
    candidates = get_related_artists_spotify(existing_artist_list, existing_artists)

    if not candidates:
        # Fallback: hardcoded list of artists that are commonly related to Taylor
        fallback = [
            "Conan Gray", "Maisie Peters", "Girl in Red", "Clairo",
            "Phoebe Ryan", "Lennon Stella", "Maren Morris", "Noah Kahan",
            "Reneé Rapp", "Chappell Roan", "Ethel Cain", "Soccer Mommy",
            "Snail Mail", "Alvvays", "Men I Trust", "Weyes Blood",
        ]
        candidates = [a for a in fallback if a.lower() not in existing_artists]

    # Pick up to MAX_NEW_ARTISTS
    import random
    random.shuffle(candidates)
    new_artists = candidates[:MAX_NEW_ARTISTS]

    if not new_artists:
        logger.info("No new artists to add — corpus is comprehensive")
        return

    logger.info(f"Scraping {len(new_artists)} new artists: {new_artists}")

    total_added = 0
    for artist_name in new_artists:
        logger.info(f"  Scraping {artist_name}...")
        songs = scrape_lyrics(artist_name)
        if songs:
            existing.extend(songs)
            total_added += len(songs)
            logger.info(f"    Added {len(songs)} songs")
        else:
            logger.info(f"    No songs found")
        time.sleep(1)

    # Save atomically: write to a temp file then os.replace, so a kill
    # mid-write (e.g. the workflow's job timeout) can't truncate the corpus.
    os.makedirs(ML_DATA, exist_ok=True)
    tmp_path = LYRICS_PATH + ".tmp"
    with open(tmp_path, "w") as f:
        json.dump(existing, f, ensure_ascii=False)
    os.replace(tmp_path, LYRICS_PATH)

    new_total_artists = len({s.get("artist", "").lower() for s in existing})
    logger.info(f"\nDone! Added {total_added} songs from {len(new_artists)} artists")
    logger.info(f"Corpus now: {len(existing)} songs from {new_total_artists} artists")


if __name__ == "__main__":
    main()
