import os
import logging
from typing import List, Dict, Optional, Any

import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class SpotifyClient:
    def __init__(self):
        self.available = False
        self.sp = None

        client_id = os.getenv("SPOTIFY_CLIENT_ID")
        client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")

        if not client_id or not client_secret:
            logger.warning(
                "Spotify credentials not found. Spotify features will be unavailable."
            )
            return

        if client_id.startswith("your_") or client_secret.startswith("your_"):
            logger.warning(
                "Spotify credentials appear to be placeholders. Spotify features will be unavailable."
            )
            return

        try:
            auth_manager = SpotifyClientCredentials(
                client_id=client_id, client_secret=client_secret
            )
            self.sp = spotipy.Spotify(auth_manager=auth_manager, requests_timeout=10, retries=1, status_retries=1)
            self.available = True
            logger.info("Spotify client initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Spotify client: {e}")

    def _extract_track(self, track: Dict) -> Dict:
        """Extract standardized track info from a Spotify track object."""
        images = track.get("album", {}).get("images", [])
        image_url = images[0]["url"] if images else None
        artists = track.get("artists", [])
        return {
            "id": track.get("id"),
            "name": track.get("name"),
            "artist": artists[0]["name"] if artists else "Unknown",
            "artist_id": artists[0]["id"] if artists else None,
            "album": track.get("album", {}).get("name"),
            "album_id": track.get("album", {}).get("id"),
            "preview_url": track.get("preview_url"),
            "external_url": track.get("external_urls", {}).get("spotify"),
            "image": image_url,
            "release_date": track.get("album", {}).get("release_date"),
            "popularity": track.get("popularity", 0),
        }

    def search_songs(
        self, query: str, artist: Optional[str] = None, limit: int = 10
    ) -> List[Dict]:
        if not self.available:
            return []
        try:
            search_query = query
            if artist:
                search_query = f"{query} artist:{artist}"
            results = self.sp.search(q=search_query, type="track", limit=min(limit, 10))
            tracks = results.get("tracks", {}).get("items", [])
            return [self._extract_track(t) for t in tracks]
        except Exception as e:
            logger.error(f"Error searching songs: {e}")
            return []

    def get_audio_features(self, song_ids: List[str]) -> List[Dict]:
        if not self.available:
            return []
        try:
            all_features = []
            for i in range(0, len(song_ids), 100):
                batch = song_ids[i : i + 100]
                features = self.sp.audio_features(batch)
                if features:
                    all_features.extend([f for f in features if f is not None])
            return all_features
        except Exception as e:
            # Audio features endpoint may be deprecated (403)
            logger.warning(f"Audio features unavailable: {e}")
            return []

    def get_song_info(self, song_id: str) -> Optional[Dict]:
        if not self.available:
            return None
        try:
            track = self.sp.track(song_id)
            track_info = self._extract_track(track)

            # Try audio features — may fail with 403 on newer Spotify apps
            try:
                features = self.sp.audio_features([song_id])
                if features and features[0]:
                    track_info["audio_features"] = features[0]
                else:
                    track_info["audio_features"] = {}
            except Exception:
                logger.warning(f"Audio features unavailable for {song_id} (likely deprecated)")
                track_info["audio_features"] = {}

            return track_info
        except Exception as e:
            logger.error(f"Error getting song info for {song_id}: {e}")
            return None

    def get_artist_info(self, artist_name: str) -> Optional[Dict]:
        if not self.available:
            return None
        try:
            results = self.sp.search(q=f"artist:{artist_name}", type="artist", limit=1)
            artists = results.get("artists", {}).get("items", [])
            if not artists:
                return None

            artist = artists[0]
            artist_id = artist["id"]

            # These endpoints are restricted for newer Spotify apps. Metadata
            # must remain available even when optional enrichments are denied.
            try:
                top_tracks = self.sp.artist_top_tracks(artist_id, country="US")
            except Exception:
                top_tracks = {"tracks": []}
            try:
                related = self.sp.artist_related_artists(artist_id)
            except Exception:
                related = {"artists": []}

            images = artist.get("images", [])
            return {
                "id": artist_id,
                "name": artist.get("name"),
                "genres": artist.get("genres", []),
                "popularity": artist.get("popularity", 0),
                "followers": artist.get("followers", {}).get("total", 0),
                "image": images[0]["url"] if images else None,
                "external_url": artist.get("external_urls", {}).get("spotify"),
                "top_tracks": [
                    self._extract_track(t)
                    for t in top_tracks.get("tracks", [])
                ],
                "related_artists": [
                    {
                        "id": ra["id"],
                        "name": ra["name"],
                        "genres": ra.get("genres", []),
                        "popularity": ra.get("popularity", 0),
                        "image": ra["images"][0]["url"]
                        if ra.get("images")
                        else None,
                    }
                    for ra in related.get("artists", [])[:10]
                ],
            }
        except Exception as e:
            logger.error(f"Error getting artist info for {artist_name}: {e}")
            return None

    def get_artist_albums(self, artist_id: str) -> List[Dict]:
        if not self.available:
            return []
        try:
            albums = []
            results = self.sp.artist_albums(
                artist_id, album_type="album,single", limit=50
            )
            while results:
                for album in results.get("items", []):
                    images = album.get("images", [])
                    albums.append(
                        {
                            "id": album["id"],
                            "name": album["name"],
                            "release_date": album.get("release_date"),
                            "total_tracks": album.get("total_tracks", 0),
                            "image": images[0]["url"] if images else None,
                            "album_type": album.get("album_type"),
                        }
                    )
                if results.get("next"):
                    results = self.sp.next(results)
                else:
                    break
            return albums
        except Exception as e:
            logger.error(f"Error getting albums for artist {artist_id}: {e}")
            return []

    def get_album_tracks(self, album_id: str) -> List[Dict]:
        if not self.available:
            return []
        try:
            results = self.sp.album_tracks(album_id, limit=50)
            tracks = results.get("items", [])
            track_ids = [t["id"] for t in tracks if t.get("id")]

            # Get full track objects for popularity and images
            full_tracks = []
            for i in range(0, len(track_ids), 50):
                batch = track_ids[i : i + 50]
                full = self.sp.tracks(batch)
                full_tracks.extend(full.get("tracks", []))

            return [self._extract_track(t) for t in full_tracks if t]
        except Exception as e:
            logger.error(f"Error getting tracks for album {album_id}: {e}")
            return []

    def get_related_artists(self, artist_id: str) -> List[Dict]:
        if not self.available:
            return []
        try:
            results = self.sp.artist_related_artists(artist_id)
            return [
                {
                    "id": a["id"],
                    "name": a["name"],
                    "genres": a.get("genres", []),
                    "popularity": a.get("popularity", 0),
                    "image": a["images"][0]["url"] if a.get("images") else None,
                    "external_url": a.get("external_urls", {}).get("spotify"),
                }
                for a in results.get("artists", [])
            ]
        except Exception as e:
            logger.error(f"Error getting related artists for {artist_id}: {e}")
            return []

    def get_recommendations_from_seed(
        self,
        seed_tracks: List[str],
        seed_artists: Optional[List[str]] = None,
        limit: int = 50,
        **kwargs: Any,
    ) -> List[Dict]:
        if not self.available:
            return []
        try:
            # Spotify allows max 5 seeds total (tracks + artists + genres)
            tracks_seed = seed_tracks[:5]
            artists_seed = []
            if seed_artists:
                remaining = 5 - len(tracks_seed)
                artists_seed = seed_artists[:remaining]

            params = {
                "seed_tracks": tracks_seed if tracks_seed else None,
                "seed_artists": artists_seed if artists_seed else None,
                "limit": min(limit, 10),
            }

            # Add optional audio feature targets
            valid_targets = [
                "target_energy",
                "target_valence",
                "target_danceability",
                "target_acousticness",
                "target_instrumentalness",
                "target_tempo",
                "target_loudness",
                "target_speechiness",
                "target_liveness",
                "min_energy",
                "max_energy",
                "min_valence",
                "max_valence",
                "min_danceability",
                "max_danceability",
                "min_acousticness",
                "max_acousticness",
            ]
            for key, value in kwargs.items():
                if key in valid_targets:
                    params[key] = value

            # Remove None values
            params = {k: v for k, v in params.items() if v is not None}

            results = self.sp.recommendations(**params)
            tracks = results.get("tracks", [])
            return [self._extract_track(t) for t in tracks]
        except Exception as e:
            logger.error(f"Error getting recommendations: {e}")
            return []


