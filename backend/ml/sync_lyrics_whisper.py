"""
Sync lyrics to iTunes 30-second previews using OpenAI Whisper.

For each Taylor Swift song:
1. Get the iTunes preview URL
2. Download the 30-second MP3
3. Run Whisper to get timestamped transcript
4. Align transcript words against known lyrics to find starting line + timing
5. Save as JSON: {song_name: {start_line: N, line_timings: [{line, start_time, end_time}]}}

Run: cd backend && python -m ml.sync_lyrics_whisper
"""
import json
import os
import sys
import tempfile
import requests
import re

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app')
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml_data')


def get_itunes_preview_url(song_name: str, artist: str = "Taylor Swift") -> str:
    """Get iTunes preview URL for a song."""
    query = f"{song_name} {artist}".replace(" ", "+")
    try:
        resp = requests.get(
            f"https://itunes.apple.com/search?term={query}&media=music&limit=3",
            timeout=10,
        )
        if resp.status_code != 200:
            return ""
        data = resp.json()
        for r in data.get("results", []):
            if artist.lower() in r.get("artistName", "").lower():
                return r.get("previewUrl", "")
        if data.get("results"):
            return data["results"][0].get("previewUrl", "")
    except:
        pass
    return ""


def download_preview(url: str, path: str) -> bool:
    """Download an audio preview to a file."""
    try:
        resp = requests.get(url, timeout=30)
        if resp.status_code == 200:
            with open(path, "wb") as f:
                f.write(resp.content)
            return True
    except:
        pass
    return False


def transcribe_audio(audio_path: str, model) -> list:
    """Transcribe audio and return word-level timestamps."""
    result = model.transcribe(
        audio_path,
        language="en",
        word_timestamps=True,
        fp16=False,  # CPU mode
    )

    words = []
    for segment in result.get("segments", []):
        for word_info in segment.get("words", []):
            words.append({
                "word": word_info["word"].strip().lower(),
                "start": round(word_info["start"], 2),
                "end": round(word_info["end"], 2),
            })
    return words


def clean_word(w: str) -> str:
    """Normalize a word for matching."""
    return re.sub(r'[^a-z0-9]', '', w.lower())


def align_lyrics(whisper_words: list, lyrics: str) -> dict:
    """
    Align Whisper transcript against known lyrics.

    Strategy: Whisper's word recognition is imperfect (mishears words), so we
    DON'T try to match word-by-word. Instead:
    1. Use Whisper to get the TOTAL audio duration and word density
    2. Find which lyric line the preview likely starts at (fuzzy word matching)
    3. Distribute line timings proportionally by word count

    Returns: {start_line, line_timings: [{line, start_time, end_time}]}
    """
    # Parse lyrics into clean lines
    # Lyrics may be one giant string with no newlines — split smartly
    raw_lines = lyrics.split('\n')
    lyric_lines = []
    for raw_line in raw_lines:
        raw_line = raw_line.strip()
        if not raw_line or raw_line.startswith('['):
            continue
        # Strip section markers like [Verse 1], [Chorus], etc.
        raw_line = re.sub(r'\[.*?\]', '', raw_line).strip()
        if not raw_line:
            continue
        # If the line is very long (>80 chars), split on sentence boundaries
        if len(raw_line) > 80:
            # Insert newline between joined lines (lowercase immediately followed by uppercase)
            spaced = re.sub(r'([a-z,;!?\"\'])([A-Z])', r'\1\n\2', raw_line)
            parts = [p.strip() for p in spaced.split('\n')]
            for part in parts:
                part = part.strip()
                if part and len(part) > 3:
                    lyric_lines.append(part)
        else:
            lyric_lines.append(raw_line)

    if not whisper_words or not lyric_lines:
        return {"start_line": 0, "line_timings": []}

    # Get audio time range from Whisper
    first_word_time = whisper_words[0]["start"] if whisper_words else 0
    last_word_time = whisper_words[-1]["end"] if whisper_words else 30
    audio_duration = last_word_time - first_word_time
    whisper_word_count = len(whisper_words)

    # Build word sequence from lyrics for fuzzy matching
    lyric_words_flat = []
    for i, line in enumerate(lyric_lines):
        for word in line.split():
            lyric_words_flat.append({"word": clean_word(word), "line_idx": i})

    whisper_clean = [clean_word(w["word"]) for w in whisper_words if clean_word(w["word"])]

    # Find best starting line: slide a window of whisper words along lyric words
    # Use fuzzy matching — count matches in windows of varying offsets
    best_score = 0
    best_offset = 0
    check_words = whisper_clean[:30]  # Use first 30 whisper words

    for offset in range(len(lyric_words_flat)):
        score = 0
        # Check each whisper word against nearby lyric words (allow ±2 position drift)
        for i, ww in enumerate(check_words):
            for drift in range(-2, 3):
                pos = offset + i + drift
                if 0 <= pos < len(lyric_words_flat):
                    if ww == lyric_words_flat[pos]["word"]:
                        score += 1
                        break
        if score > best_score:
            best_score = score
            best_offset = offset

    start_line = lyric_words_flat[best_offset]["line_idx"] if best_offset < len(lyric_words_flat) else 0

    # Estimate how many lines fit in 30 seconds
    # Use word count proportional timing
    lines_from_start = lyric_lines[start_line:]
    total_words_in_range = sum(len(line.split()) for line in lines_from_start)

    if total_words_in_range == 0:
        return {"start_line": start_line, "alignment_score": best_score, "line_timings": []}

    # Estimate words per second from Whisper data
    words_per_second = whisper_word_count / max(audio_duration, 1)

    # How many lyrics words fit in ~30 seconds
    words_in_preview = int(words_per_second * 30)

    # Build line timings proportionally
    line_timings = []
    current_time = first_word_time
    words_so_far = 0

    for line in lines_from_start:
        word_count = len(line.split())
        if word_count == 0:
            continue

        # Time for this line proportional to its word count
        line_duration = (word_count / max(total_words_in_range, 1)) * audio_duration

        # Cap: don't let any single line take more than 6 seconds
        line_duration = min(line_duration, 6.0)

        line_timings.append({
            "line": line,
            "start_time": round(current_time, 2),
            "end_time": round(current_time + line_duration, 2),
        })

        current_time += line_duration
        words_so_far += word_count

        # Stop if we've exceeded the preview duration
        if current_time > last_word_time + 2:
            break

    return {
        "start_line": start_line,
        "alignment_score": best_score,
        "line_timings": line_timings,
    }


