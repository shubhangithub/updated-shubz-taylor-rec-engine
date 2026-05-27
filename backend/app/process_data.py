"""
Process downloaded CSV data into clean JSON for the app.
Run this once to generate the combined dataset.
"""

import csv
import json
import os
import re

DATA_DIR = os.path.dirname(__file__)


def load_spotify_features():
    """Load the comprehensive Spotify features CSV (358 songs including TTPD)."""
    features = {}
    path = os.path.join(DATA_DIR, "taylor_spotify_full.csv")
    if not os.path.exists(path):
        return features

    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            album = (row.get("album_name") or "").strip()
            name = (row.get("track_name") or "").strip()
            if not name or not album:
                continue
            # Skip non-Taylor albums (featured songs at the end)
            if album == "NA":
                continue

            key = name.lower()
            features[key] = {
                "name": name,
                "album": album,
                "artist": (row.get("artist") or "Taylor Swift").strip(),
                "featuring": row.get("featuring", "").strip(),
                "danceability": safe_float(row.get("danceability")),
                "energy": safe_float(row.get("energy")),
                "key": safe_int(row.get("key")),
                "loudness": safe_float(row.get("loudness")),
                "mode": safe_int(row.get("mode")),
                "speechiness": safe_float(row.get("speechiness")),
                "acousticness": safe_float(row.get("acousticness")),
                "instrumentalness": safe_float(row.get("instrumentalness")),
                "liveness": safe_float(row.get("liveness")),
                "valence": safe_float(row.get("valence")),
                "tempo": safe_float(row.get("tempo")),
                "duration_ms": safe_int(row.get("duration_ms")),
                "key_name": row.get("key_name", ""),
                "mode_name": row.get("mode_name", ""),
                "key_mode": row.get("key_mode", ""),
                "explicit": row.get("explicit", "FALSE") == "TRUE",
            }
    return features


def load_lyrics():
    """Load full lyrics from the songs CSV (Title,Album,Lyrics multiline)."""
    lyrics = {}
    path = os.path.join(DATA_DIR, "taylor_songs_raw.csv")
    if not os.path.exists(path):
        return lyrics

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Parse the CSV which has multiline lyrics fields
    # Format: Title,Album,"lyrics\nline2\nline3..."
    reader = csv.reader(content.splitlines())
    header = next(reader, None)
    if not header:
        return lyrics

    current_title = None
    current_album = None
    current_lyrics = []

    for row in reader:
        if len(row) >= 3:
            # New song entry
            if current_title and current_lyrics:
                lyrics[current_title.lower()] = {
                    "title": current_title,
                    "album": current_album,
                    "lyrics": "\n".join(current_lyrics),
                }
            current_title = row[0].strip()
            current_album = row[1].strip()
            current_lyrics = [row[2]] if row[2] else []
        elif len(row) == 1 and current_title:
            current_lyrics.append(row[0])
        elif len(row) == 0 and current_title:
            current_lyrics.append("")

    # Don't forget the last song
    if current_title and current_lyrics:
        lyrics[current_title.lower()] = {
            "title": current_title,
            "album": current_album,
            "lyrics": "\n".join(current_lyrics),
        }

    return lyrics


def load_line_lyrics():
    """Load line-by-line lyrics from lyrics.csv."""
    lines = {}
    path = os.path.join(DATA_DIR, "taylor_lyrics_raw.csv")
    if not os.path.exists(path):
        return lines

    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            song = (row.get("Song") or "").strip().lower()
            lyric = (row.get("Lyric") or "").strip()
            if not song or not lyric:
                continue
            if song not in lines:
                lines[song] = []
            lines[song].append(lyric)

    return lines


def safe_float(val):
    try:
        return float(val) if val and val != "NA" else 0.0
    except (ValueError, TypeError):
        return 0.0


def safe_int(val):
    try:
        return int(float(val)) if val and val != "NA" else 0
    except (ValueError, TypeError):
        return 0


def build_combined_dataset():
    """Combine all data sources into a single comprehensive dataset."""
    print("Loading Spotify features...")
    features = load_spotify_features()
    print(f"  Loaded {len(features)} songs with audio features")

    print("Loading full lyrics...")
    full_lyrics = load_lyrics()
    print(f"  Loaded {len(full_lyrics)} songs with full lyrics")

    print("Loading line-by-line lyrics...")
    line_lyrics = load_line_lyrics()
    print(f"  Loaded {len(line_lyrics)} songs with line lyrics")

    # Combine: features as base, merge in lyrics
    combined = {}
    for key, feat in features.items():
        song = {**feat}
        # Add full lyrics
        if key in full_lyrics:
            song["lyrics"] = full_lyrics[key]["lyrics"]
        elif key in line_lyrics:
            song["lyrics"] = "\n".join(line_lyrics[key])
        else:
            # Try fuzzy match
            for lk in full_lyrics:
                if key in lk or lk in key:
                    song["lyrics"] = full_lyrics[lk]["lyrics"]
                    break

        combined[key] = song

    # Also add songs that have lyrics but no features
    for key, lyr in full_lyrics.items():
        if key not in combined:
            combined[key] = {
                "name": lyr["title"],
                "album": lyr["album"],
                "artist": "Taylor Swift",
                "lyrics": lyr["lyrics"],
            }

    print(f"\nCombined dataset: {len(combined)} songs")
    songs_with_features = sum(1 for s in combined.values() if s.get("danceability"))
    songs_with_lyrics = sum(1 for s in combined.values() if s.get("lyrics"))
    print(f"  With audio features: {songs_with_features}")
    print(f"  With lyrics: {songs_with_lyrics}")

    # Save as JSON
    output_path = os.path.join(DATA_DIR, "taylor_complete.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(list(combined.values()), f, indent=2, ensure_ascii=False)
    print(f"\nSaved to {output_path}")

    return combined


if __name__ == "__main__":
    build_combined_dataset()
