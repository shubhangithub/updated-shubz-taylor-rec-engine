"""
The Shubz-Taylor Recommendation Engine API — A Taylor Swift-centric music recommendation engine.
"""

import logging
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.models import (
    SongSearchRequest,
    RecommendationRequest,
    MoodRequest,
    CrossArtistRequest,
    CompareRequest,
)
from app.spotify_client import spotify_client, get_itunes_preview
from app.recommender import recommender, get_csv_features, get_song_lyrics, get_full_song_data
from app.editorial import (
    get_editorial_recommendations,
    get_era_artists,
    get_mood_songs,
)
from app.taylor_data import TAYLOR_CATALOG, ERA_THEMES

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="The Shubz-Taylor Recommendation Engine",
    description="A Taylor Swift-centric music recommendation engine with cross-artist bridges",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "name": "The Shubz-Taylor Recommendation Engine",
        "version": "1.0.0",
        "description": "Taylor Swift-centric music recommendation engine",
        "endpoints": {
            "health": "/health",
            "search": "/api/search",
            "recommend": "/api/recommend",
            "cross_artist": "/api/cross-artist",
            "mood": "/api/mood",
            "artist": "/api/artist/{artist_name}",
            "song": "/api/song/{song_id}",
            "catalog": "/api/catalog",
            "eras": "/api/eras",
            "era": "/api/era/{era_name}",
            "editorial": "/api/editorial/{song_name}",
            "mood_songs": "/api/mood-songs/{mood}",
            "compare": "/api/compare",
            "engine_stats": "/api/engine-stats",
        },
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "spotify_available": spotify_client.available,
        "catalog_size": len(TAYLOR_CATALOG),
        "eras_count": len(ERA_THEMES),
    }


@app.post("/api/search")
def search_songs(request: SongSearchRequest):
    try:
        results = spotify_client.search_songs(
            query=request.query, artist=request.artist
        )
        return {"results": results, "count": len(results)}
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/recommend")
def get_recommendations(request: RecommendationRequest):
    try:
        results = recommender.recommend(
            liked_songs=request.liked_songs,
            target_artist=request.target_artist,
            num_recommendations=request.num_recommendations,
            mood=request.mood,
        )
        return {"recommendations": results, "count": len(results)}
    except Exception as e:
        logger.error(f"Recommendation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/cross-artist")
def cross_artist_recommendations(request: CrossArtistRequest):
    try:
        results = recommender.cross_artist_recommend(
            song_id=request.song_id, limit=request.limit
        )
        return {"recommendations": results, "count": len(results)}
    except Exception as e:
        logger.error(f"Cross-artist recommendation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/mood")
def mood_recommendations(request: MoodRequest):
    try:
        results = recommender.mood_recommend(
            mood=request.mood, era=request.era, limit=request.limit
        )
        return {
            "mood": request.mood,
            "era": request.era,
            "recommendations": results,
            "count": len(results),
        }
    except Exception as e:
        logger.error(f"Mood recommendation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/artist/{artist_name}")
