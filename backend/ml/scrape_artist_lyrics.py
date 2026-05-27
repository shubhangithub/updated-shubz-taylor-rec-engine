"""
Scrape lyrics for all cross-artist recommendation targets from Genius.
This gives us lyrics for Phoebe Bridgers, Bon Iver, James Blake, Lorde, etc.
so the Transformer Lyrics engine can find semantic matches ACROSS artists.

Requires: GENIUS_ACCESS_TOKEN env var (free at https://genius.com/api-clients)

Run: python -m ml.scrape_artist_lyrics
"""
import json
import os
import time
import sys

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app')
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml_data')

# All artists referenced in editorial bridges + era artists
TARGET_ARTISTS = [
    "Phoebe Bridgers", "Bon Iver", "James Blake", "Lorde",
    "Frank Ocean", "Lana Del Rey", "Olivia Rodrigo", "SZA",
    "Hozier", "Florence + The Machine", "Billie Eilish",
    "Carly Rae Jepsen", "Charli XCX", "The National",
    "Big Thief", "Sufjan Stevens", "Adele", "Radiohead",
    "Maggie Rogers", "Kacey Musgraves", "Mitski", "Fiona Apple",
    "Kate Bush", "Paramore", "Gracie Abrams", "boygenius",
    "Lucy Dacus", "Julien Baker", "Japanese Breakfast",
    "Beach House", "The Weeknd", "Harry Styles", "Robyn",
    "Tame Impala", "The 1975", "Bleachers", "HAIM",
    "Arctic Monkeys", "Amy Winehouse", "Fleetwood Mac",
    "Mazzy Star", "The Cranberries", "CHVRCHES",
    "Sabrina Carpenter", "Imogen Heap", "Vampire Weekend",
]

MAX_SONGS_PER_ARTIST = 15  # Top songs only — keeps dataset manageable


def main():
    token = os.environ.get("GENIUS_ACCESS_TOKEN")
    if not token:
        print("ERROR: Set GENIUS_ACCESS_TOKEN env var first.")
        print("Get a free token at: https://genius.com/api-clients")
        print("Then run: GENIUS_ACCESS_TOKEN=your_token python -m ml.scrape_artist_lyrics")
        sys.exit(1)

    import lyricsgenius
    genius = lyricsgenius.Genius(token)
    genius.timeout = 15
    genius.retries = 3

    # Load existing data if any
    out_path = os.path.join(OUT_DIR, "cross_artist_lyrics.json")
    if os.path.exists(out_path):
        with open(out_path, "r") as f:
            existing = json.load(f)
        print(f"Loaded {len(existing)} existing songs")
    else:
        existing = []

    existing_keys = {f"{s['artist']}|||{s['name']}".lower() for s in existing}
    all_songs = list(existing)

    for i, artist_name in enumerate(TARGET_ARTISTS):
        print(f"\n[{i+1}/{len(TARGET_ARTISTS)}] {artist_name}...")

        # Skip if we already have enough songs for this artist
        artist_count = sum(1 for s in all_songs if s.get("artist", "").lower() == artist_name.lower())
        if artist_count >= MAX_SONGS_PER_ARTIST:
            print(f"  Already have {artist_count} songs, skipping")
            continue

        try:
            artist = genius.search_artist(artist_name, max_songs=MAX_SONGS_PER_ARTIST, sort="popularity")
            if not artist:
                print(f"  Artist not found")
                continue

            for song in artist.songs:
                key = f"{artist_name}|||{song.title}".lower()
                if key in existing_keys:
                    continue

                lyrics = song.lyrics
                if not lyrics or len(lyrics) < 50:
                    continue

                # Clean lyrics — remove the "XYZ Lyrics" header and "Embed" footer
                lines = lyrics.split("\n")
                if lines and "Lyrics" in lines[0]:
                    lines = lines[1:]
                lyrics = "\n".join(lines).strip()
                if lyrics.endswith("Embed"):
                    lyrics = lyrics[:-5].strip()
                if lyrics.endswith(str(song.stats.pageviews) if hasattr(song.stats, 'pageviews') else ""):
                    pass  # Can't reliably strip this

                all_songs.append({
                    "name": song.title,
                    "artist": artist_name,
                    "album": song.album.name if song.album else "",
                    "lyrics": lyrics,
                })
                existing_keys.add(key)

            print(f"  Got {sum(1 for s in all_songs if s['artist'] == artist_name)} songs")

        except Exception as e:
            print(f"  Error: {e}")

        # Save after each artist (resume-safe)
        os.makedirs(OUT_DIR, exist_ok=True)
        with open(out_path, "w") as f:
            json.dump(all_songs, f, indent=2, ensure_ascii=False)

        # Rate limit
        time.sleep(1)

    print(f"\nDone! Total: {len(all_songs)} songs across {len(set(s['artist'] for s in all_songs))} artists")
    print(f"Saved to {out_path}")


if __name__ == "__main__":
    main()
