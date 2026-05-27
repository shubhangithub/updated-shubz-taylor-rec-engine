'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Billboard, Text, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { SongWithAtmosphere, Song, EditorialBridge } from '@/lib/types';
import { ERA_THEMES, getEraFontClass } from '@/lib/eraThemes';
import { ExternalLink, Play, Pause, ChevronRight, Sparkles, BookOpen, Music, X } from 'lucide-react';

// Particle system that responds to atmosphere
function AtmosphereParticles({ atmosphere, colors }: { atmosphere: string; colors: string[] }) {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 400;

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;

      // Velocity based on atmosphere
      const speed = atmosphere === 'storm' ? 0.02 : atmosphere === 'neon' ? 0.015 : 0.005;
      vel[i * 3] = (Math.random() - 0.5) * speed;
      vel[i * 3 + 1] = atmosphere === 'rain' ? -0.02 : (Math.random() - 0.5) * speed;
      vel[i * 3 + 2] = (Math.random() - 0.5) * speed;
    }
    return [pos, vel];
  }, [atmosphere, count]);

  useFrame(() => {
    if (!particlesRef.current) return;
    const posArray = particlesRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < count; i++) {
      posArray[i * 3] += velocities[i * 3];
      posArray[i * 3 + 1] += velocities[i * 3 + 1];
      posArray[i * 3 + 2] += velocities[i * 3 + 2];

      // Wrap around
      if (Math.abs(posArray[i * 3]) > 10) posArray[i * 3] *= -0.9;
      if (Math.abs(posArray[i * 3 + 1]) > 10) posArray[i * 3 + 1] *= -0.9;
      if (Math.abs(posArray[i * 3 + 2]) > 10) posArray[i * 3 + 2] *= -0.9;
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  const color = new THREE.Color(colors[0] || '#D4AF37');

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={atmosphere === 'rain' ? 0.04 : atmosphere === 'storm' ? 0.1 : 0.08}
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Orbiting recommendation planet
function RecommendationOrbit({
  song,
  index,
  total,
  isTaylor,
  onClick,
}: {
  song: Song;
  index: number;
  total: number;
  isTaylor: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const angle = (index / total) * Math.PI * 2;
  const radius = isTaylor ? 3 : 5;
  const speed = 0.2 + index * 0.05;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime * speed + angle;
    meshRef.current.position.x = Math.cos(t) * radius;
    meshRef.current.position.z = Math.sin(t) * radius;
    meshRef.current.position.y = Math.sin(t * 0.5) * 0.5;
  });

  return (
    <mesh ref={meshRef} onClick={onClick}>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshBasicMaterial color={isTaylor ? '#D4AF37' : '#5B9BD5'} />
      <Billboard follow position={[0, 0.35, 0]}>
        <Text fontSize={0.12} color="white" anchorX="center" outlineWidth={0.01} outlineColor="black">
          {song.name.length > 20 ? song.name.slice(0, 20) + '...' : song.name}
        </Text>
        <Text fontSize={0.08} color="#888" anchorX="center" position={[0, -0.15, 0]}>
          {song.artist}
        </Text>
      </Billboard>
    </mesh>
  );
}

// 3D Scene for the song world
function SongScene({ song, recommendations, onSongSelect, hidePlanets }: { song: SongWithAtmosphere; recommendations: Song[]; onSongSelect: (id: string) => void; hidePlanets?: boolean }) {
  const atmosphere = song.atmosphere;
  const theme = ERA_THEMES[song.album] || ERA_THEMES['Midnights'];
  // Always use era theme colors for accent, NEVER for background
  const accentColor = theme?.colors.primary || '#D4AF37';
  const secondaryColor = theme?.colors.secondary || '#888';
  // Background is ALWAYS dark — derived from era bg or pure dark
  const bgColor = theme?.colors.bg || '#050510';

  return (
    <>
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[bgColor, 8, 25]} />
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 0, 0]} intensity={0.8} color={accentColor} distance={12} />

      <AtmosphereParticles
        atmosphere={atmosphere?.atmosphere_type || 'midnight'}
        colors={[accentColor, secondaryColor]}
      />

      {/* Central song glow */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.2} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.04} />
      </mesh>

      {/* Orbiting recommendations — hidden on mobile */}
      {!hidePlanets && recommendations.slice(0, 8).map((rec, i) => (
        <RecommendationOrbit
          key={rec.id || i}
          song={rec}
          index={i}
          total={Math.min(recommendations.length, 8)}
          isTaylor={rec.artist === 'Taylor Swift'}
          onClick={() => rec.id ? onSongSelect(rec.id) : undefined}
        />
      ))}

      {/* Camera controls */}
      <SongOrbitControls />
    </>
  );
}

