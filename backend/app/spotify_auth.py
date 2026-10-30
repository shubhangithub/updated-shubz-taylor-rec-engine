"""Spotify OAuth with short-lived, per-browser sessions held only on the server."""
import logging
import os
import secrets
import time
from threading import RLock
from typing import Dict, List, Optional
from urllib.parse import urlencode

import requests
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)
CLIENT_ID = os.getenv('SPOTIFY_CLIENT_ID', '')
CLIENT_SECRET = os.getenv('SPOTIFY_CLIENT_SECRET', '')
REDIRECT_URI = os.getenv('SPOTIFY_REDIRECT_URI',
                         os.getenv('RENDER_EXTERNAL_URL', 'http://127.0.0.1:8000').rstrip('/') + '/api/spotify/callback')
FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://shubz-taylor-recommendation-engine.vercel.app').rstrip('/')
ALLOWED_ORIGINS = {FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'}
SCOPES = 'playlist-modify-public playlist-modify-private'
_pending: Dict[str, Dict] = {}
_sessions: Dict[str, Dict] = {}
_lock = RLock()
SESSION_TTL = 24 * 60 * 60


def configured() -> bool:
    return bool(CLIENT_ID and CLIENT_SECRET and not CLIENT_ID.startswith('your_'))


def get_login_url(origin: str = FRONTEND_URL) -> str:
    if not configured():
        raise ValueError('Spotify credentials are not configured on the server.')
    if origin not in ALLOWED_ORIGINS:
        raise ValueError('Invalid frontend origin')
    now = time.time()
    state = secrets.token_urlsafe(32)
    with _lock:
        for key in list(_pending):
            if _pending[key]['expires_at'] <= now:
                del _pending[key]
        for key in list(_sessions):
            if _sessions[key]['session_expires_at'] <= now:
                del _sessions[key]
        _pending[state] = {'origin': origin, 'expires_at': now + 600}
    return 'https://accounts.spotify.com/authorize?' + urlencode({
        'client_id': CLIENT_ID, 'response_type': 'code', 'redirect_uri': REDIRECT_URI,
        'scope': SCOPES, 'state': state, 'show_dialog': 'true',
    })


def consume_state(state: str) -> Optional[str]:
    with _lock:
        pending = _pending.pop(state, None)
    if not pending or pending['expires_at'] <= time.time():
        return None
    return pending['origin']


def exchange_code(code: str) -> Optional[str]:
    try:
        resp = requests.post('https://accounts.spotify.com/api/token', data={
            'grant_type': 'authorization_code', 'code': code, 'redirect_uri': REDIRECT_URI,
        }, auth=(CLIENT_ID, CLIENT_SECRET), timeout=10)
        resp.raise_for_status()
        data = resp.json()
        session = secrets.token_urlsafe(32)
        now = time.time()
        with _lock:
            _sessions[session] = {
                'access_token': data['access_token'], 'refresh_token': data.get('refresh_token'),
                'expires_at': now + data.get('expires_in', 3600),
                'session_expires_at': now + SESSION_TTL,
            }
        return session
    except (requests.RequestException, KeyError, ValueError):
        logger.warning('Spotify token exchange failed')
        return None


def _access_token(session: str) -> Optional[str]:
    with _lock:
        data = _sessions.get(session)
        if not data or data['session_expires_at'] <= time.time():
            _sessions.pop(session, None)
            return None
        if data['expires_at'] <= time.time() + 60:
            if not data.get('refresh_token'):
                _sessions.pop(session, None)
                return None
            try:
                resp = requests.post('https://accounts.spotify.com/api/token', data={
                    'grant_type': 'refresh_token', 'refresh_token': data['refresh_token'],
                }, auth=(CLIENT_ID, CLIENT_SECRET), timeout=10)
                resp.raise_for_status()
                refreshed = resp.json()
                data['access_token'] = refreshed['access_token']
                data['refresh_token'] = refreshed.get('refresh_token', data['refresh_token'])
                data['expires_at'] = time.time() + refreshed.get('expires_in', 3600)
            except (requests.RequestException, KeyError, ValueError):
                return None
        return data['access_token']


def get_user_info(session: str = '') -> Dict:
    return {'authenticated': bool(_access_token(session)), 'configured': configured()}


def create_playlist(session: str, name: str, description: str, song_names: List[str]) -> Optional[Dict]:
    access_token = _access_token(session)
    if not access_token:
        return None
    headers = {'Authorization': f'Bearer {access_token}', 'Content-Type': 'application/json'}
    try:
        # Resolve tracks first so failed searches never create an empty playlist.
        uris = []
        for song in song_names:
            resp = requests.get('https://api.spotify.com/v1/search', headers=headers,
                                params={'q': song, 'type': 'track', 'limit': 1}, timeout=10)
            resp.raise_for_status()
            tracks = resp.json().get('tracks', {}).get('items', [])
            if tracks and tracks[0]['uri'] not in uris:
                uris.append(tracks[0]['uri'])
        if not uris:
            raise ValueError('Spotify could not find any of the requested tracks.')
        resp = requests.post('https://api.spotify.com/v1/me/playlists', headers=headers,
                             json={'name': name, 'description': description, 'public': True}, timeout=10)
        resp.raise_for_status()
        playlist = resp.json()
        added = 0
        for i in range(0, len(uris), 100):
            resp = requests.post(f"https://api.spotify.com/v1/playlists/{playlist['id']}/items",
                                 headers=headers, json={'uris': uris[i:i + 100]}, timeout=10)
            resp.raise_for_status()
            added += len(uris[i:i + 100])
        return {'playlist_id': playlist['id'], 'playlist_url': playlist['external_urls']['spotify'],
                'tracks_added': added, 'tracks_requested': len(song_names)}
    except requests.RequestException as exc:
        logger.warning('Spotify playlist request failed: %s', type(exc).__name__)
        raise ValueError('Spotify could not complete the playlist. Please retry or reconnect Spotify.') from exc