def get_artist(artist_name: str):
    try:
        info = spotify_client.get_artist_info(artist_name)
        if not info:
            raise HTTPException(
                status_code=404, detail=f"Artist '{artist_name}' not found"
            )
        return info
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Artist info error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/song/{song_id}")
def get_song(song_id: str):
    try:
        info = spotify_client.get_song_info(song_id)
        if not info:
            raise HTTPException(
                status_code=404, detail=f"Song '{song_id}' not found"
            )

        song_name = info.get("name", "")

        # Use dataset fallback if audio features are empty
        if not info.get("audio_features") or info["audio_features"] == {}:
            csv_features = get_csv_features(song_name)
            if csv_features:
                info["audio_features"] = csv_features

        # Add full song data from dataset (lyrics, key_mode, etc.)
        full_data = get_full_song_data(song_name)
        if full_data:
            if full_data.get("lyrics"):
                info["lyrics"] = full_data["lyrics"]
            if full_data.get("key_mode"):
                info["key_mode"] = full_data["key_mode"]
            if full_data.get("explicit") is not None:
                info["explicit"] = full_data["explicit"]
            if full_data.get("featuring"):
                info["featuring"] = full_data["featuring"]

        # Add atmosphere data if audio features are available
        if info.get("audio_features") and info["audio_features"] != {}:
            info["atmosphere"] = recommender.get_song_atmosphere(
                info["audio_features"]
            )

        # If no Spotify preview, try iTunes
        if not info.get("preview_url"):
            itunes_url = get_itunes_preview(info.get("name", ""), info.get("artist", "Taylor Swift"))
            if itunes_url:
                info["preview_url"] = itunes_url

        # Check for editorial bridges
        bridges = get_editorial_recommendations(song_name, limit=5)
        info["editorial_bridges"] = bridges

        return info
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Song info error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/catalog")
def get_catalog():
    return {
        "catalog": TAYLOR_CATALOG,
        "total_songs": len(TAYLOR_CATALOG),
        "eras": list(ERA_THEMES.keys()),
    }


@app.get("/api/eras")
def get_eras():
    return {"eras": ERA_THEMES}


@app.get("/api/era/{era_name}")
def get_era(era_name: str):
    # Look up era (case-insensitive)
    theme = None
    matched_name = None
    for key, value in ERA_THEMES.items():
        if key.lower() == era_name.lower():
            theme = value
            matched_name = key
            break

    if not theme:
        # Try substring match
        for key, value in ERA_THEMES.items():
            if era_name.lower() in key.lower() or key.lower() in era_name.lower():
                theme = value
                matched_name = key
                break

    if not theme:
        raise HTTPException(
            status_code=404, detail=f"Era '{era_name}' not found"
        )

    # Get songs for this era
    era_songs = [s for s in TAYLOR_CATALOG if s["era"] == matched_name]

    # Get recommended artists for this era
    artists = get_era_artists(matched_name)

    return {
        "era": matched_name,
        "theme": theme,
        "songs": era_songs,
        "song_count": len(era_songs),
        "artists": artists,
    }


@app.get("/api/era-artists-dynamic/{era_name}")
def get_era_artists_dynamic(era_name: str):
    """Compute era-connected artists dynamically via ML engines."""
    from app.engines import lyrics_transformer
    from app.taylor_data import TAYLOR_CATALOG

    # Find all Taylor songs in this era
    era_songs = [s["name"] for s in TAYLOR_CATALOG
                 if s.get("era", "").lower() == era_name.lower()
                 or s.get("album", "").lower() == era_name.lower()]

    if not era_songs:
        return {"era": era_name, "artists": [], "method": "dynamic"}

    # Run lyrics transformer for each song, collect cross-artist matches
    from collections import Counter
    artist_counts = Counter()
    artist_songs = {}  # artist → list of Taylor songs they matched with

    for song_name in era_songs[:10]:  # Cap at 10 songs for speed
        try:
            recs = lyrics_transformer.recommend([song_name], limit=10)
            for rec in recs:
                artist = rec.get('artist', '')
                if artist and artist != 'Taylor Swift':
                    artist_counts[artist] += 1
                    if artist not in artist_songs:
                        artist_songs[artist] = []
                    artist_songs[artist].append(song_name)
        except:
            continue

    # Top artists by frequency
    top_artists = []
    for artist, count in artist_counts.most_common(5):
        connected_songs = list(set(artist_songs.get(artist, [])))[:3]
        top_artists.append({
            "name": artist,
            "reason": f"Connected via {count} songs: {', '.join(connected_songs[:2])}",
            "connection_count": count,
        })

    return {"era": era_name, "artists": top_artists, "method": "dynamic", "songs_analyzed": len(era_songs)}


