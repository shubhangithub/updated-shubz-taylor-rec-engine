'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { ERA_THEMES, ALL_ERAS } from '@/lib/eraThemes';
import { TaylorSong, EraArtist, Era } from '@/lib/types';
import { ChevronRight, Music, Users, Calendar, Star } from 'lucide-react';

// Era-specific decorative elements
function EraDecoration({ era, scrollProgress }: { era: string; scrollProgress: number }) {
  const theme = ERA_THEMES[era];
  if (!theme) return null;

  const decorations: Record<string, React.ReactNode> = {
    'Taylor Swift': (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Country road texture lines */}
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-px opacity-10"
            style={{
              width: `${30 + Math.random() * 40}%`,
              left: `${Math.random() * 60}%`,
              top: `${15 + i * 10}%`,
              background: `linear-gradient(90deg, transparent, ${theme.colors.secondary}, transparent)`,
            }}
            animate={{ opacity: [0.05, 0.15, 0.05] }}
            transition={{ duration: 4 + i, repeat: Infinity }}
          />
        ))}
      </div>
    ),
    'Fearless': (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Golden sparkles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: theme.colors.primary,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 4,
            }}
          />
        ))}
      </div>
    ),
    'Speak Now': (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Enchanted purple mist */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-1/3"
          style={{
            background: `linear-gradient(0deg, ${theme.colors.primary}15, transparent)`,
          }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        {/* Floating ornate dots */}
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
              background: `radial-gradient(circle, ${theme.colors.accent}, transparent)`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{ duration: 5 + Math.random() * 3, repeat: Infinity, delay: i * 0.5 }}
          />
        ))}
      </div>
    ),
    'Red': (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Falling autumn leaves effect */}
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-lg opacity-10"
            style={{ left: `${Math.random() * 100}%`, top: `-10%` }}
            animate={{
              y: ['0vh', '110vh'],
              x: [0, Math.random() * 100 - 50],
              rotate: [0, 360],
            }}
            transition={{
              duration: 8 + Math.random() * 6,
              repeat: Infinity,
              delay: Math.random() * 8,
              ease: 'linear',
            }}
          >
            🍂
          </motion.div>
        ))}
      </div>
    ),
    '1989': (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Polaroid-style scattered rectangles */}
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute border border-white/5 bg-white/[0.02]"
            style={{
              width: 60 + Math.random() * 40,
              height: 70 + Math.random() * 50,
              left: `${10 + Math.random() * 70}%`,
              top: `${10 + Math.random() * 70}%`,
              transform: `rotate(${-15 + Math.random() * 30}deg)`,
            }}
            animate={{ rotate: [-5 + i * 3, 5 + i * 3, -5 + i * 3] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
        ))}
      </div>
    ),
    'reputation': (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Glitch lines */}
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute left-0 right-0 h-px bg-white/10"
            style={{ top: `${20 + i * 15}%` }}
            animate={{
              opacity: [0, 0.2, 0],
              scaleX: [0.5, 1, 0.5],
              x: [-20, 20, -20],
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              repeatDelay: 3 + Math.random() * 5,
              delay: i * 0.8,
            }}
          />
        ))}
        {/* Newspaper texture */}
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, white 2px, white 3px)' }}
        />
      </div>
    ),
    'Lover': (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Pastel gradient blobs */}
        <motion.div
          className="absolute w-96 h-96 rounded-full blur-[100px]"
          style={{ background: `${theme.colors.primary}15`, left: '10%', top: '20%' }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-80 h-80 rounded-full blur-[100px]"
          style={{ background: `${theme.colors.accent}15`, right: '10%', bottom: '20%' }}
          animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
        {/* Butterfly particles */}
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-sm opacity-15"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
            animate={{
              y: [0, -40, 0],
              x: [0, 20, -20, 0],
              rotate: [0, 10, -10, 0],
            }}
            transition={{ duration: 6 + Math.random() * 4, repeat: Infinity, delay: i * 0.7 }}
          >
            🦋
          </motion.div>
        ))}
      </div>
    ),
    'folklore': (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Mist layers */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-1/2"
          style={{ background: `linear-gradient(0deg, ${theme.colors.primary}10, transparent)` }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        {/* Tree-like vertical lines */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="absolute bottom-0 w-px opacity-[0.06]"
            style={{
              left: `${5 + i * 10}%`,
              height: `${40 + Math.random() * 30}%`,
              background: `linear-gradient(0deg, ${theme.colors.secondary}, transparent)`,
            }}
          />
        ))}
        {/* Fireflies */}
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={`fly-${i}`}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              left: `${15 + Math.random() * 70}%`,
              top: `${20 + Math.random() * 60}%`,
              background: 'radial-gradient(circle, rgba(200,220,130,0.8), transparent)',
              boxShadow: '0 0 8px rgba(200,220,130,0.4)',
            }}
            animate={{
              opacity: [0, 0.8, 0.3, 0.9, 0],
              x: [0, 15, -10, 20, 0],
              y: [0, -20, -5, -15, 0],
            }}
            transition={{ duration: 6 + Math.random() * 4, repeat: Infinity, delay: i * 1.2 }}
          />
        ))}
      </div>
    ),
    'evermore': (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Amber light rays */}
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-0 w-[2px]"
            style={{
              left: `${15 + i * 18}%`,
              height: '100%',
              background: `linear-gradient(180deg, ${theme.colors.primary}20, transparent 70%)`,
              transform: `rotate(${-3 + i * 1.5}deg)`,
            }}
            animate={{ opacity: [0.15, 0.4, 0.15] }}
            transition={{ duration: 5, repeat: Infinity, delay: i * 0.8 }}
          />
        ))}
        {/* Gold dust */}
        {Array.from({ length: 10 }).map((_, i) => (
          <motion.div
            key={`dust-${i}`}
            className="absolute w-1 h-1 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-5%`,
              background: `${theme.colors.primary}`,
            }}
            animate={{ y: ['0vh', '110vh'], opacity: [0, 0.3, 0] }}
            transition={{ duration: 10 + Math.random() * 8, repeat: Infinity, delay: Math.random() * 10, ease: 'linear' }}
          />
        ))}
      </div>
    ),
    'Midnights': (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Stars */}
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 h-0.5 rounded-full bg-white"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
            animate={{ opacity: [0.1, 0.6, 0.1] }}
            transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 5 }}
          />
        ))}
        {/* Lavender haze */}
        <motion.div
          className="absolute inset-0 rounded-full blur-[120px]"
          style={{ background: `${theme.colors.accent}08`, width: '60%', height: '60%', margin: 'auto' }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      </div>
    ),
    'The Tortured Poets Department': (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated ink splatters */}
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 4 + Math.random() * 12,
              height: 4 + Math.random() * 12,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: theme.colors.primary,
            }}
            animate={{
              opacity: [0, 0.15, 0.1, 0],
              scale: [0, 1.5, 1.2, 0],
              y: [0, Math.random() * 20],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              delay: i * 0.8,
            }}
          />
        ))}
        {/* Quill stroke line */}
        <motion.div
          className="absolute top-1/3 left-[5%] h-px"
          style={{ background: `${theme.colors.secondary}30` }}
          initial={{ width: 0 }}
          whileInView={{ width: '90%' }}
          transition={{ duration: 3, ease: 'easeInOut' }}
          viewport={{ once: true }}
        />
        {/* Ruled lines */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={`line-${i}`}
            className="absolute left-[10%] right-[10%] h-px"
            style={{ top: `${12 + i * 6}%`, background: `${theme.colors.secondary}08` }}
          />
        ))}
      </div>
    ),
    'The Life Of A Showgirl': (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Spotlight beams */}
        {Array.from({ length: 3 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-0"
            style={{
              left: `${20 + i * 30}%`,
              width: '2px',
              height: '100%',
              background: `linear-gradient(180deg, ${theme.colors.accent}30, transparent 80%)`,
              transform: `rotate(${-8 + i * 8}deg)`,
              transformOrigin: 'top center',
            }}
            animate={{ opacity: [0.15, 0.4, 0.15] }}
            transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.5 }}
          />
        ))}
        {/* Sequin sparkles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={`seq-${i}`}
            className="absolute w-1 h-1 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: theme.colors.accent,
            }}
            animate={{
              opacity: [0, 0.8, 0],
              scale: [0.5, 1.5, 0.5],
            }}
            transition={{
              duration: 1.5 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 4,
            }}
          />
        ))}
        {/* Stage curtain gradient */}
        <div
          className="absolute inset-y-0 left-0 w-16 opacity-20"
          style={{ background: `linear-gradient(90deg, ${theme.colors.primary}40, transparent)` }}
        />
        <div
          className="absolute inset-y-0 right-0 w-16 opacity-20"
          style={{ background: `linear-gradient(270deg, ${theme.colors.primary}40, transparent)` }}
        />
      </div>
    ),
  };

  return decorations[era] || null;
}