function SongOrbitControls() {
  return (
    <OrbitControls
      enablePan={false}
      enableZoom
      enableRotate
      autoRotate
      autoRotateSpeed={0.5}
      minDistance={3}
      maxDistance={12}
    />
  );
}

// Audio preview player
function AudioPreview({ url, isPlaying, onToggle }: { url: string | null; isPlaying: boolean; onToggle: () => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!url) return;
    audioRef.current = new Audio(url);
    audioRef.current.volume = 0.3;

    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [url]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [isPlaying]);

  if (!url) return null;

  return (
    <button
      onClick={onToggle}
      className="rounded-full p-3 transition-all duration-300 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.08] text-white/70 hover:text-white"
    >
      {isPlaying ? <Pause size={18} /> : <Play size={18} />}
    </button>
  );
}

// Feature display — radar + bars with tooltips
const FEATURE_TOOLTIPS: Record<string, string> = {
  danceability: 'How suitable for dancing — based on tempo, rhythm stability, beat strength. 0 = least, 1 = most danceable.',
  energy: 'Intensity and activity. Energetic tracks feel fast, loud, noisy. Death metal = high, Bach prelude = low.',
  valence: 'Musical positiveness. High = happy, cheerful, euphoric. Low = sad, angry, depressed.',
  acousticness: 'Confidence the track is acoustic. 1.0 = very likely acoustic, 0.0 = very likely electronic.',
  speechiness: 'Spoken words detected. >0.66 = spoken word. 0.33-0.66 = music + speech (rap). <0.33 = mostly music.',
  liveness: 'Audience presence detected. >0.8 = strong likelihood of live performance.',
  instrumentalness: 'Predicts if track has no vocals. Higher = more instrumental. Rap/vocals = near 0.',
};

