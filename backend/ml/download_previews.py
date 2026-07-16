"""
Engine 8 (step 1/2): resolve and download 30-second iTunes previews for the
801-song corpus, as input for the CLAP audio engine.

- Taylor songs reuse the preview URLs already resolved by the Whisper sync
  (ml_data/lyrics_sync.json); cross-artist songs are looked up via the free
  iTunes Search API (throttled — Apple caps ~20 searches/minute per IP).
- Resolved URLs are cached in ml_data/preview_urls.json (committed).
- Audio files land in ml_data/previews/ which is GITIGNORED — Apple preview
  clips must not be redistributed; only derived embeddings are committed.

Run once: cd backend && python -m ml.download_previews
"""
import hashlib
import json
import os
import time
import urllib.parse

import requests

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml_data')
PREVIEW_DIR = os.path.join(OUT_DIR, 'previews')
URL_CACHE = os.path.join(OUT_DIR, 'preview_urls.json')


def preview_filename(name: str, artist: str) -> str:
    """Stable per-song filename, keyed by (name, artist) not corpus position.

    Positional names (previews/{i}.m4a) misalign if the corpus grows between
    the download and embedding passes; a content hash keeps each song's clip
    pinned to that song regardless of index order.
    """
    key = f"{name}|||{artist}".lower()
    return hashlib.sha1(key.encode("utf-8")).hexdigest()[:16] + ".m4a"

SEARCH_SLEEP = 3.2   # ~18 searches/min, under Apple's informal cap
DOWNLOAD_SLEEP = 0.3


def itunes_preview_url(song: str, artist: str) -> str | None:
    """Look up a 30s preview URL via the iTunes Search API (no auth)."""
    term = urllib.parse.quote_plus(f"{song} {artist}")
    try:
        resp = requests.get(
            f"https://itunes.apple.com/search?term={term}&media=music&limit=5",
            timeout=10,
        )
        if resp.status_code != 200:
            return None
        results = resp.json().get('results', [])
        for r in results:  # prefer an artist match
            if artist.lower() in r.get('artistName', '').lower() and r.get('previewUrl'):
                return r['previewUrl']
        for r in results:
            if r.get('previewUrl'):
                return r['previewUrl']
    except Exception as e:
        print(f"  lookup failed for {song!r} / {artist!r}: {e}", flush=True)
    return None


def main():
    with open(os.path.join(OUT_DIR, 'lyrics_index.json')) as f:
        index = json.load(f)

    with open(os.path.join(OUT_DIR, 'lyrics_sync.json')) as f:
        sync = json.load(f)
    taylor_urls = {k: v.get('preview_url') for k, v in sync.items() if v.get('preview_url')}

    cache = {}
    if os.path.exists(URL_CACHE):
        with open(URL_CACHE) as f:
            cache = json.load(f)

    os.makedirs(PREVIEW_DIR, exist_ok=True)

    resolved, missing, looked_up = 0, 0, 0
    for i, e in enumerate(index):
        key = f"{e['name']}|||{e['artist']}".lower()
        if key in cache:
            resolved += cache[key] is not None
            missing += cache[key] is None
            continue
        url = None
        if e['artist'] == 'Taylor Swift':
            url = taylor_urls.get(e['name'].lower())
        if url is None:
            url = itunes_preview_url(e['name'], e['artist'])
            looked_up += 1
            time.sleep(SEARCH_SLEEP)
        cache[key] = url
        resolved += url is not None
        missing += url is None
        if looked_up and looked_up % 25 == 0:
            with open(URL_CACHE, 'w') as f:
                json.dump(cache, f, indent=1)
            print(f"  [{i+1}/{len(index)}] resolved={resolved} missing={missing}", flush=True)

    with open(URL_CACHE, 'w') as f:
        json.dump(cache, f, indent=1)
    print(f"URL resolution done: {resolved} resolved, {missing} missing of {len(index)}", flush=True)

    # Download clips (idempotent; files keyed by a stable song hash)
    downloaded, failed = 0, 0
    for i, e in enumerate(index):
        key = f"{e['name']}|||{e['artist']}".lower()
        url = cache.get(key)
        if not url:
            continue
        path = os.path.join(PREVIEW_DIR, preview_filename(e['name'], e['artist']))
        if os.path.exists(path) and os.path.getsize(path) > 10_000:
            downloaded += 1
            continue
        try:
            r = requests.get(url, timeout=20)
            if r.status_code == 200 and len(r.content) > 10_000:
                with open(path, 'wb') as f:
                    f.write(r.content)
                downloaded += 1
            else:
                failed += 1
        except Exception:
            failed += 1
        time.sleep(DOWNLOAD_SLEEP)
        if (i + 1) % 100 == 0:
            print(f"  downloaded {downloaded}, failed {failed} (through {i+1}/{len(index)})", flush=True)

    print(f"Previews on disk: {downloaded} ({failed} failed) -> ml_data/previews/", flush=True)


if __name__ == '__main__':
    main()