// Individual era section
function EraSection({
  era,
  songs,
  artists,
  index,
  onSongClick,
  onArtistClick,
}: {
  era: string;
  songs: TaylorSong[];
  artists: EraArtist[];
  index: number;
  onSongClick: (song: TaylorSong) => void;
  onArtistClick: (artist: string) => void;
}) {
  // Hooks must run unconditionally — call useRef before any early return.
  const sectionRef = useRef<HTMLDivElement>(null);

  const theme = ERA_THEMES[era];
  if (!theme) return null;

  return (
    <div
      ref={sectionRef}
      className="flex-shrink-0 w-screen h-screen relative snap-center"
      style={{ background: theme.colors.bg }}
    >
      <EraDecoration era={era} scrollProgress={0} />

      {/* Era content */}
      <div className="relative z-10 h-full flex flex-col justify-center px-8 md:px-16 lg:px-24 max-w-5xl">
        {/* Year badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          viewport={{ once: true }}
        >
          <span
            className="text-xs tracking-[0.4em] uppercase font-body"
            style={{ color: `${theme.colors.accent}80` }}
          >
            <Calendar size={12} className="inline mr-2" />
            {theme.year}
          </span>
        </motion.div>

        {/* Era title */}
        <motion.h2
          className="font-display text-5xl md:text-7xl lg:text-8xl font-bold mt-4 leading-none"
          style={{ color: theme.colors.primary }}
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          viewport={{ once: true }}
        >
          {era}
        </motion.h2>

        {/* Description */}
        <motion.p
          className="text-lg md:text-xl mt-4 max-w-xl leading-relaxed font-body"
          style={{ color: `${theme.colors.accent}90` }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          viewport={{ once: true }}
        >
          {theme.description}
        </motion.p>

        {/* Songs grid */}
        <motion.div
          className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[35vh] overflow-y-auto pr-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { delay: 0.5, staggerChildren: 0.03 } },
          }}
        >
          {songs.map((song, i) => (
            <motion.button
              key={song.name}
              onClick={() => onSongClick(song)}
              className="text-left px-3 py-2 rounded-lg transition-shadow duration-300 group"
              style={{
                background: 'rgba(255,255,255,0.02)',
                borderLeft: song.is_single ? `2px solid ${theme.colors.primary}` : '2px solid transparent',
              }}
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0 },
              }}
              whileHover={{
                background: 'rgba(255,255,255,0.06)',
                x: 4,
                boxShadow: `0 0 12px ${theme.colors.primary}20`,
              }}
            >
              <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors block truncate">
                {song.is_single && <Star size={10} className="inline mr-1 text-[#D4AF37]" />}
                {song.name}
              </span>
            </motion.button>
          ))}
        </motion.div>

        {/* Connected artists */}
        {artists.length > 0 && (
          <motion.div
            className="mt-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Users size={14} style={{ color: `${theme.colors.accent}60` }} />
              <span className="text-xs tracking-[0.2em] uppercase" style={{ color: `${theme.colors.accent}60` }}>
                Artists in this universe
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {artists.slice(0, 8).map((artist) => (
                <motion.button
                  key={artist.name}
                  onClick={() => onArtistClick(artist.name)}
                  className="glass glass-hover rounded-full px-3 py-1.5 text-xs transition-all duration-300"
                  style={{ color: theme.colors.accent }}
                  whileHover={{ scale: 1.05 }}
                  title={artist.reason}
                >
                  {artist.name}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 right-8 flex items-center gap-2 text-white/20 text-xs">
        <span className="tracking-wider">Scroll</span>
        <ChevronRight size={14} />
      </div>
    </div>
  );
}

interface ErasCorridorProps {
  catalog: TaylorSong[];
  eraArtists: Record<string, EraArtist[]>;
  onSongClick: (song: TaylorSong) => void;
  onArtistClick: (artist: string) => void;
}

export default function ErasCorridor({ catalog, eraArtists, onSongClick, onArtistClick }: ErasCorridorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Group songs by era
  const songsByEra = ALL_ERAS.reduce((acc, era) => {
    acc[era] = catalog.filter(s => s.era === era);
    return acc;
  }, {} as Record<string, TaylorSong[]>);

  return (
    <div className="fixed inset-0">
      {/* Horizontal scroll container */}
      <div
        ref={scrollRef}
        className="h-screen w-screen overflow-x-auto overflow-y-hidden snap-x snap-mandatory flex"
        style={{ scrollbarWidth: 'none' }}
      >
        {ALL_ERAS.map((era, i) => (
          <EraSection
            key={era}
            era={era}
            songs={songsByEra[era] || []}
            artists={eraArtists[era] || []}
            index={i}
            onSongClick={onSongClick}
            onArtistClick={onArtistClick}
          />
        ))}
      </div>

      {/* Era progress dots */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
        {ALL_ERAS.map((era, i) => {
          const theme = ERA_THEMES[era];
          return (
            <button
              key={era}
              onClick={() => {
                scrollRef.current?.children[i]?.scrollIntoView({ behavior: 'smooth', inline: 'start' });
              }}
              className="w-2 h-2 rounded-full transition-all duration-300 hover:scale-150"
              style={{ background: theme?.colors.primary || '#333' }}
              title={era}
            />
          );
        })}
      </div>
    </div>
  );
}
