'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Music } from 'lucide-react';
import { ERA_THEMES } from '@/lib/eraThemes';

interface AudioPlayerProps {
  /** Currently active song info */
  song: {
    name: string;
    artist: string;
    album: string;
    image?: string | null;
    preview_url?: string | null;
  } | null;
  /** Whether the player is enabled/visible */
  enabled: boolean;
  onToggle: () => void;
  /** Callback when audio element is created — for Web Audio API integration */
  onAudioRef?: (audio: HTMLAudioElement) => void;
}

export default function AudioPlayer({ song, enabled, onToggle, onAudioRef }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const prevUrlRef = useRef<string | null>(null);
  // Remember the last song that had a preview for display purposes
  const [displaySong, setDisplaySong] = useState(song);
  if (song && song.preview_url && song !== displaySong) {
    setDisplaySong(song);
  }
  // Use displaySong for rendering, song for audio logic
  const shownSong = song?.preview_url ? song : displaySong;

  // When song changes, swap the audio source — but ONLY if new song has a preview
  useEffect(() => {
    const url = song?.preview_url;

    // Same URL — don't restart
    if (url === prevUrlRef.current) return;

    // If new song has NO preview, keep playing whatever is currently playing
    if (!url) return;

    // While muted, don't record this URL — otherwise unmuting would early-return
    // on the "same URL" check above and the song would never start.
    if (!enabled) {
      setIsPlaying(false);
      return;
    }

    // New song with a preview — commit and swap
    prevUrlRef.current = url;

    // Stop old audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current = null;
    }

    setProgress(0);
    setDuration(0);

    const audio = new Audio(url);
    audio.volume = 0.4;
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    // Expose audio element for Web Audio API beat detection
    if (onAudioRef) onAudioRef(audio);

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      setProgress(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      // Loop the preview
      audio.currentTime = 0;
      audio.play().catch(() => {});
    });

    // Auto-play when a new song is loaded
    audio.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
      setIsPlaying(false);
    });

    return () => {
      // Don't destroy audio on unmount — let it persist
    };
  }, [song?.preview_url, enabled]);

  // Handle enable/disable
  useEffect(() => {
    if (!enabled && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [enabled]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [isPlaying]);

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Get era color for progress bar
  const eraColor = shownSong?.album ? ERA_THEMES[shownSong.album]?.colors.primary : null;
  const color = eraColor || '#D4AF37';

  // Don't render if no song ever selected
  if (!shownSong) return null;

  return (
    <motion.div
      className="fixed bottom-20 left-6 right-6 md:left-auto md:right-6 z-50"
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.3 }}
    >
      <div className="glass rounded-xl overflow-hidden min-w-0 w-auto md:min-w-[240px] md:w-auto">
        {/* Main player row */}
        <div className="flex items-center gap-3 px-3 py-2.5">
          {/* Album art or icon */}
          {shownSong.image ? (
            <motion.div
              className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
              animate={isPlaying ? { scale: [1, 1.03, 1] } : {}}
              transition={isPlaying ? { duration: 2, repeat: Infinity } : {}}
            >
              <img src={shownSong.image} alt="" className="w-full h-full object-cover" />
            </motion.div>
          ) : (
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
              <Music size={16} style={{ color }} />
            </div>
          )}

          {/* Song info */}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-white/80 truncate font-medium">{shownSong.name}</p>
            <p className="text-[10px] text-white/30 truncate">{shownSong.artist}</p>
          </div>

          {/* Play/pause */}
          {audioRef.current ? (
            <button
              onClick={togglePlayPause}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-white/10"
              style={{ color }}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
          ) : (
            <span className="text-[9px] text-white/20 flex-shrink-0 px-1">No preview</span>
          )}

          {/* Mini spectrum */}
          {isPlaying && (
            <div className="flex items-end gap-[2px] h-4 flex-shrink-0">
              {[0, 1, 2, 3, 4].map(i => (
                <motion.div
                  key={i}
                  className="w-[3px] rounded-full"
                  style={{ background: color }}
                  animate={{ height: ['4px', `${8 + Math.random() * 8}px`, '4px', `${6 + Math.random() * 10}px`, '4px'] }}
                  transition={{ duration: 0.8 + i * 0.1, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 }}
                />
              ))}
            </div>
          )}

          {/* Mute/enable toggle */}
          <button
            onClick={onToggle}
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
            title={enabled ? 'Mute' : 'Unmute'}
          >
            {enabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
        </div>

        {/* Progress bar */}
        {duration > 0 && (
          <div className="px-3 pb-2 flex items-center gap-2">
            <span className="text-[9px] text-white/20 font-mono w-7">{formatTime(progress)}</span>
            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: color, width: `${(progress / duration) * 100}%`, boxShadow: `0 0 8px ${color}60` }}
              />
            </div>
            <span className="text-[9px] text-white/20 font-mono w-7">{formatTime(duration)}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
