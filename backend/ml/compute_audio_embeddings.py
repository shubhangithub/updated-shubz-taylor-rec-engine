"""
Engine 8 (step 2/2): CLAP audio embeddings over the downloaded previews.

Model: laion/larger_clap_music (Wu et al., "Large-scale Contrastive
Language-Audio Pretraining with Feature Fusion and Keyword-to-Caption
Augmentation", ICASSP 2023, arXiv:2211.06687; Apache 2.0). HTSAT audio tower
+ RoBERTa text tower sharing a joint 512-d space — so audio embeddings can be
scored against text ("mood") prompts with plain cosine at runtime.

Each 30s preview is decoded to 48kHz mono via the bundled imageio-ffmpeg
binary, split into 10s windows, embedded with get_audio_features, mean-pooled
and L2-normalized. Songs without a preview get a zero row (runtime skips them).

Also embeds one text prompt per MoodRooms mood with the text tower, enabling
the sound-mood search endpoint without any model at runtime.

Outputs: ml_data/audio_embeddings.npy (N x 512), audio_index.json,
         ml_data/mood_text_embeddings.npy (M x 512), mood_phrases.json

Run once (after ml.download_previews): cd backend && python -m ml.compute_audio_embeddings
"""
import json
import os
import subprocess

import numpy as np

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml_data')
PREVIEW_DIR = os.path.join(OUT_DIR, 'previews')

MODEL_ID = 'laion/larger_clap_music'
SAMPLE_RATE = 48_000
WINDOW_SECONDS = 10

# One audio-describing prompt per MoodRooms mood (frontend/src/components/MoodRooms.tsx)
MOOD_PROMPTS = {
    'heartbreak': 'a devastated heartbroken ballad, aching vocals over sparse piano',
    'euphoria': 'a euphoric bright dance-pop anthem, soaring synths and driving beat',
    'melancholy': 'a slow melancholic wistful song, soft muted instrumentation',
    'rage': 'an angry aggressive track, distorted guitars and pounding drums',
    'nostalgia': 'a warm nostalgic acoustic song that sounds like an old memory',
    'romantic': 'a tender romantic love song, intimate vocals and gentle strings',
    'empowerment': 'a confident empowering anthem with a strutting beat and bold vocals',
    'introspective': 'a quiet introspective confessional song, close-mic vocals and space',
}


def decode_preview(path: str) -> np.ndarray | None:
    """Decode an audio file to 48kHz mono float32 PCM via the bundled ffmpeg."""
    import imageio_ffmpeg
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    try:
        out = subprocess.run(
            [ffmpeg, '-v', 'error', '-i', path,
             '-f', 'f32le', '-ac', '1', '-ar', str(SAMPLE_RATE), '-'],
            capture_output=True, timeout=60, check=True,
        ).stdout
    except (subprocess.SubprocessError, OSError):
        return None
    audio = np.frombuffer(out, dtype=np.float32)
    return audio if len(audio) > SAMPLE_RATE else None  # require >1s


def _ensure_preview(name, artist, url_cache):
    """Return a local preview path for a song, downloading on demand. None if unavailable."""
    import requests
    from ml.download_previews import preview_filename
    path = os.path.join(PREVIEW_DIR, preview_filename(name, artist))
    if os.path.exists(path) and os.path.getsize(path) > 10_000:
        return path
    url = url_cache.get(f"{name}|||{artist}".lower())
    if not url:
        return None
    try:
        r = requests.get(url, timeout=20)
        if r.status_code == 200 and len(r.content) > 10_000:
            os.makedirs(PREVIEW_DIR, exist_ok=True)
            with open(path, 'wb') as f:
                f.write(r.content)
            return path
    except Exception:
        pass
    return None


