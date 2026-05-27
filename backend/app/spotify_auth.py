"""
Spotify User OAuth for playlist creation.
Uses Authorization Code Flow (not Client Credentials) to get user-scoped access.
"""
import os
import logging
from typing import Optional, Dict, List
from urllib.parse import urlencode

import requests
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# In-memory token storage (single-user, for demo purposes)
_user_tokens: Dict[str, str] = {}

CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "")
REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI", "http://localhost:8000/api/spotify/callback")
SCOPES = "playlist-modify-public playlist-modify-private"


def get_login_url() -> str:
    """Generate Spotify OAuth login URL."""
    params = {
        "client_id": CLIENT_ID,
        "response_type": "code",
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPES,
        "show_dialog": "true",
    }
    return f"https://accounts.spotify.com/authorize?{urlencode(params)}"


def exchange_code(code: str) -> Optional[Dict]:
    """Exchange authorization code for access token."""
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
        _user_tokens["access_token"] = data["access_token"]
        _user_tokens["refresh_token"] = data.get("refresh_token", "")
        _user_tokens["user_id"] = _get_user_id(data["access_token"])
        logger.info(f"Spotify user authenticated: {_user_tokens.get('user_id')}")
        return data
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
    except:
        return ""


def is_authenticated() -> bool:
    """Check if a user is authenticated."""
    return bool(_user_tokens.get("access_token"))


def get_user_info() -> Dict:
    """Get current user info."""
    if not is_authenticated():
        return {"authenticated": False}
    return {
        "authenticated": True,
        "user_id": _user_tokens.get("user_id", ""),
    }


def create_playlist(name: str, description: str, song_names: List[str]) -> Optional[Dict]:
    """Create a Spotify playlist and add tracks to it."""
    if not is_authenticated():
        return None

    access_token = _user_tokens["access_token"]
    user_id = _user_tokens.get("user_id", "")
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
            json={
                "name": name,
                "description": description,
                "public": True,
            },
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
        except:
            continue

    # 3. Add tracks to playlist
    if track_uris:
        try:
            # Spotify allows max 100 tracks per request
            for i in range(0, len(track_uris), 100):
                batch = track_uris[i:i + 100]
                requests.post(
                    f"https://api.spotify.com/v1/playlists/{playlist_id}/tracks",
                    headers=headers,
                    json={"uris": batch},
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
