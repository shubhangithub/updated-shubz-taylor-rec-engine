"""
Spotify User OAuth for playlist creation (Authorization Code Flow).

Tokens are stored PER SESSION, keyed by an unguessable session id that the
callback hands back to the browser via postMessage. The caller must present
that session id on every authenticated request, so one visitor's login can
never authorize another visitor's requests. A CSRF `state` value is issued
at login and verified in the callback.
"""
import os
import logging
import secrets
import time
from typing import Optional, Dict, List, Tuple
from urllib.parse import urlencode

import requests
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# session_id -> {access_token, refresh_token, user_id, created}
_sessions: Dict[str, Dict] = {}
# pending CSRF state values -> issued-at timestamp
_pending_states: Dict[str, float] = {}

SESSION_TTL = 3600         # tokens usable for one hour
STATE_TTL = 600            # login must complete within ten minutes

CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "")
REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI", "http://localhost:8000/api/spotify/callback")
SCOPES = "playlist-modify-public playlist-modify-private"


def _prune(store: Dict, ttl: float) -> None:
    now = time.time()
    for k in [k for k, ts in store.items() if isinstance(ts, (int, float)) and now - ts > ttl]:
        store.pop(k, None)


def get_login_url() -> str:
    """Generate a Spotify OAuth login URL carrying a fresh CSRF state."""
    _prune(_pending_states, STATE_TTL)
    state = secrets.token_urlsafe(24)
    _pending_states[state] = time.time()
    params = {
        "client_id": CLIENT_ID,
        "response_type": "code",
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPES,
        "show_dialog": "true",
        "state": state,
    }
    return f"https://accounts.spotify.com/authorize?{urlencode(params)}"


def exchange_code(code: str, state: str) -> Optional[str]:
    """Validate state, exchange the code, and return a new session id (or None)."""
    _prune(_pending_states, STATE_TTL)
    if not state or _pending_states.pop(state, None) is None:
        logger.warning("OAuth callback with missing/expired state — rejected")
        return None
    try:
        resp = requests.post(
            "https://accounts.spotify.com/api/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": REDIRECT_URI,
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
            },
            timeout=10,
        )
        if resp.status_code != 200:
            logger.error(f"Token exchange failed: {resp.status_code} {resp.text}")
            return None

        data = resp.json()
        session_id = secrets.token_urlsafe(24)
        _sessions[session_id] = {
            "access_token": data["access_token"],
            "refresh_token": data.get("refresh_token", ""),
            "user_id": _get_user_id(data["access_token"]),
            "created": time.time(),
        }
        _prune(_sessions, SESSION_TTL)
        logger.info(f"Spotify session established for user {_sessions[session_id]['user_id']}")
        return session_id
    except Exception as e:
        logger.error(f"Token exchange error: {e}")
        return None


def _get_user_id(access_token: str) -> str:
    """Get the authenticated user's Spotify ID."""
    try:
        resp = requests.get(
            "https://api.spotify.com/v1/me",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        return resp.json().get("id", "")
    except Exception:
        return ""


def _session(session_id: str) -> Optional[Dict]:
    _prune(_sessions, SESSION_TTL)
    sess = _sessions.get(session_id or "")
    if not sess:
        return None
    if time.time() - sess["created"] > SESSION_TTL:
        _sessions.pop(session_id, None)
        return None
    return sess


def get_user_info(session_id: str) -> Dict:
    """Return the caller's own auth status — only for a valid session id."""
    sess = _session(session_id)
    if not sess:
        return {"authenticated": False}
    return {"authenticated": True, "user_id": sess.get("user_id", "")}


def create_playlist(session_id: str, name: str, description: str,
                    song_names: List[str]) -> Optional[Dict]:
    """Create a Spotify playlist in the SESSION OWNER's account and add tracks."""
    sess = _session(session_id)
    if not sess:
        return None
    access_token = sess["access_token"]
    user_id = sess.get("user_id", "")
    if not user_id:
        return None

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    # 1. Create playlist
    try:
        resp = requests.post(
            f"https://api.spotify.com/v1/users/{user_id}/playlists",
            headers=headers,
            json={"name": name, "description": description, "public": True},
            timeout=10,
        )
        if resp.status_code not in (200, 201):
            logger.error(f"Playlist creation failed: {resp.status_code} {resp.text}")
            return None
        playlist = resp.json()
        playlist_id = playlist["id"]
        playlist_url = playlist["external_urls"]["spotify"]
        logger.info(f"Created playlist: {playlist_url}")
    except Exception as e:
        logger.error(f"Playlist creation error: {e}")
        return None

    # 2. Search for track URIs
    track_uris = []
    for song_name in song_names:
        try:
            search_resp = requests.get(
                "https://api.spotify.com/v1/search",
                headers=headers,
                params={"q": song_name, "type": "track", "limit": 1},
                timeout=10,
            )
            if search_resp.status_code == 200:
                tracks = search_resp.json().get("tracks", {}).get("items", [])
                if tracks:
                    track_uris.append(tracks[0]["uri"])
        except Exception:
            continue

    # 3. Add tracks (Spotify allows max 100 per request)
    if track_uris:
        try:
            for i in range(0, len(track_uris), 100):
                requests.post(
                    f"https://api.spotify.com/v1/playlists/{playlist_id}/tracks",
                    headers=headers,
                    json={"uris": track_uris[i:i + 100]},
                    timeout=10,
                )
            logger.info(f"Added {len(track_uris)} tracks to playlist")
        except Exception as e:
            logger.error(f"Error adding tracks: {e}")

    return {
        "playlist_id": playlist_id,
        "playlist_url": playlist_url,
        "tracks_added": len(track_uris),
        "tracks_requested": len(song_names),
    }