function FeatureRadar({ features }: { features: Record<string, number> }) {
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  const bars = [
    { key: 'danceability', label: 'Danceability', color: '#D4AF37' },
    { key: 'energy', label: 'Energy', color: '#E53E3E' },
    { key: 'valence', label: 'Happiness', color: '#48BB78' },
    { key: 'acousticness', label: 'Acoustic', color: '#4299E1' },
    { key: 'speechiness', label: 'Speechiness', color: '#ED8936' },
    { key: 'liveness', label: 'Liveness', color: '#9F7AEA' },
    { key: 'instrumentalness', label: 'Instrumental', color: '#38B2AC' },
  ];

  return (
    <div className="space-y-2 relative">
      <p className="text-xs text-white/30 tracking-[0.15em] uppercase mb-2">Audio DNA</p>
      {bars.map((b) => {
        const val = features[b.key] || 0;
        return (
          <div key={b.key} className="flex items-center gap-2 group relative">
            <span
              className="text-[10px] text-white/40 w-20 text-right truncate cursor-help hover:text-white/60 transition-colors"
              onMouseEnter={() => setHoveredFeature(b.key)}
              onMouseLeave={() => setHoveredFeature(null)}
            >
              {b.label}
            </span>
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: b.color, boxShadow: `0 0 ${Math.round(val * 15)}px ${b.color}40` }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(val * 100, 100)}%` }}
                transition={{ duration: 0.8, delay: 0.5 }}
              />
            </div>
            <span className="text-[10px] text-white/30 w-8 font-mono">{Math.round(val * 100)}%</span>
          </div>
        );
      })}
      {features.tempo && (
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-white/40 w-20 text-right">Tempo</span>
          <span className="text-[10px] text-white/50 font-mono">{Math.round(features.tempo)} BPM</span>
        </div>
      )}

      {/* Feature tooltip */}
      <AnimatePresence>
        {hoveredFeature && FEATURE_TOOLTIPS[hoveredFeature] && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute -top-16 left-0 right-0 glass rounded-lg p-2.5 z-20"
          >
            <p className="text-[10px] text-white/50 leading-relaxed">{FEATURE_TOOLTIPS[hoveredFeature]}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Generate an SVG sine wave path for curved text
function generateWavePath(width: number, amplitude: number, frequency: number, centerY: number): string {
  const points: string[] = [];
  const steps = 80;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    const y = centerY + Math.sin((i / steps) * Math.PI * 2 * frequency) * amplitude;
    points.push(i === 0 ? `M ${x},${y}` : `L ${x},${y}`);
  }
  return points.join(' ');
}

// Single wave lyric line — SVG textPath scrolling along a sine curve
function WaveLyricLine({
  text,
  amplitude,
  frequency,
  centerY,
  fontSize,
  color,
  opacity,
  duration,
  delay,
  blur,
  fontClass,
  pathId,
}: {
  text: string;
  amplitude: number;
  frequency: number;
  centerY: number;
  fontSize: number;
  color: string;
  opacity: number;
  duration: number;
  delay: number;
  blur?: number;
  fontClass: string;
  pathId: string;
}) {
  // Repeat text to fill the wave path
  const repeatedText = `${text}   ·   ${text}   ·   ${text}   ·   `;
  const pathWidth = 3000; // Wide enough for smooth scrolling
  const path = generateWavePath(pathWidth, amplitude, frequency, centerY);

  // Extract font-family from the CSS class for SVG use
  const fontMap: Record<string, string> = {
    'font-era-debut': "'Dancing Script', cursive",
    'font-era-fearless': "'Dancing Script', cursive",
    'font-era-speaknow': "'Dancing Script', cursive",
    'font-era-red': "'Oswald', sans-serif",
    'font-era-1989': "'Permanent Marker', cursive",
    'font-era-reputation': "'UnifrakturCook', cursive",
    'font-era-lover': "'Quicksand', sans-serif",
    'font-era-folklore': "'IM Fell DW Pica', serif",
    'font-era-evermore': "'IM Fell DW Pica', serif",
    'font-era-midnights': "'Inter', sans-serif",
    'font-era-ttpd': "'Cormorant Garamond', serif",
  };
  const fontFamily = fontMap[fontClass] || "'Playfair Display', serif";
  const isItalic = ['font-era-folklore', 'font-era-ttpd'].includes(fontClass);
  const isUppercase = fontClass === 'font-era-red';

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox={`0 0 ${pathWidth} ${centerY * 2 + amplitude * 2}`}
      preserveAspectRatio="none"
      style={{ filter: blur ? `blur(${blur}px)` : undefined }}
    >
      <defs>
        <path id={pathId} d={path} fill="none" />
      </defs>
      <motion.text
        fill={color}
        fontSize={fontSize}
        fontFamily={fontFamily}
        fontStyle={isItalic ? 'italic' : 'normal'}
        opacity={opacity}
        textAnchor="start"
      >
        <motion.textPath
          href={`#${pathId}`}
          animate={{ startOffset: ['100%', '-200%'] }}
          transition={{
            duration,
            repeat: Infinity,
            delay,
            ease: 'linear',
          }}
        >
          {isUppercase ? repeatedText.toUpperCase() : repeatedText}
        </motion.textPath>
      </motion.text>
    </svg>
  );
}

// Floating lyrics background — wave text following sine curve paths with era fonts
function FloatingLyrics({ lyrics, color, album }: { lyrics: string; color: string; album: string }) {
  const eraFontClass = getEraFontClass(album);

  const lines = lyrics
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 10 && l.length < 80 && !l.startsWith('['));

  const layer1 = lines.length > 4
    ? Array.from({ length: 4 }, (_, i) => lines[Math.floor(i * lines.length / 4)])
    : lines.slice(0, 4);
  const layer2 = lines.length > 8
    ? Array.from({ length: 4 }, (_, i) => lines[Math.floor((i + 0.5) * lines.length / 4)])
    : lines.slice(0, 4);
  const layer3 = lines.length > 6
    ? Array.from({ length: 3 }, (_, i) => lines[Math.floor((i + 0.25) * lines.length / 3)])
    : lines.slice(0, 3);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Layer 1: Large, faint, slow, blurred — big sweeping waves */}
      {layer1.map((line, i) => (
        <div key={`l1-${i}`} className="absolute inset-0" style={{ top: `${5 + i * 22}%`, height: '25%' }}>
          <WaveLyricLine
            text={line}
            amplitude={35}
            frequency={1}
            centerY={50}
            fontSize={18}
            color={`${color}08`}
            opacity={0.4}
            duration={50 + i * 5}
            delay={i * 4}
            blur={1}
            fontClass={eraFontClass}
            pathId={`wave-l1-${i}`}
          />
        </div>
      ))}
      {/* Layer 2: Medium — tighter waves */}
      {layer2.map((line, i) => (
        <div key={`l2-${i}`} className="absolute inset-0" style={{ top: `${12 + i * 20}%`, height: '22%' }}>
          <WaveLyricLine
            text={line}
            amplitude={22}
            frequency={1.5}
            centerY={45}
            fontSize={13}
            color={`${color}0a`}
            opacity={0.5}
            duration={35 + i * 4}
            delay={i * 3}
            fontClass={eraFontClass}
            pathId={`wave-l2-${i}`}
          />
        </div>
      ))}
      {/* Layer 3: Small, most visible, fast — rapid small waves */}
      {layer3.map((line, i) => (
        <div key={`l3-${i}`} className="absolute inset-0" style={{ top: `${18 + i * 25}%`, height: '20%' }}>
          <WaveLyricLine
            text={line}
            amplitude={15}
            frequency={2}
            centerY={40}
            fontSize={10}
            color={`${color}0d`}
            opacity={0.6}
            duration={22 + i * 3}
            delay={i * 2}
            fontClass={eraFontClass}
            pathId={`wave-l3-${i}`}
          />
        </div>
      ))}
    </div>
  );
}

