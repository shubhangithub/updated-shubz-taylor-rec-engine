'use client';

import { useRef, useEffect, useCallback, useState } from 'react';

interface BeatState {
  /** 0-1 bass amplitude, smoothed. 0 when not playing. */
  beatIntensity: number;
  /** Whether audio is currently playing */
  isPlaying: boolean;
}

/**
 * Hook that connects to an HTMLAudioElement via Web Audio API AnalyserNode
 * and returns a smoothed bass intensity (0-1) suitable for driving visual pulses.
 */
export function useBeat(): BeatState & {
  connectAudio: (audio: HTMLAudioElement) => void;
} {
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const connectedElementRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);
  const smoothedRef = useRef(0);
  const lastEmittedRef = useRef({ beatIntensity: 0, isPlaying: false });

  const [state, setState] = useState<BeatState>({
    beatIntensity: 0,
    isPlaying: false,
  });

  // Only re-render on a perceptible change — the raw rAF loop ticks ~60x/s,
  // and this hook lives at the app root, so unconditional setState would
  // re-render the whole tree every frame while audio plays.
  const emit = useCallback((next: BeatState) => {
    const prev = lastEmittedRef.current;
    if (prev.isPlaying === next.isPlaying &&
        Math.abs(prev.beatIntensity - next.beatIntensity) < 0.01) {
      return;
    }
    lastEmittedRef.current = next;
    setState(next);
  }, []);

  const connectAudio = useCallback((audio: HTMLAudioElement) => {
    // Already connected to this exact element
    if (connectedElementRef.current === audio) return;

    // Create AudioContext on first use (needs user gesture — fine because
    // AudioPlayer only creates Audio elements after user interaction)
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    const ctx = ctxRef.current;

    // Resume if suspended (autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Create analyser if needed
    if (!analyserRef.current) {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64; // Small FFT — we only need low bins
      analyser.smoothingTimeConstant = 0.6;
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
    }

    // Disconnect old source
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch {}
    }

    // Connect new audio element
    // createMediaElementSource can only be called once per element,
    // so we track which element is connected
    try {
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyserRef.current!);
      sourceRef.current = source;
      connectedElementRef.current = audio;
    } catch {
      // If this element was already connected elsewhere, silently fail
    }
  }, []);

  // Animation loop — reads analyser data every frame
  useEffect(() => {
    const dataArray = new Uint8Array(32); // Only need first 32 bins

    const tick = () => {
      const analyser = analyserRef.current;
      const audio = connectedElementRef.current;

      if (analyser && audio) {
        analyser.getByteFrequencyData(dataArray);

        // Average the low-frequency bins (0-5) for bass/heartbeat feel
        let bassSum = 0;
        const bassCount = 6;
        for (let i = 0; i < bassCount; i++) {
          bassSum += dataArray[i];
        }
        const rawBass = bassSum / (bassCount * 255); // Normalize to 0-1

        const playing = !audio.paused && !audio.ended && audio.currentTime > 0;

        // Smooth with lerp — rise fast, fall slower for heartbeat feel
        const target = playing ? rawBass : 0;
        const speed = target > smoothedRef.current ? 0.3 : 0.08;
        smoothedRef.current += (target - smoothedRef.current) * speed;

        // Clamp tiny values to 0
        if (smoothedRef.current < 0.005) smoothedRef.current = 0;

        emit({
          beatIntensity: smoothedRef.current,
          isPlaying: playing,
        });
      } else {
        // No audio connected — decay to 0
        if (smoothedRef.current > 0) {
          smoothedRef.current *= 0.92;
          if (smoothedRef.current < 0.005) smoothedRef.current = 0;
          emit({ beatIntensity: smoothedRef.current, isPlaying: false });
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch {}
      }
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close().catch(() => {});
      }
    };
  }, []);

  return { ...state, connectAudio };
}
