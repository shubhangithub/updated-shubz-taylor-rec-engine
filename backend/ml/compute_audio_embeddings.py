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


def main():
    import torch
    from transformers import ClapModel, ClapProcessor

    with open(os.path.join(OUT_DIR, 'lyrics_index.json')) as f:
        index = json.load(f)
    N = len(index)

    print(f"Loading {MODEL_ID}...", flush=True)
    model = ClapModel.from_pretrained(MODEL_ID)
    processor = ClapProcessor.from_pretrained(MODEL_ID)
    model.eval()

    device = 'cpu'
    if torch.backends.mps.is_available():
        try:  # HTSAT mostly runs on MPS; fall back if any op is unsupported
            model.to('mps')
            device = 'mps'
        except Exception:
            model.to('cpu')
    print(f"Device: {device}", flush=True)

    embeddings = np.zeros((N, 512), dtype=np.float32)
    embedded, skipped = 0, 0
    win = WINDOW_SECONDS * SAMPLE_RATE

    from ml.download_previews import preview_filename
    for i, e in enumerate(index):
        path = os.path.join(PREVIEW_DIR, preview_filename(e['name'], e['artist']))
        # Back-compat: fall back to the old positional filename if present
        if not os.path.exists(path):
            legacy = os.path.join(PREVIEW_DIR, f"{i}.m4a")
            path = legacy if os.path.exists(legacy) else path
        if not os.path.exists(path):
            skipped += 1
            continue
        audio = decode_preview(path)
        if audio is None:
            skipped += 1
            continue
        windows = [audio[s:s + win] for s in range(0, len(audio), win)]
        windows = [w for w in windows if len(w) > SAMPLE_RATE]
        try:
            inputs = processor(audios=windows, sampling_rate=SAMPLE_RATE, return_tensors='pt')
            inputs = {k: v.to(device) for k, v in inputs.items()}
            with torch.no_grad():
                feats = model.get_audio_features(**inputs)  # (n_windows, 512)
            vec = feats.mean(dim=0).cpu().numpy()
        except Exception as ex:
            if device == 'mps':  # one-shot CPU fallback
                model.to('cpu'); device = 'cpu'
                inputs = processor(audios=windows, sampling_rate=SAMPLE_RATE, return_tensors='pt')
                with torch.no_grad():
                    feats = model.get_audio_features(**inputs)
                vec = feats.mean(dim=0).cpu().numpy()
            else:
                print(f"  embed failed for {e['name']!r}: {ex}", flush=True)
                skipped += 1
                continue
        norm = np.linalg.norm(vec)
        if norm > 0:
            embeddings[i] = vec / norm
            embedded += 1
        if (i + 1) % 50 == 0:
            print(f"  [{i+1}/{N}] embedded={embedded} skipped={skipped}", flush=True)

    np.save(os.path.join(OUT_DIR, 'audio_embeddings.npy'), embeddings)
    audio_index = [
        {'name': e['name'], 'artist': e['artist'], 'has_audio': bool(embeddings[i].any())}
        for i, e in enumerate(index)
    ]
    with open(os.path.join(OUT_DIR, 'audio_index.json'), 'w') as f:
        json.dump(audio_index, f)
    print(f"Audio embeddings: {embedded} embedded, {skipped} without audio -> audio_embeddings.npy", flush=True)

    # Mood prompts through the text tower (joint space -> cosine against audio)
    moods = list(MOOD_PROMPTS)
    text_inputs = processor(text=[MOOD_PROMPTS[m] for m in moods], return_tensors='pt', padding=True)
    text_inputs = {k: v.to(device) for k, v in text_inputs.items()}
    import torch as _t
    with _t.no_grad():
        tfeats = model.get_text_features(**text_inputs).cpu().numpy()
    tfeats = tfeats / np.clip(np.linalg.norm(tfeats, axis=1, keepdims=True), 1e-8, None)
    np.save(os.path.join(OUT_DIR, 'mood_text_embeddings.npy'), tfeats.astype(np.float32))
    with open(os.path.join(OUT_DIR, 'mood_phrases.json'), 'w') as f:
        json.dump({'moods': moods, 'prompts': MOOD_PROMPTS}, f, indent=1)
    print(f"Mood text embeddings: {tfeats.shape} for {moods}", flush=True)


if __name__ == '__main__':
    main()