@app.get("/api/editorial/{song_name}")
def get_editorial(song_name: str):
    bridges = get_editorial_recommendations(song_name, limit=10)
    if not bridges:
        raise HTTPException(
            status_code=404,
            detail=f"No editorial bridges found for '{song_name}'",
        )
    return {
        "song": song_name,
        "bridges": bridges,
        "count": len(bridges),
    }


@app.get("/api/mood-songs/{mood}")
def get_mood_songs_endpoint(mood: str):
    songs = get_mood_songs(mood)
    if not songs:
        raise HTTPException(
            status_code=404,
            detail=f"No songs found for mood '{mood}'. Available moods: heartbreak, euphoria, melancholy, rage, nostalgia, romantic, empowerment, introspective",
        )
    return {
        "mood": mood,
        "songs": songs,
        "count": len(songs),
    }


@app.get("/api/lyrics/{song_name}")
def get_lyrics(song_name: str):
    lyrics = get_song_lyrics(song_name)
    if not lyrics:
        raise HTTPException(
            status_code=404,
            detail=f"No lyrics found for '{song_name}'",
        )
    return {
        "song": song_name,
        "lyrics": lyrics,
    }


@app.get("/api/song-data/{song_name}")
def get_song_data(song_name: str):
    """Get complete data for a Taylor Swift song (features + lyrics + metadata)."""
    data = get_full_song_data(song_name)
    if not data:
        raise HTTPException(
            status_code=404,
            detail=f"No data found for '{song_name}'",
        )

    # Add atmosphere if features are present
    if data.get("danceability"):
        data["atmosphere"] = recommender.get_song_atmosphere(data)

    # Add editorial bridges
    bridges = get_editorial_recommendations(data.get("name", song_name), limit=5)
    data["editorial_bridges"] = bridges

    # Add iTunes preview URL
    if not data.get("preview_url"):
        itunes_url = get_itunes_preview(data.get("name", song_name))
        if itunes_url:
            data["preview_url"] = itunes_url

    return data


@app.get("/api/all-song-features")
def get_all_song_features():
    """Return audio features for all songs in the dataset (for Observatory)."""
    from app.recommender import _TAYLOR_DATA

    songs = []
    for key, song in _TAYLOR_DATA.items():
        if song.get("danceability") is not None:
            songs.append({
                "name": song.get("name", key),
                "album": song.get("album", ""),
                "danceability": song.get("danceability", 0),
                "energy": song.get("energy", 0),
                "valence": song.get("valence", 0),
                "acousticness": song.get("acousticness", 0),
                "speechiness": song.get("speechiness", 0),
                "instrumentalness": song.get("instrumentalness", 0),
                "liveness": song.get("liveness", 0),
                "loudness": song.get("loudness", 0),
                "tempo": song.get("tempo", 0),
            })
    return {"songs": songs, "count": len(songs)}


@app.get("/api/era-features")
def get_era_features():
    """Compute real per-era average audio features from the dataset."""
    from app.recommender import _TAYLOR_DATA
    import numpy as np

    feature_keys = ["danceability", "energy", "valence", "acousticness",
                    "speechiness", "instrumentalness", "liveness", "tempo", "loudness"]

    # Group songs by album/era
    era_songs = {}
    for key, song in _TAYLOR_DATA.items():
        album = song.get("album", "Unknown")
        if not album or album == "Unknown":
            continue
        if not song.get("danceability"):  # Skip songs without features
            continue
        if album not in era_songs:
            era_songs[album] = []
        era_songs[album].append(song)

    # Compute averages
    result = {}
    for era, songs in era_songs.items():
        if len(songs) < 2:  # Need at least 2 songs for meaningful stats
            continue
        features = {}
        for feat in feature_keys:
            values = [float(s.get(feat, 0)) for s in songs if s.get(feat) is not None]
            if values:
                features[feat] = round(float(np.mean(values)), 4)
                features[f"{feat}_std"] = round(float(np.std(values)), 4)
                features[f"{feat}_min"] = round(float(np.min(values)), 4)
                features[f"{feat}_max"] = round(float(np.max(values)), 4)
        features["song_count"] = len(songs)
        result[era] = features

    return {"eras": result, "total_eras": len(result)}