def main():
    import whisper

    # Load song data
    with open(os.path.join(DATA_DIR, "taylor_complete.json"), "r") as f:
        songs = json.load(f)

    # Filter songs with lyrics
    songs_with_lyrics = [s for s in songs if s.get("lyrics") and len(s["lyrics"]) > 50]
    print(f"Songs with lyrics: {len(songs_with_lyrics)}")

    # Load existing results (for resume)
    out_path = os.path.join(OUT_DIR, "lyrics_sync.json")
    if os.path.exists(out_path):
        with open(out_path) as f:
            results = json.load(f)
        print(f"Existing sync data: {len(results)} songs")
    else:
        results = {}

    # Load Whisper model (use "base" for speed — "small" is more accurate but slower)
    print("Loading Whisper model (base)...", flush=True)
    model = whisper.load_model("base")
    print("Model loaded!", flush=True)

    tmpdir = tempfile.mkdtemp()

    for i, song in enumerate(songs_with_lyrics):
        name = song.get("name", "")
        if not name:
            continue

        # Skip if already processed
        if name.lower() in results:
            continue

        print(f"[{i+1}/{len(songs_with_lyrics)}] {name}...", end=" ", flush=True)

        # Get preview URL
        preview_url = get_itunes_preview_url(name)
        if not preview_url:
            print("no preview", flush=True)
            continue

        # Download preview
        audio_path = os.path.join(tmpdir, f"preview_{i}.m4a")
        if not download_preview(preview_url, audio_path):
            print("download failed", flush=True)
            continue

        # Transcribe
        try:
            whisper_words = transcribe_audio(audio_path, model)
            if not whisper_words:
                print("no words detected", flush=True)
                continue

            # Align
            alignment = align_lyrics(whisper_words, song["lyrics"])
            alignment["preview_url"] = preview_url
            results[name.lower()] = alignment

            print(f"start_line={alignment['start_line']}, score={alignment.get('alignment_score', 0)}, {len(alignment['line_timings'])} timed lines", flush=True)
        except Exception as e:
            print(f"error: {e}", flush=True)

        # Clean up audio file
        try:
            os.remove(audio_path)
        except:
            pass

        # Save after each song (resume-safe)
        with open(out_path, "w") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\nDone! Synced {len(results)} songs")
    print(f"Saved to {out_path}")


if __name__ == "__main__":
    main()