def main():
    import torch
    from transformers import ClapModel, ClapProcessor
    from ml.embed_utils import load_embedding_cache

    with open(os.path.join(OUT_DIR, 'lyrics_index.json')) as f:
        index = json.load(f)
    N = len(index)

    # Incremental: reuse existing CLAP embeddings, embed only NEW songs. This is
    # what makes the weekly CI run affordable — the model download + full
    # re-embed of ~1,000 songs was the timeout culprit.
    cache = load_embedding_cache(os.path.join(OUT_DIR, 'audio_embeddings.npy'),
                                 os.path.join(OUT_DIR, 'audio_index.json'), expected_dim=512)
    def key(e): return (e['name'].lower(), e.get('artist', 'Taylor Swift').lower())
    new_songs = [e for e in index if key(e) not in cache]
    mood_path = os.path.join(OUT_DIR, 'mood_text_embeddings.npy')
    need_moods = not os.path.exists(mood_path)
    print(f"CLAP: {len(index)} songs, {len(new_songs)} new to embed, {len(cache)} cached; moods_needed={need_moods}", flush=True)

    url_cache = {}
    up = os.path.join(OUT_DIR, 'preview_urls.json')
    if os.path.exists(up):
        url_cache = json.load(open(up))

    embeddings = np.zeros((N, 512), dtype=np.float32)
    for i, e in enumerate(index):  # fill from cache
        if key(e) in cache:
            embeddings[i] = cache[key(e)]

    model = processor = device = None
    win = WINDOW_SECONDS * SAMPLE_RATE
    DUMMY_TEXT = "music"  # forward() needs a text input; we read only audio_embeds
    embedded = 0

    if new_songs or need_moods:
        print(f"Loading {MODEL_ID}...", flush=True)
        model = ClapModel.from_pretrained(MODEL_ID)
        processor = ClapProcessor.from_pretrained(MODEL_ID)
        model.eval()
        device = 'cpu'
        if torch.backends.mps.is_available():
            try:
                model.to('mps'); device = 'mps'
            except Exception:
                model.to('cpu')
        print(f"Device: {device}", flush=True)

    pos = {key(e): i for i, e in enumerate(index)}
    for j, e in enumerate(new_songs):
        path = _ensure_preview(e['name'], e.get('artist', 'Taylor Swift'), url_cache)
        if not path:
            continue
        audio = decode_preview(path)
        if audio is None:
            continue
        windows = [audio[s:s + win] for s in range(0, len(audio), win)]
        windows = [w for w in windows if len(w) > SAMPLE_RATE]
        try:
            inputs = processor(text=[DUMMY_TEXT], audio=windows,
                               sampling_rate=SAMPLE_RATE, return_tensors='pt', padding=True)
            inputs = {k: v.to(device) for k, v in inputs.items()}
            with torch.no_grad():
                out = model(**inputs)
            vec = out.audio_embeds.mean(dim=0).cpu().numpy()
        except Exception as ex:
            print(f"  embed failed for {e['name']!r}: {ex}", flush=True)
            continue
        norm = np.linalg.norm(vec)
        if norm > 0:
            embeddings[pos[key(e)]] = vec / norm
            embedded += 1
        if (j + 1) % 25 == 0:
            print(f"  new [{j+1}/{len(new_songs)}] embedded={embedded}", flush=True)

    np.save(os.path.join(OUT_DIR, 'audio_embeddings.npy'), embeddings)
    audio_index = [
        {'name': e['name'], 'artist': e['artist'], 'has_audio': bool(embeddings[i].any())}
        for i, e in enumerate(index)
    ]
    with open(os.path.join(OUT_DIR, 'audio_index.json'), 'w') as f:
        json.dump(audio_index, f)
    total_audio = sum(1 for i in range(N) if embeddings[i].any())
    print(f"Audio embeddings: {embedded} newly embedded, {total_audio}/{N} with audio -> audio_embeddings.npy", flush=True)

    if not need_moods:
        print("Mood embeddings unchanged (already present).", flush=True)
        return

    # Mood prompts into the SAME joint space via forward() (one throwaway audio
    # window to satisfy the joint forward; we read only text_embeds).
    moods = list(MOOD_PROMPTS)
    dummy_audio = [np.zeros(WINDOW_SECONDS * SAMPLE_RATE, dtype=np.float32)]
    text_inputs = processor(text=[MOOD_PROMPTS[m] for m in moods], audio=dummy_audio,
                            sampling_rate=SAMPLE_RATE, return_tensors='pt', padding=True)
    text_inputs = {k: v.to(device) for k, v in text_inputs.items()}
    with torch.no_grad():
        tfeats = model(**text_inputs).text_embeds.cpu().numpy()
    tfeats = tfeats / np.clip(np.linalg.norm(tfeats, axis=1, keepdims=True), 1e-8, None)
    np.save(os.path.join(OUT_DIR, 'mood_text_embeddings.npy'), tfeats.astype(np.float32))
    with open(os.path.join(OUT_DIR, 'mood_phrases.json'), 'w') as f:
        json.dump({'moods': moods, 'prompts': MOOD_PROMPTS}, f, indent=1)
    print(f"Mood text embeddings: {tfeats.shape} for {moods}", flush=True)


if __name__ == '__main__':
    main()