// Lyrics panel — scrollable overlay
function LyricsPanel({ lyrics, color, onClose, album }: { lyrics: string; color: string; onClose: () => void; album: string }) {
  const eraFontClass = getEraFontClass(album);
  const lines = lyrics.split('\n');

  return (
    <motion.div
      className="absolute inset-0 z-20 flex items-center justify-center pointer-events-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <motion.div
        className="relative glass rounded-2xl max-w-lg w-full mx-6 max-h-[70vh] flex flex-col"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <BookOpen size={16} style={{ color }} />
            <span className="text-sm text-white/60 tracking-wider">Lyrics</span>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Lyrics body */}
        <div className="overflow-y-auto p-6 space-y-1">
          {lines.map((line, i) => {
            const trimmed = line.trim();
            const isSection = trimmed.startsWith('[');
            const isEmpty = trimmed === '';

            if (isEmpty) return <div key={i} className="h-4" />;

            return (
              <motion.p
                key={i}
                className={`leading-relaxed ${
                  isSection
                    ? 'text-xs tracking-[0.2em] uppercase mt-4 mb-1'
                    : `text-sm ${eraFontClass}`
                }`}
                style={{
                  color: isSection ? `${color}80` : 'rgba(255,255,255,0.7)',
                }}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                {trimmed}
              </motion.p>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Merge Whisper sub-word fragments back into full lines
// e.g. "Tim Mc" + "Graw" → "Tim McGraw"
function mergeFragments(timings: {line: string; start_time: number; end_time: number}[]) {
  const merged: {line: string; start_time: number; end_time: number}[] = [];
  let i = 0;
  while (i < timings.length) {
    const current = { ...timings[i] };
    while (i + 1 < timings.length && shouldMerge(current.line, timings[i + 1].line)) {
      i++;
      current.line = current.line + timings[i].line;
      current.end_time = timings[i].end_time;
    }
    merged.push(current);
    i++;
  }
  return merged;
}

function shouldMerge(current: string, next: string): boolean {
  const trimCur = current.trim();
  const trimNext = next.trim();
  // Short fragment that doesn't end with sentence punctuation
  if (trimCur.length < 20 && !/[.!?,;:]$/.test(trimCur)) return true;
  // Next line is very short and starts lowercase (continuation)
  if (trimNext.length < 10 && /^[a-z]/.test(trimNext)) return true;
  return false;
}

function KaraokeLyrics({ lyrics, isPlaying, tempo, eraColor, eraFontClass, songName }: {
  lyrics: string; isPlaying: boolean; tempo: number; eraColor: string; eraFontClass: string; songName: string;
}) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const linesRef = useRef<string[]>([]);
  const syncTimingsRef = useRef<{line: string; start_time: number; end_time: number}[]>([]);
  const startLineRef = useRef<number>(0); // Where in the full lyrics the preview snippet begins
  const useSyncRef = useRef(false);
  const playStartRef = useRef<number>(0);

  // Parse full lyrics into clean lines (always needed as the display source)
  useEffect(() => {
    const lines = lyrics.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('['));
    const split: string[] = [];
    for (const line of lines) {
      if (line.length > 80) {
        const parts = line.replace(/([a-z,;!?\"'])([A-Z])/g, '$1\n$2').split('\n');
        split.push(...parts.filter(p => p.trim().length > 3));
      } else {
        split.push(line);
      }
    }
    linesRef.current = split.length > 0 ? split : lines;
    setCurrentLineIndex(0);
  }, [lyrics]);

  // Load Whisper sync data — use start_line to know WHERE in lyrics the preview starts
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    fetch(`${url}/api/lyrics-sync/${encodeURIComponent(songName)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.line_timings?.length > 2) {
          const merged = mergeFragments(data.line_timings);
          syncTimingsRef.current = merged;
          // start_line tells us which line of the full lyrics the preview snippet begins at
          startLineRef.current = data.start_line || 0;
          useSyncRef.current = true;
        }
      })
      .catch(() => {});
  }, [songName]);

  // Track playback start time
  useEffect(() => {
    if (isPlaying) {
      playStartRef.current = Date.now();
      // Start karaoke from the preview snippet's position in the full lyrics
      if (useSyncRef.current && startLineRef.current > 0) {
        setCurrentLineIndex(Math.min(startLineRef.current, linesRef.current.length - 1));
      } else {
        setCurrentLineIndex(0);
      }
    }
  }, [isPlaying]);

  // Advance lines — use sync timings mapped to full lyrics, or tempo-based fallback
  useEffect(() => {
    if (!isPlaying || linesRef.current.length === 0) return;

    if (useSyncRef.current && syncTimingsRef.current.length > 2) {
      // PRECISE MODE: Whisper timings mapped to full lyrics via start_line offset
      const timings = syncTimingsRef.current;
      const offset = startLineRef.current;
      const totalLines = linesRef.current.length;
      const interval = setInterval(() => {
        const elapsed = (Date.now() - playStartRef.current) / 1000;
        // Find which sync line we're on based on elapsed time
        let syncIdx = 0;
        for (let i = 0; i < timings.length; i++) {
          if (elapsed >= timings[i].start_time) syncIdx = i;
          else break;
        }
        // Map sync index back to position in the full lyrics
        const fullIdx = Math.min(offset + syncIdx, totalLines - 1);
        setCurrentLineIndex(fullIdx);
      }, 100);
      return () => clearInterval(interval);
    } else {
      // FALLBACK: Tempo-based estimation
      const msPerLine = Math.max(2000, Math.min(4000, (60000 / Math.max(tempo, 60)) * 2));
      const interval = setInterval(() => {
        setCurrentLineIndex(prev => (prev + 1) % linesRef.current.length);
      }, msPerLine);
      return () => clearInterval(interval);
    }
  }, [isPlaying, tempo]);

  const lines = linesRef.current;
  if (lines.length === 0) return null;

  // Show 3 lines: previous (fading out), current (bright), next (fading in)
  const prevLine = lines[(currentLineIndex - 1 + lines.length) % lines.length];
  const currentLine = lines[currentLineIndex];
  const nextLine = lines[(currentLineIndex + 1) % lines.length];

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 overflow-hidden">
      <div className="text-center max-w-3xl px-8 space-y-4">
        {/* Previous line — fading up and out */}
        <AnimatePresence mode="popLayout">
          <motion.p
            key={`prev-${currentLineIndex}`}
            className={`${eraFontClass} text-lg md:text-xl leading-relaxed`}
            style={{ color: `${eraColor}25` }}
            initial={{ opacity: 0.3, y: 0 }}
            animate={{ opacity: 0.15, y: -10 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.8 }}
          >
            {prevLine}
          </motion.p>
        </AnimatePresence>

        {/* Current line — bright and centered */}
        <AnimatePresence mode="popLayout">
          <motion.p
            key={`current-${currentLineIndex}`}
            className={`${eraFontClass} text-2xl md:text-4xl lg:text-5xl font-bold leading-snug`}
            style={{
              color: `${eraColor}90`,
              textShadow: `0 0 30px ${eraColor}30, 0 0 60px ${eraColor}15`,
            }}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 1.02 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {currentLine}
          </motion.p>
        </AnimatePresence>

        {/* Next line — fading in from below */}
        <AnimatePresence mode="popLayout">
          <motion.p
            key={`next-${currentLineIndex}`}
            className={`${eraFontClass} text-lg md:text-xl leading-relaxed`}
            style={{ color: `${eraColor}20` }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 0.15, y: 10 }}
            exit={{ opacity: 0.3, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {nextLine}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

interface SongWorldProps {
  song: SongWithAtmosphere;
  recommendations: Song[];
  editorialBridges: EditorialBridge[];
  onBack: () => void;
  onSongSelect: (songId: string) => void;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export default function SongWorld({ song, recommendations, editorialBridges, onBack, onSongSelect }: SongWorldProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  // Beat pulse based on song tempo
  const tempo = (song as any).audio_features?.tempo || (song.features as any)?.tempo || 120;
  const beatDuration = 60 / tempo; // seconds per beat
  const isMobile = useIsMobile();
  const theme = ERA_THEMES[song.album];
  const atmosphere = song.atmosphere;
  const lyrics = (song as any).lyrics as string | undefined;

  return (
    <div className="fixed inset-0">
      {/* 3D Background */}
      <Canvas camera={{ position: [0, 2, 8], fov: 50 }} dpr={[1, 1.5]}>
        <SongScene song={song} recommendations={recommendations} onSongSelect={onSongSelect} hidePlanets={isMobile} />
      </Canvas>

      {/* Karaoke lyrics — full screen behind stats */}
      {lyrics && isPlaying && (
        <KaraokeLyrics
          lyrics={lyrics}
          isPlaying={isPlaying}
          tempo={tempo}
          eraColor={theme?.colors.primary || '#D4AF37'}
          eraFontClass={getEraFontClass(song.album)}
          songName={song.name}
        />
      )}

      {/* Floating lyrics in background */}
      {lyrics && !showLyrics && (
        <FloatingLyrics lyrics={lyrics} color={theme?.colors.primary || '#D4AF37'} album={song.album} />
      )}

      {/* Lyrics panel overlay */}
      <AnimatePresence>
        {showLyrics && lyrics && (
          <LyricsPanel
            lyrics={lyrics}
            color={theme?.colors.primary || '#D4AF37'}
            onClose={() => setShowLyrics(false)}
            album={song.album}
          />
        )}
      </AnimatePresence>

      {/* Overlay content */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Song info card - bottom left */}
        <motion.div
          className="absolute bottom-24 left-4 right-4 md:left-8 md:right-auto pointer-events-auto md:max-w-lg"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <div
            className="rounded-2xl p-6 space-y-4 transition-transform"
            style={{
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(15px)',
              border: '1px solid rgba(255,255,255,0.04)',
              ...(isPlaying ? { animation: `beat-pulse ${beatDuration}s ease-in-out infinite` } : {}),
            }}
          >
            {/* Album art + info */}
            <div className="flex items-start gap-4">
              {song.image && (
                <motion.div
                  className="holographic rounded-lg overflow-hidden flex-shrink-0"
                  whileHover={{ rotateY: 15, rotateX: -5 }}
                  style={{ perspective: 800, boxShadow: `0 8px 25px ${theme?.colors.primary || '#D4AF37'}30` }}
                >
                  <img src={song.image} alt={song.name} className="w-20 h-20 object-cover" />
                </motion.div>
              )}
              <div className="min-w-0">
                <h2 className="font-display text-2xl font-bold text-white truncate">{song.name}</h2>
                <p className="text-white/50 text-sm">{song.artist}</p>
                <p className="text-white/30 text-xs mt-1">{song.album}</p>
                {atmosphere && (
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: `${theme?.colors.primary || '#D4AF37'}20`,
                        color: theme?.colors.primary || '#D4AF37',
                      }}
                    >
                      {atmosphere.mood}
                    </span>
                    <span className="text-xs text-white/20">
                      {atmosphere.atmosphere_type}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <AudioPreview
                url={song.preview_url}
                isPlaying={isPlaying}
                onToggle={() => setIsPlaying(!isPlaying)}
              />
              {lyrics && (
                <button
                  onClick={() => setShowLyrics(true)}
                  className="rounded-full p-3 transition-all duration-300 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.08] text-white/70 hover:text-white"
                  title="View lyrics"
                >
                  <BookOpen size={18} />
                </button>
              )}
              {song.external_url && (
                <a
                  href={song.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full p-3 transition-all duration-300 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.08] text-white/70 hover:text-white"
                >
                  <ExternalLink size={18} />
                </a>
              )}
            </div>

            {/* Key/Mode info */}
            {(song as any).key_mode && (
              <div className="flex items-center gap-2">
                <Music size={12} className="text-white/20" />
                <span className="text-xs text-white/30">{(song as any).key_mode}</span>
                {(song as any).explicit && <span className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded text-white/40">E</span>}
              </div>
            )}

            {/* Feature radar */}
            {(song.features || (song as any).audio_features) && (
              <div style={isPlaying ? { animation: `beat-pulse ${beatDuration}s ease-in-out infinite`, animationDelay: `${beatDuration * 0.5}s` } : undefined}>
                <FeatureRadar features={((song.features || (song as any).audio_features) as unknown as Record<string, number>)} />
              </div>
            )}
          </div>
        </motion.div>

        {/* Editorial bridges - right side */}
        {editorialBridges.length > 0 && (
          <motion.div
            className="absolute top-20 left-4 right-4 md:left-auto md:right-12 pointer-events-auto md:max-w-sm"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white/40 text-xs tracking-[0.2em] uppercase">
                <Sparkles size={14} className="text-[#D4AF37]" />
                <span>If you love this...</span>
              </div>

              {editorialBridges.slice(0, 4).map((bridge, i) => (
                <motion.div
                  key={i}
                  className="glass glass-hover rounded-xl p-4 cursor-pointer transition-all duration-300"
                  style={isPlaying ? { animation: `beat-pulse ${beatDuration}s ease-in-out infinite`, animationDelay: `${beatDuration * 0.25 * i}s` } : undefined}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  whileHover={{ scale: 1.02, x: -5 }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-white/90">{bridge.song}</p>
                      <p className="text-xs text-white/40">{bridge.artist}</p>
                    </div>
                    <ChevronRight size={14} className="text-white/20 flex-shrink-0 mt-1" />
                  </div>
                  <p className="text-xs text-white/30 mt-2 italic leading-relaxed">
                    &ldquo;{bridge.reason}&rdquo;
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Algorithmic recommendations - bottom right */}
        {recommendations.length > 0 && (
          <motion.div
            className="absolute bottom-24 right-6 md:right-12 pointer-events-auto max-w-xs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
          >
            <p className="text-white/30 text-xs tracking-[0.2em] uppercase mb-3">Similar sounds</p>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {recommendations.slice(0, 6).map((rec, i) => (
                <motion.div
                  key={rec.id || i}
                  className="glass glass-hover rounded-lg px-3 py-2 flex items-center gap-3 cursor-pointer transition-all duration-300"
                  whileHover={{ scale: 1.02, x: -3 }}
                  onClick={() => onSongSelect(rec.id)}
                >
                  {rec.image && (
                    <img src={rec.image} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white/80 truncate">{rec.name}</p>
                    <p className="text-xs text-white/30 truncate">{rec.artist}</p>
                  </div>
                  {rec.similarity && (
                    <span className="text-xs text-[#D4AF37]/60">{Math.round(rec.similarity * 100)}%</span>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