# Cache successful lookups; failures remain retryable on the next request.
from functools import lru_cache
import re
import unicodedata


def _normalize_title(value: str) -> str:
    return re.sub(r"[^\w]+", " ", unicodedata.normalize("NFKC", value).casefold()).strip()


@lru_cache(maxsize=1024)
def _itunes_lookup(song_name: str, artist: str, cache_window: int) -> Optional[Dict]:
    import requests
    try:
        resp = requests.get(
            "https://itunes.apple.com/search",
            params={"term": f"{song_name} {artist}", "media": "music", "entity": "song", "limit": 10},
            timeout=5,
        )
        resp.raise_for_status()
        results = resp.json().get("results", [])
        title = _normalize_title(song_name)
        for result in results:
            if (_normalize_title(result.get("artistName", "")) == _normalize_title(artist)
                    and _normalize_title(result.get("trackName", "")) == title
                    and result.get("previewUrl")):
                return result
        # Alternate editions are acceptable only for the requested song and artist.
        for result in results:
            candidate = _normalize_title(result.get("trackName", ""))
            if (_normalize_title(result.get("artistName", "")) == _normalize_title(artist)
                    and candidate.startswith(title + " ") and result.get("previewUrl")):
                return result
        return None
    except (requests.RequestException, ValueError) as exc:
        logger.warning("iTunes preview lookup failed: %s", type(exc).__name__)
        # Exceptions are not cached by lru_cache.
        raise


def get_itunes_preview(song_name: str, artist: str = "Taylor Swift") -> Optional[str]:
    """Resolve a matching preview, never a different artist's first search hit."""
    import time
    if not song_name.strip() or not artist.strip():
        return None
    try:
        track = _itunes_lookup(song_name.strip(), artist.strip(), int(time.time() // 3600))
        return track.get('previewUrl') if track else None
    except Exception:
        return None


def get_itunes_song(song_name: str, artist: str = 'Taylor Swift') -> Optional[Dict]:
    """Public metadata/preview fallback when Spotify cannot serve a recording."""
    import time
    if not song_name.strip() or not artist.strip():
        return None
    try:
        track = _itunes_lookup(song_name.strip(), artist.strip(), int(time.time() // 3600))
        if not track:
            return None
        return {'id': f"itunes-{track.get('trackId', '')}", 'name': track.get('trackName', song_name),
                'artist': track.get('artistName', artist), 'album': track.get('collectionName', ''),
                'preview_url': track.get('previewUrl'), 'external_url': track.get('trackViewUrl', ''),
                'image': track.get('artworkUrl100', '').replace('100x100bb', '600x600bb') or None,
                'metadata_source': 'iTunes'}
    except Exception:
        return None


# Singleton instance
spotify_client = SpotifyClient()