@app.get("/api/insights")
def get_insights():
    """Return pre-computed data science insights."""
    import os, json as _json
    path = os.path.join(os.path.dirname(__file__), "..", "ml_data", "insights.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Insights not computed yet. Run: python -m app.compute_insights")
    with open(path) as f:
        return _json.load(f)


@app.get("/api/trending")
def get_trending():
    """Return trending Taylor Swift songs with week-over-week changes."""
    import os, json as _json
    path = os.path.join(os.path.dirname(__file__), "..", "ml_data", "trending_history.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="No trending data yet")
    with open(path) as f:
        data = _json.load(f)

    # Return latest snapshot + metadata + recommendation context
    latest = data["snapshots"][-1] if data.get("snapshots") else None
    prev = data["snapshots"][-2] if len(data.get("snapshots", [])) > 1 else None

    # For each trending song, find its rec engine match
    enriched_songs = []
    if latest:
        for song in latest.get("songs", [])[:20]:
            enriched_songs.append({
                "name": song.get("name", ""),
                "album": song.get("album", ""),
                "artwork_url": song.get("artwork_url", ""),
                "preview_url": song.get("preview_url", ""),
                "genre": song.get("genre", ""),
            })

    return {
        "date": latest.get("date") if latest else None,
        "songs": enriched_songs,
        "total_snapshots": data.get("metadata", {}).get("total_snapshots", 0),
        "changes": latest.get("changes") if latest else None,
    }


@app.get("/api/engines")
def get_engines():
    """List all available recommendation engines."""
    from app.rec_engines import list_engines
    return {"engines": list_engines()}


@app.post("/api/engine/{engine_key}")
def run_engine_endpoint(engine_key: str, request: CompareRequest):
    """Run a specific recommendation engine."""
    from app.rec_engines import run_engine
    results = run_engine(
        key=engine_key,
        song_names=request.song_names,
        song_ids=request.liked_songs,
        limit=request.num_per_engine,
    )
    return {"engine": engine_key, "recommendations": results, "count": len(results)}


@app.post("/api/compare")
def compare_engines(request: CompareRequest):
    """Run all 5 ML recommendation engines on the same seed songs."""
    try:
        from app.rec_engines import ENGINES, run_engine

        # Get average seed features
        seed_features = {}
        feature_names = [
            "danceability", "energy", "loudness", "speechiness",
            "acousticness", "instrumentalness", "liveness", "valence", "tempo",
        ]
        feature_accum = {f: [] for f in feature_names}
        for name in request.song_names:
            feats = get_csv_features(name)
            if feats:
                for f in feature_names:
                    val = feats.get(f)
                    if val is not None:
                        feature_accum[f].append(val)
        for f in feature_names:
            vals = feature_accum[f]
            seed_features[f] = round(sum(vals) / len(vals), 3) if vals else 0

        # Run all registered engines
        engines_output = {}
        for key in ENGINES:
            results = run_engine(
                key,
                song_names=request.song_names,
                song_ids=request.liked_songs,
                limit=request.num_per_engine,
            )
            engines_output[key] = {"results": results}

        return {
            "seed_features": seed_features,
            "engines": engines_output,
        }
    except Exception as e:
        logger.error(f"Compare engines error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/engine-stats")
def get_engine_stats():
    """Compute stats about the engine's dataset for the HowItWorks page."""
    try:
        from app.recommender import _TAYLOR_DATA
        from app.editorial import EDITORIAL_BRIDGES
        import numpy as np

        # Catalog stats
        total_songs = len(_TAYLOR_DATA)
        songs_with_features = sum(
            1 for s in _TAYLOR_DATA.values() if s.get("danceability")
        )
        songs_with_lyrics = sum(
            1 for s in _TAYLOR_DATA.values() if s.get("lyrics")
        )

        # Editorial stats
        total_bridges = sum(len(bridges) for bridges in EDITORIAL_BRIDGES.values())
        bridge_songs = len(EDITORIAL_BRIDGES)
        unique_artists = len(
            set(
                b["artist"]
                for bridges in EDITORIAL_BRIDGES.values()
                for b in bridges
            )
        )
        coverage = round(bridge_songs / max(total_songs, 1) * 100, 1)

        # Feature distributions
        feature_names = [
            "danceability", "energy", "valence", "acousticness",
            "speechiness", "instrumentalness", "liveness", "tempo",
        ]
        distributions = {}
        for feat in feature_names:
            values = [
                s.get(feat, 0)
                for s in _TAYLOR_DATA.values()
                if s.get(feat) is not None and s.get(feat) != 0
            ]
            if values:
                arr = np.array(values)
                distributions[feat] = {
                    "mean": round(float(np.mean(arr)), 3),
                    "std": round(float(np.std(arr)), 3),
                    "min": round(float(np.min(arr)), 3),
                    "max": round(float(np.max(arr)), 3),
                }

        return {
            "catalog_size": total_songs,
            "songs_with_features": songs_with_features,
            "songs_with_lyrics": songs_with_lyrics,
            "editorial_bridge_count": total_bridges,
            "bridge_songs_count": bridge_songs,
            "unique_bridge_artists": unique_artists,
            "catalog_coverage_pct": coverage,
            "feature_distributions": distributions,
        }
    except Exception as e:
        logger.error(f"Engine stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Spotify User OAuth — Playlist Export
# ============================================================

@app.get("/api/spotify/login")
def spotify_login():
    """Redirect to Spotify OAuth login page."""
    from app.spotify_auth import get_login_url
    return RedirectResponse(get_login_url())


@app.get("/api/spotify/callback")
def spotify_callback(code: str = ""):
    """Handle Spotify OAuth callback."""
    from app.spotify_auth import exchange_code
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")
    result = exchange_code(code)
    if not result:
        raise HTTPException(status_code=401, detail="Failed to authenticate with Spotify")
    # Return HTML that closes the popup and notifies the parent
    return {"status": "authenticated", "message": "You can close this window"}


@app.get("/api/spotify/status")
def spotify_status():
    """Check if user is authenticated with Spotify."""
    from app.spotify_auth import get_user_info
    return get_user_info()


@app.post("/api/spotify/create-playlist")
def create_spotify_playlist(request: dict):
    """Create a Spotify playlist from recommendation results."""
    from app.spotify_auth import create_playlist, is_authenticated
    if not is_authenticated():
        raise HTTPException(status_code=401, detail="Not authenticated. Login via /api/spotify/login first.")

    song_names = request.get("songs", [])
    playlist_name = request.get("name", "Shubz-Taylor Recommendations")
    description = request.get("description", "Generated by The Shubz-Taylor Recommendation Engine")

    if not song_names:
        raise HTTPException(status_code=400, detail="No songs provided")

    result = create_playlist(playlist_name, description, song_names)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create playlist")

    return result


# ============================================================
# Lyrics Sync — Whisper-aligned timing data
# ============================================================

_lyrics_sync = None

@app.get("/api/lyrics-sync/{song_name}")
def get_lyrics_sync(song_name: str):
    """Get Whisper-aligned lyric timings for a song."""
    global _lyrics_sync
    import os, json as _json
    if _lyrics_sync is None:
        sync_path = os.path.join(os.path.dirname(__file__), "..", "ml_data", "lyrics_sync.json")
        if os.path.exists(sync_path):
            with open(sync_path) as f:
                _lyrics_sync = _json.load(f)
        else:
            _lyrics_sync = {}

    data = _lyrics_sync.get(song_name.lower())
    if not data:
        # Try fuzzy match
        for key in _lyrics_sync:
            if song_name.lower() in key or key in song_name.lower():
                data = _lyrics_sync[key]
                break

    if not data:
        raise HTTPException(status_code=404, detail=f"No sync data for '{song_name}'")

    return data
