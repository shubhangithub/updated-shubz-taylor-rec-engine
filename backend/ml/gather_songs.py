"""
Tokenless cross-artist data gathering (no Genius key required).

Discovery + previews via the iTunes Search API; lyrics via lyrics.ovh (free,
keyless). For each target we resolve the canonical track/artist through iTunes
(also giving a 30s preview URL), then fetch lyrics with punctuation/feat
fallbacks to maximize hit rate. Results are merged into
ml_data/cross_artist_lyrics.json and preview URLs cached in
ml_data/preview_urls.json. Resumable: re-running skips songs already gathered.

Two target sources:
  1. EXPLICIT: the editorial-bridge songs missing from the corpus (loaded from
     app.editorial), so 100% of hand-written connections become real.
  2. ARTISTS: a curated list of Taylor-connected acts (shared producers,
     collaborators, cited influences, genre neighbors) — top tracks each.

Run: cd backend && python -m ml.gather_songs
"""
import json
import os
import re
import sys
import time
import urllib.parse

import requests

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app')
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml_data')
CROSS_PATH = os.path.join(OUT_DIR, 'cross_artist_lyrics.json')
URL_CACHE = os.path.join(OUT_DIR, 'preview_urls.json')

ITUNES_SLEEP = 1.2   # be polite to the iTunes Search API
LYRICS_SLEEP = 0.6
TOP_TRACKS_PER_ARTIST = 10
MIN_LYRICS_CHARS = 120

# Non-lyric placeholders some source sites return (takedown notices, etc.).
# lyrics.ovh occasionally passes these through verbatim — reject them.
_JUNK_RE = re.compile(
    r"removid[ao]|titular|licenciamento|letras\.mus|solicita[çc][ãa]o|"
    r"lyrics? (not available|were removed|unavailable)|n[ãa]o (autoriz|dispon)|"
    r"working to obtain|copyright holder", re.I)


def is_real_lyrics(text: str) -> bool:
    """Reject placeholder/takedown text masquerading as lyrics."""
    return len(text) >= MIN_LYRICS_CHARS and not _JUNK_RE.search(text[:300])

# Curated artists with a real line to Taylor (producers/collaborators/influences/
# genre neighbors). Kept radial from Taylor so she stays the gravitational centre.
CURATED_ARTISTS = [
    # Shared producers — Jack Antonoff / Aaron Dessner orbit
    "St. Vincent", "Clairo", "Del Water Gap", "MUNA", "Local Natives",
    # Collaborators / tourmates / features
    "Ed Sheeran", "Chris Stapleton", "girl in red", "Conan Gray", "Fall Out Boy",
    # Country roots
    "The Chicks", "Shania Twain", "Faith Hill", "Maren Morris",
    # Folk / indie peers
    "Bright Eyes", "Sharon Van Etten", "Angel Olsen", "Soccer Mommy",
    "Snail Mail", "Faye Webster", "Weyes Blood", "beabadoobee",
    # Pop peers
    "Chappell Roan", "Selena Gomez", "Halsey", "Dua Lipa", "Gayle",
    # Alt / rock adjacencies
    "Wolf Alice", "Mumford & Sons",
]


def itunes_lookup(artist: str, title: str = None) -> list:
    """Return iTunes song results for an artist (optionally a specific title)."""
    term = f"{artist} {title}" if title else artist
    q = urllib.parse.quote_plus(term)
    try:
        r = requests.get(
            f"https://itunes.apple.com/search?term={q}&media=music&entity=song&limit=15",
            timeout=15,
        )
        if r.status_code != 200:
            return []
        return r.json().get("results", [])
    except Exception:
        return []


def _lyrics_variants(artist: str, title: str):
    """Title/artist forms to try against lyrics.ovh (it is punctuation-sensitive)."""
    def norm(s):
        return s.replace("’", "'").strip()
    t = norm(title)
    variants = [t]
    # strip (feat. …), (Bonus Track), (… Version), [ … ]
    stripped = re.sub(r"[\(\[].*?[\)\]]", "", t).strip()
    if stripped and stripped != t:
        variants.append(stripped)
    # drop a leading/trailing feat clause
    nofeat = re.sub(r"\s*(feat\.?|ft\.?|with)\s.*$", "", t, flags=re.I).strip()
    if nofeat and nofeat not in variants:
        variants.append(nofeat)
    # ampersand form
    if "&" in artist:
        pass
    a = norm(artist)
    return a, variants


def fetch_lyrics(artist: str, title: str) -> str:
    a, titles = _lyrics_variants(artist, title)
    artists = [a, a.replace(" + ", " and "), a.split(",")[0].strip()]
    for ar in dict.fromkeys(artists):
        for t in titles:
            try:
                url = f"https://api.lyrics.ovh/v1/{urllib.parse.quote(ar)}/{urllib.parse.quote(t)}"
                r = requests.get(url, timeout=15)
                if r.status_code == 200:
                    ly = (r.json().get("lyrics") or "").strip()
                    ly = re.sub(r"\r\n", "\n", ly)
                    if is_real_lyrics(ly):
                        return ly
            except Exception:
                pass
            time.sleep(LYRICS_SLEEP)
    return ""


