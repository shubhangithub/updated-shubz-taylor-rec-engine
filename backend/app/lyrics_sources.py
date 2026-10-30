"""Documented lyric API access with attribution, exact artist matching and throttling."""
import logging
import re
import threading
import time
import unicodedata
from email.utils import parsedate_to_datetime

import requests

logger = logging.getLogger(__name__)
USER_AGENT = 'ShubzTaylorRecEngine/2.0 (https://shubz-taylor-recommendation-engine.vercel.app)'
_lock = threading.Lock()
_next_request_at = 0.0
_rate_limited_until = 0.0


def normalize(value):
    return re.sub(r'[^\w]+', ' ', unicodedata.normalize('NFKC', value).casefold()).strip()


def get_artist_lyrics(artist, max_songs=10):
    """Read up to one search page. Never substitute another artist or instrumental."""
    global _next_request_at, _rate_limited_until
    with _lock:
        if time.time() < _rate_limited_until:
            logger.warning('LRCLIB rate limit is active; retaining the existing corpus')
            return []
        time.sleep(max(0, _next_request_at - time.time()))
        try:
            response = requests.get('https://lrclib.net/api/search', params={'q': artist},
                                    headers={'User-Agent': USER_AGENT}, timeout=15)
            _next_request_at = time.time() + 0.3
            if response.status_code == 429:
                retry_after = response.headers.get('Retry-After', '60')
                try:
                    delay = float(retry_after)
                except ValueError:
                    try:
                        delay = parsedate_to_datetime(retry_after).timestamp() - time.time()
                    except (TypeError, ValueError):
                        delay = 60
                _rate_limited_until = time.time() + max(1, delay)
                logger.warning('LRCLIB rate limited this client; deferring further requests')
                return []
            response.raise_for_status()
            records = response.json()
        except (requests.RequestException, ValueError) as exc:
            logger.warning('LRCLIB lookup failed for %s (%s)', artist, type(exc).__name__)
            return []
    songs, seen = [], set()
    for record in records:
        if normalize(record.get('artistName', '')) != normalize(artist) or record.get('instrumental'):
            continue
        title = (record.get('trackName') or '').strip()
        # Some community records include the artist as a title prefix.
        if ' - ' in title and normalize(title.split(' - ', 1)[0]) == normalize(artist):
            title = title.split(' - ', 1)[1].strip()
        lyrics = (record.get('plainLyrics') or '').strip()
        key = normalize(title)
        if not key or key in seen or len(lyrics) < 50:
            continue
        seen.add(key)
        songs.append({'name': title, 'artist': artist, 'album': record.get('albumName', ''),
                      'lyrics': lyrics, 'lyrics_source': 'LRCLIB',
                      'lyrics_source_url': f"https://lrclib.net/api/get/{record['id']}"})
        if len(songs) >= max_songs:
            break
    return songs
