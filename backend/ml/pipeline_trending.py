"""
Pipeline: Track trending Taylor Swift songs via iTunes Search API.
Stores weekly snapshots of popularity/ranking data.
No API key needed — iTunes is free and public.

Run: cd backend && python -m ml.pipeline_trending
"""
import json
import os
import requests
from datetime import datetime, timezone
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ML_DATA = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml_data')
TRENDING_PATH = os.path.join(ML_DATA, 'trending_history.json')


def fetch_itunes_trending():
    """Fetch Taylor Swift's top tracks from iTunes Search API."""
    try:
        resp = requests.get(
            "https://itunes.apple.com/search",
            params={
                "term": "Taylor Swift",
                "media": "music",
                "entity": "song",
                "limit": 50,
                "sort": "recent",
            },
            timeout=15,
        )
        if resp.status_code != 200:
            logger.error(f"iTunes API returned {resp.status_code}")
            return []

        data = resp.json()
        songs = []
        for result in data.get("results", []):
            if "taylor swift" not in result.get("artistName", "").lower():
                continue
            songs.append({
                "name": result.get("trackName", ""),
                "album": result.get("collectionName", ""),
                "track_id": result.get("trackId"),
                "preview_url": result.get("previewUrl", ""),
                "artwork_url": result.get("artworkUrl100", ""),
                "release_date": result.get("releaseDate", ""),
                "track_price": result.get("trackPrice"),
                "track_number": result.get("trackNumber"),
                "genre": result.get("primaryGenreName", ""),
            })

        logger.info(f"Fetched {len(songs)} Taylor Swift tracks from iTunes")
        return songs

    except Exception as e:
        logger.error(f"iTunes fetch failed: {e}")
        return []


def main():
    # Load existing history
    if os.path.exists(TRENDING_PATH):
        with open(TRENDING_PATH) as f:
            history = json.load(f)
    else:
        history = {"snapshots": [], "metadata": {"first_run": None, "total_snapshots": 0}}

    # Fetch current data
    songs = fetch_itunes_trending()
    if not songs:
        logger.warning("No songs fetched — skipping snapshot")
        return

    # Create snapshot
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    snapshot = {
        "date": now,
        "song_count": len(songs),
        "songs": songs,
    }

    # Compute changes from last snapshot
    if history["snapshots"]:
        last = history["snapshots"][-1]
        last_names = {s["name"] for s in last.get("songs", [])}
        current_names = {s["name"] for s in songs}
        new_entries = current_names - last_names
        dropped = last_names - current_names

        snapshot["changes"] = {
            "new_entries": list(new_entries)[:10],
            "dropped": list(dropped)[:10],
            "new_count": len(new_entries),
            "dropped_count": len(dropped),
        }
        logger.info(f"Changes: +{len(new_entries)} new, -{len(dropped)} dropped")

    # Append snapshot
    history["snapshots"].append(snapshot)
    if not history["metadata"]["first_run"]:
        history["metadata"]["first_run"] = now
    history["metadata"]["total_snapshots"] = len(history["snapshots"])
    history["metadata"]["last_run"] = now

    # Keep last 52 snapshots (1 year of weekly data)
    if len(history["snapshots"]) > 52:
        history["snapshots"] = history["snapshots"][-52:]

    # Save
    os.makedirs(ML_DATA, exist_ok=True)
    with open(TRENDING_PATH, "w") as f:
        json.dump(history, f, indent=2, ensure_ascii=False)

    logger.info(f"Saved snapshot #{history['metadata']['total_snapshots']} ({now})")
    logger.info(f"Total history: {len(history['snapshots'])} snapshots")


if __name__ == "__main__":
    main()