def best_itunes(results: list, artist: str, title: str = None) -> dict:
    """Pick the best iTunes result matching artist (and title if given)."""
    def ok_artist(r):
        an = r.get("artistName", "").lower()
        return artist.lower() in an or an in artist.lower() or artist.split()[0].lower() in an
    cands = [r for r in results if ok_artist(r)] or results
    if title:
        tl = title.lower()
        exact = [r for r in cands if r.get("trackName", "").lower() == tl]
        if exact:
            return exact[0]
        partial = [r for r in cands if tl in r.get("trackName", "").lower() or r.get("trackName", "").lower() in tl]
        if partial:
            return partial[0]
    return cands[0] if cands else {}


def main():
    with open(CROSS_PATH) as f:
        cross = json.load(f)
    have = {(s.get("name", "").lower(), s.get("artist", "").lower()) for s in cross}
    have_names = {s.get("name", "").lower() for s in cross}
    # also skip anything already in the Taylor set
    taylor = json.load(open(os.path.join(DATA_DIR, "taylor_complete.json")))
    have_names |= {s.get("name", "").lower() for s in taylor}

    url_cache = json.load(open(URL_CACHE)) if os.path.exists(URL_CACHE) else {}

    # --- Build target list ---
    sys.path.insert(0, os.path.dirname(DATA_DIR))
    from app.editorial import EDITORIAL_BRIDGES
    explicit = []
    for bridges in EDITORIAL_BRIDGES.values():
        for b in bridges:
            s, a = b.get("song", ""), b.get("artist", "")
            if s and a and (s.lower(), a.lower()) not in have and s.lower() not in have_names:
                explicit.append((a, s))
    explicit = list(dict.fromkeys(explicit))
    print(f"Explicit missing-bridge targets: {len(explicit)}", flush=True)

    added, failed_lyrics, failed_all = 0, 0, 0

    def add_song(artist, title, itunes_res):
        nonlocal added, failed_lyrics
        m = best_itunes(itunes_res, artist, title)
        name = m.get("trackName", title)
        art = artist
        album = m.get("collectionName", "")
        preview = m.get("previewUrl")
        key = (name.lower(), art.lower())
        if key in have or name.lower() in have_names:
            return
        lyrics = fetch_lyrics(art, name)
        if not lyrics:
            lyrics = fetch_lyrics(artist, title)  # retry with original title
        if not lyrics:
            failed_lyrics += 1
            return
        cross.append({"name": name, "artist": art, "album": album, "lyrics": lyrics[:4000]})
        have.add(key); have_names.add(name.lower())
        if preview:
            url_cache[f"{name}|||{art}".lower()] = preview
        added += 1

    # 1) explicit bridge songs
    for i, (artist, title) in enumerate(explicit):
        res = itunes_lookup(artist, title)
        time.sleep(ITUNES_SLEEP)
        if not res:
            failed_all += 1
            continue
        add_song(artist, title, res)
        if (i + 1) % 10 == 0:
            print(f"  bridges [{i+1}/{len(explicit)}] added={added} no_lyrics={failed_lyrics}", flush=True)
            json.dump(cross, open(CROSS_PATH, "w"), ensure_ascii=False)
            json.dump(url_cache, open(URL_CACHE, "w"))

    # 2) curated artists — top tracks each
    for ai, artist in enumerate(CURATED_ARTISTS):
        res = itunes_lookup(artist)
        time.sleep(ITUNES_SLEEP)
        # unique top tracks by this artist
        seen_t = set(); picked = 0
        for r in res:
            if picked >= TOP_TRACKS_PER_ARTIST:
                break
            if artist.split()[0].lower() not in r.get("artistName", "").lower():
                continue
            tn = r.get("trackName", "")
            if not tn or tn.lower() in seen_t:
                continue
            seen_t.add(tn.lower())
            add_song(artist, tn, [r])
            picked += 1
        print(f"  artist [{ai+1}/{len(CURATED_ARTISTS)}] {artist}: corpus now {len(cross)} (added={added})", flush=True)
        json.dump(cross, open(CROSS_PATH, "w"), ensure_ascii=False)
        json.dump(url_cache, open(URL_CACHE, "w"))

    json.dump(cross, open(CROSS_PATH, "w"), ensure_ascii=False)
    json.dump(url_cache, open(URL_CACHE, "w"))
    print(f"\nDONE: added {added} songs, {failed_lyrics} had no lyrics, {failed_all} not on iTunes.", flush=True)
    print(f"cross_artist_lyrics.json now: {len(cross)} songs from "
          f"{len({s['artist'] for s in cross})} artists", flush=True)


if __name__ == "__main__":
    main()
