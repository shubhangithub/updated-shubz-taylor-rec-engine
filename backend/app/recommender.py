"""
Enhanced music recommendation engine using cosine similarity,
Spotify audio features, and curated editorial bridges.
"""

import os
import csv
import logging
from typing import List, Dict, Optional

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from app.spotify_client import spotify_client
from app.editorial import (
    get_editorial_recommendations,
    get_era_artists,
    get_mood_songs,
    EDITORIAL_BRIDGES,
)

logger = logging.getLogger(__name__)

# Load comprehensive Taylor Swift data (features + lyrics) from JSON
_TAYLOR_DATA: Dict[str, Dict] = {}
_json_path = os.path.join(os.path.dirname(__file__), "taylor_complete.json")
if os.path.exists(_json_path):
    import json
    with open(_json_path, "r", encoding="utf-8") as f:
        _all_songs = json.load(f)
        for song in _all_songs:
            name = (song.get("name") or "").strip().lower()
            if name:
                _TAYLOR_DATA[name] = song
    logger.info(f"Loaded {len(_TAYLOR_DATA)} Taylor Swift songs from dataset")
else:
    # Fallback to old CSV
    _csv_path = os.path.join(os.path.dirname(__file__), "ts.csv")
    if os.path.exists(_csv_path):
        with open(_csv_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = row.get("name", "").strip()
                if name:
                    _TAYLOR_DATA[name.lower()] = {
                        "name": name,
                        "danceability": float(row.get("danceability", 0) or 0),
                        "energy": float(row.get("energy", 0) or 0),
                        "loudness": float(row.get("loudness", 0) or 0),
                        "speechiness": float(row.get("speechiness", 0) or 0),
                        "acousticness": float(row.get("acousticness", 0) or 0),
                        "instrumentalness": float(row.get("instrumentalness", 0) or 0),
                        "liveness": float(row.get("liveness", 0) or 0),
                        "valence": float(row.get("valence", 0) or 0),
                        "tempo": float(row.get("tempo", 0) or 0),
                    }
        logger.info(f"Loaded {len(_TAYLOR_DATA)} Taylor Swift songs from CSV fallback")


def get_csv_features(song_name: str) -> Optional[Dict]:
    """Look up audio features from the static dataset."""
    name = song_name.strip().lower()
    song = _TAYLOR_DATA.get(name)
    if song and song.get("danceability"):
        return {k: song[k] for k in [
            "danceability", "energy", "loudness", "speechiness",
            "acousticness", "instrumentalness", "liveness", "valence", "tempo"
        ] if k in song}
    # Fuzzy match
    for key, val in _TAYLOR_DATA.items():
        if (name in key or key in name) and val.get("danceability"):
            return {k: val[k] for k in [
                "danceability", "energy", "loudness", "speechiness",
                "acousticness", "instrumentalness", "liveness", "valence", "tempo"
            ] if k in val}
    return None


def _resolve_song(song_name: str) -> Optional[Dict]:
    """Find the dataset entry for a song by name.

    Exact match first; then a length-guarded substring match that prefers the
    MOST SPECIFIC (longest) matching key. The old `name in key or key in name`
    rule matched almost anything for short inputs — e.g. "a" returned a real
    song — so the fuzzy branch now requires >=4 chars and picks the best key.
    """
    name = song_name.strip().lower()
    if not name:
        return None
    song = _TAYLOR_DATA.get(name)
    if song:
        return song
    if len(name) < 4:
        return None
    best_key, best_len = None, -1
    for key in _TAYLOR_DATA:
        if name in key or key in name:
            # Longest key wins: prefer the full variant over a bare prefix
            if len(key) > best_len:
                best_key, best_len = key, len(key)
    return _TAYLOR_DATA.get(best_key) if best_key else None


def get_song_lyrics(song_name: str) -> Optional[str]:
    """Look up lyrics from the static dataset."""
    song = _resolve_song(song_name)
    return song.get("lyrics") if song and song.get("lyrics") else None


def get_full_song_data(song_name: str) -> Optional[Dict]:
    """Get complete song data (features + lyrics + metadata).

    Returns a shallow COPY so callers can enrich the result (atmosphere,
    editorial bridges, preview URL) without mutating the shared in-memory
    dataset for every subsequent request.
    """
    song = _resolve_song(song_name)
    return dict(song) if song else None

FEATURE_COLUMNS = [
    "danceability",
    "energy",
    "loudness",
    "speechiness",
    "acousticness",
    "instrumentalness",
    "liveness",
    "valence",
    "tempo",
]


def _normalize_features(features_dict: Dict) -> List[float]:
    """Extract and normalize feature values from a features dict."""
    raw = []
    for col in FEATURE_COLUMNS:
        val = features_dict.get(col, 0.0)
        if val is None:
            val = 0.0
        raw.append(float(val))

    # Normalize loudness (typically -60 to 0) to 0-1
    if raw[2] != 0:
        raw[2] = (raw[2] + 60) / 60
    # Normalize tempo (typically 50-200) to 0-1
    if raw[8] != 0:
        raw[8] = (raw[8] - 50) / 150

    return raw


def _features_to_color(energy: float, valence: float, acousticness: float) -> List[str]:
    """Derive a DARK color palette from audio features. Colors are muted and moody."""
    # All colors are kept dark (max ~120 per channel) so they work on dark backgrounds
    darkener = 0.45  # Keep everything below half brightness

    if valence > 0.7:
        base = [int(180 * darkener), int(140 * darkener + valence * 30), int(60 * darkener)]
    elif valence > 0.4:
        base = [int(120 * valence * darkener), int((100 + valence * 60) * darkener), int(140 * (1 - valence) * darkener)]
    else:
        base = [int((40 + 60 * valence) * darkener), int((50 + 40 * valence) * darkener), int((120 + 50 * (1 - valence)) * darkener)]

    secondary = [
        min(120, int(base[0] * (0.8 + energy * 0.3))),
        min(120, int(base[1] * (0.7 + energy * 0.3))),
        min(120, int(base[2] * (0.6 + energy * 0.4))),
    ]

    if acousticness > 0.5:
        accent = [int(80 * acousticness), int(70 * acousticness), int(55 * acousticness)]
    else:
        accent = [int((50 + 70 * (1 - acousticness))), int((40 + 50 * energy)), int((60 + 40 * valence))]

    def to_hex(rgb):
        return "#{:02x}{:02x}{:02x}".format(
            max(0, min(255, rgb[0])),
            max(0, min(255, rgb[1])),
            max(0, min(255, rgb[2])),
        )

    return [to_hex(base), to_hex(secondary), to_hex(accent)]


class MusicRecommender:
    def __init__(self):
        self.spotify = spotify_client

    def recommend(
        self,
        liked_songs: List[str],
        target_artist: Optional[str] = None,
        num_recommendations: int = 10,
        mood: Optional[str] = None,
    ) -> List[Dict]:
        """
        Get recommendations based on liked songs using cosine similarity
        on audio features, blended with editorial recommendations.
        """
        results = []

        # Get audio features for liked songs
        liked_features = self.spotify.get_audio_features(liked_songs)
        if not liked_features:
            # Fall back to editorial only
            return self._editorial_fallback(liked_songs, num_recommendations)

        # Compute average feature vector
        feature_vectors = [_normalize_features(f) for f in liked_features]
        avg_vector = np.mean(feature_vectors, axis=0).reshape(1, -1)

        # Get Spotify recommendations
        seed_tracks = liked_songs[:5]
        kwargs = {}
        if mood:
            mood_targets = {
                "heartbreak": {"target_valence": 0.2, "target_energy": 0.4},
                "euphoria": {"target_valence": 0.8, "target_energy": 0.8},
                "melancholy": {"target_valence": 0.25, "target_energy": 0.3},
                "rage": {"target_valence": 0.3, "target_energy": 0.9},
                "nostalgia": {"target_valence": 0.45, "target_energy": 0.4},
                "romantic": {"target_valence": 0.6, "target_energy": 0.5},
                "empowerment": {"target_valence": 0.7, "target_energy": 0.75},
                "introspective": {"target_valence": 0.35, "target_energy": 0.35},
            }
            kwargs = mood_targets.get(mood.lower(), {})

        spotify_recs = self.spotify.get_recommendations_from_seed(
            seed_tracks=seed_tracks, limit=50, **kwargs
        )

        if spotify_recs:
            rec_ids = [r["id"] for r in spotify_recs if r.get("id")]
            rec_features = self.spotify.get_audio_features(rec_ids)
            feature_map = {f["id"]: f for f in rec_features if f and f.get("id")}

            scored = []
            for rec in spotify_recs:
                features = feature_map.get(rec["id"])
                if not features:
                    continue

                vec = np.array(_normalize_features(features)).reshape(1, -1)
                sim = cosine_similarity(avg_vector, vec)[0][0]

                # Filter by target artist if specified
                if target_artist:
                    if target_artist.lower() not in rec.get("artist", "").lower():
                        continue

                scored.append(
                    {
                        **rec,
                        "similarity": round(float(sim), 4),
                        "audio_features": {
                            col: features.get(col) for col in FEATURE_COLUMNS
                        },
                        "recommendation_type": "algorithmic",
                        "atmosphere": self.get_song_atmosphere(features),
                    }
                )

            scored.sort(key=lambda x: x["similarity"], reverse=True)
            results.extend(scored)

        # Blend in editorial recommendations
        editorial_results = self._get_editorial_for_ids(liked_songs)
        results.extend(editorial_results)

        # Deduplicate by song name + artist
        seen = set()
        deduped = []
        for r in results:
            key = (r.get("name", "").lower(), r.get("artist", "").lower())
            if key not in seen:
                seen.add(key)
                deduped.append(r)

        return deduped[:num_recommendations]

    def _editorial_fallback(
        self, song_ids: List[str], limit: int
    ) -> List[Dict]:
        """When Spotify is unavailable, use editorial bridges.

        Spotify lookup is tried first, but it returns None precisely when
        Spotify is down — the condition this fallback exists for — so we also
        treat each identifier as a possible song name directly (the Taylor-
        centric flows pass names, not Spotify IDs).
        """
        results = []
        seen = set()
        for song_id in song_ids:
            names_to_try = [song_id]
            info = self.spotify.get_song_info(song_id) if self.spotify.available else None
            if info and info.get("name"):
                names_to_try.insert(0, info["name"])
            for name in names_to_try:
                bridges = get_editorial_recommendations(name)
                if not bridges:
                    continue
                for bridge in bridges:
                    key = (bridge["song"].lower(), bridge["artist"].lower())
                    if key in seen:
                        continue
                    seen.add(key)
                    results.append(
                        {
                            "name": bridge["song"],
                            "artist": bridge["artist"],
                            "reason": bridge["reason"],
                            "mood": bridge.get("mood"),
                            "era_connection": bridge.get("era_connection"),
                            "recommendation_type": "editorial",
                            "similarity": 0.85,
                        }
                    )
                break  # first name that yields bridges wins
        return results[:limit]

    def _get_editorial_for_ids(self, song_ids: List[str]) -> List[Dict]:
        """Get editorial recommendations for a list of song IDs."""
        results = []
        for song_id in song_ids:
            info = self.spotify.get_song_info(song_id)
            if not info:
                continue
            song_name = info.get("name", "")
            bridges = get_editorial_recommendations(song_name, limit=2)
            for bridge in bridges:
                # Try to find this song on Spotify
                search_results = self.spotify.search_songs(
                    bridge["song"], artist=bridge["artist"], limit=1
                )
                rec_data = {
                    "name": bridge["song"],
                    "artist": bridge["artist"],
                    "reason": bridge["reason"],
                    "mood": bridge.get("mood"),
                    "era_connection": bridge.get("era_connection"),
                    "recommendation_type": "editorial",
                    "similarity": 0.9,
                }
                if search_results:
                    rec_data.update(search_results[0])
                    rec_data["recommendation_type"] = "editorial"
                results.append(rec_data)
        return results

    def cross_artist_recommend(
        self, song_id: str, limit: int = 10
    ) -> List[Dict]:
        """
        Given a specific song, find cross-artist matches.
        Check editorial bridges first, then use audio feature matching.
        """
        results = []

        song_info = self.spotify.get_song_info(song_id)
        if not song_info:
            return results

        song_name = song_info.get("name", "")

        # Check editorial bridges
        bridges = get_editorial_recommendations(song_name, limit=limit)
        for bridge in bridges:
            search_results = self.spotify.search_songs(
                bridge["song"], artist=bridge["artist"], limit=1
            )
            rec_data = {
                "name": bridge["song"],
                "artist": bridge["artist"],
                "reason": bridge["reason"],
                "mood": bridge.get("mood"),
                "era_connection": bridge.get("era_connection"),
                "recommendation_type": "editorial",
                "similarity": 0.92,
            }
            if search_results:
                rec_data.update(search_results[0])
                rec_data["recommendation_type"] = "editorial"
                # Get atmosphere for the found track
                if rec_data.get("id"):
                    feat = self.spotify.get_audio_features([rec_data["id"]])
                    if feat:
                        rec_data["audio_features"] = {
                            col: feat[0].get(col) for col in FEATURE_COLUMNS
                        }
                        rec_data["atmosphere"] = self.get_song_atmosphere(feat[0])
            results.append(rec_data)

        # If we need more, use Spotify recommendations
        remaining = limit - len(results)
        if remaining > 0 and song_info.get("audio_features"):
            features = song_info["audio_features"]
            spotify_recs = self.spotify.get_recommendations_from_seed(
                seed_tracks=[song_id],
                limit=remaining * 3,
                target_energy=features.get("energy"),
                target_valence=features.get("valence"),
            )

            source_vec = np.array(
                _normalize_features(features)
            ).reshape(1, -1)

            source_artist = song_info.get("artist", "").lower()

            for rec in spotify_recs:
                # Skip same artist
                if rec.get("artist", "").lower() == source_artist:
                    continue

                rec_id = rec.get("id")
                if not rec_id:
                    continue

                rec_features = self.spotify.get_audio_features([rec_id])
                if not rec_features:
                    continue

                vec = np.array(_normalize_features(rec_features[0])).reshape(1, -1)
                sim = cosine_similarity(source_vec, vec)[0][0]

                results.append(
                    {
                        **rec,
                        "similarity": round(float(sim), 4),
                        "audio_features": {
                            col: rec_features[0].get(col)
                            for col in FEATURE_COLUMNS
                        },
                        "recommendation_type": "algorithmic",
                        "atmosphere": self.get_song_atmosphere(rec_features[0]),
                    }
                )

                if len(results) >= limit:
                    break

        return results[:limit]

    def mood_recommend(
        self, mood: str, era: Optional[str] = None, limit: int = 20
    ) -> List[Dict]:
        """
        Get recommendations based on mood.
        Uses MOOD_MAPPING to get Taylor songs, then finds cross-artist matches.
        """
        results = []

        # Get Taylor songs for this mood
        taylor_songs = get_mood_songs(mood)
        if not taylor_songs:
            return results

        # If era is specified, filter to that era's songs
        if era:
            from app.taylor_data import TAYLOR_CATALOG

            era_song_names = {
                s["name"].lower()
                for s in TAYLOR_CATALOG
                if s["era"].lower() == era.lower()
            }
            taylor_songs = [
                s for s in taylor_songs if s.lower() in era_song_names
            ] or taylor_songs[:5]

        # Search for these Taylor songs on Spotify and get their features
        seed_ids = []
        for song_name in taylor_songs[:10]:
            search = self.spotify.search_songs(
                song_name, artist="Taylor Swift", limit=1
            )
            if search:
                seed_ids.append(search[0]["id"])

        if seed_ids:
            # Get recommendations using mood targets
            mood_targets = {
                "heartbreak": {"target_valence": 0.2, "target_energy": 0.4},
                "euphoria": {"target_valence": 0.8, "target_energy": 0.8},
                "melancholy": {"target_valence": 0.25, "target_energy": 0.3},
                "rage": {"target_valence": 0.3, "target_energy": 0.9},
                "nostalgia": {"target_valence": 0.45, "target_energy": 0.4},
                "romantic": {"target_valence": 0.6, "target_energy": 0.5},
                "empowerment": {"target_valence": 0.7, "target_energy": 0.75},
                "introspective": {"target_valence": 0.35, "target_energy": 0.35},
            }
            kwargs = mood_targets.get(mood.lower(), {})

            spotify_recs = self.spotify.get_recommendations_from_seed(
                seed_tracks=seed_ids[:5], limit=limit * 2, **kwargs
            )

            for rec in spotify_recs:
                rec_id = rec.get("id")
                if not rec_id:
                    continue
                feat = self.spotify.get_audio_features([rec_id])
                rec_data = {
                    **rec,
                    "recommendation_type": "algorithmic",
                    "mood": mood,
                }
                if feat:
                    rec_data["audio_features"] = {
                        col: feat[0].get(col) for col in FEATURE_COLUMNS
                    }
                    rec_data["atmosphere"] = self.get_song_atmosphere(feat[0])
                results.append(rec_data)

                if len(results) >= limit:
                    break

        # Add editorial picks for this mood
        for song_name in taylor_songs[:5]:
            bridges = get_editorial_recommendations(song_name, limit=2)
            for bridge in bridges:
                if bridge.get("mood") == mood or not bridge.get("mood"):
                    search = self.spotify.search_songs(
                        bridge["song"], artist=bridge["artist"], limit=1
                    )
                    rec_data = {
                        "name": bridge["song"],
                        "artist": bridge["artist"],
                        "reason": bridge["reason"],
                        "mood": mood,
                        "recommendation_type": "editorial",
                    }
                    if search:
                        rec_data.update(search[0])
                        rec_data["recommendation_type"] = "editorial"
                    results.append(rec_data)

        # Deduplicate
        seen = set()
        deduped = []
        for r in results:
            key = (r.get("name", "").lower(), r.get("artist", "").lower())
            if key not in seen:
                seen.add(key)
                deduped.append(r)

        return deduped[:limit]

    def get_song_atmosphere(self, features_dict: Dict) -> Dict:
        """
        Given audio features, return an atmosphere dict for visual rendering.
        """
        energy = float(features_dict.get("energy", 0.5) or 0.5)
        valence = float(features_dict.get("valence", 0.5) or 0.5)
        acousticness = float(features_dict.get("acousticness", 0.5) or 0.5)
        danceability = float(features_dict.get("danceability", 0.5) or 0.5)
        tempo = float(features_dict.get("tempo", 120) or 120)
        instrumentalness = float(features_dict.get("instrumentalness", 0) or 0)
        loudness = float(features_dict.get("loudness", -10) or -10)

        # Determine mood string
        if valence > 0.7 and energy > 0.7:
            mood = "euphoric"
        elif valence > 0.6 and energy < 0.5:
            mood = "content"
        elif valence > 0.5 and danceability > 0.7:
            mood = "playful"
        elif valence < 0.3 and energy > 0.7:
            mood = "intense"
        elif valence < 0.3 and energy < 0.4:
            mood = "melancholic"
        elif valence < 0.4 and acousticness > 0.6:
            mood = "wistful"
        elif energy > 0.8:
            mood = "explosive"
        elif acousticness > 0.7:
            mood = "intimate"
        elif danceability > 0.7:
            mood = "groovy"
        else:
            mood = "reflective"

        # Determine particle type
        if energy > 0.8 and valence > 0.6:
            particle_type = "fireflies"
        elif energy > 0.7 and valence < 0.4:
            particle_type = "lightning"
        elif energy < 0.3 and valence < 0.4:
            particle_type = "rain"
        elif energy < 0.4 and acousticness > 0.6:
            particle_type = "snow"
        elif valence > 0.6 and danceability > 0.6:
            particle_type = "petals"
        elif energy > 0.5 and valence < 0.5:
            particle_type = "embers"
        else:
            particle_type = "stars"

        # Determine atmosphere type
        if energy > 0.8 and loudness > -5:
            atmosphere_type = "storm"
        elif valence > 0.6 and energy > 0.4 and energy < 0.7:
            atmosphere_type = "golden_hour"
        elif valence < 0.3 and energy < 0.4:
            atmosphere_type = "rain"
        elif energy > 0.7 and danceability > 0.7:
            atmosphere_type = "neon"
        elif acousticness > 0.6 and valence > 0.4:
            atmosphere_type = "garden"
        elif valence < 0.4 and instrumentalness > 0.3:
            atmosphere_type = "midnight"
        elif valence < 0.5 and acousticness > 0.3:
            atmosphere_type = "autumn"
        else:
            atmosphere_type = "ocean"

        # Color palette
        color_palette = _features_to_color(energy, valence, acousticness)

        return {
            "mood": mood,
            "energy_level": round(energy, 2),
            "emotional_valence": round(valence, 2),
            "color_palette": color_palette,
            "particle_type": particle_type,
            "atmosphere_type": atmosphere_type,
        }


# Singleton instance
recommender = MusicRecommender()
