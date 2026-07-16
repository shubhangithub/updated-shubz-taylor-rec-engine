'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mood } from '@/lib/types';
import { ArrowLeft, Music, ExternalLink, ChevronRight, Ear } from 'lucide-react';
import { getSoundMoodSongs, SoundMoodResult } from '@/lib/api';

interface MoodRoom {
  mood: Mood;
  name: string;
  description: string;
  colors: { primary: string; secondary: string; bg: string; glow: string };
  icon: string;
  ambiance: string;
}

const MOOD_ROOMS: MoodRoom[] = [
  {
    mood: 'heartbreak',
    name: 'The Storm Room',
    description: 'Where lightning meets tears — songs that shatter and rebuild you',
    colors: { primary: '#4A5568', secondary: '#718096', bg: '#0a0c10', glow: '#63B3ED' },
    icon: '⛈',
    ambiance: 'Thunder rumbles in the distance',
  },
  {
    mood: 'euphoria',
    name: 'The Neon Room',
    description: 'Pure electricity — the songs that make you feel invincible',
    colors: { primary: '#D53F8C', secondary: '#ED64A6', bg: '#120810', glow: '#F687B3' },
    icon: '✨',
    ambiance: 'Pulsing lights and infinite energy',
  },
  {
    mood: 'melancholy',
    name: 'The Rain Room',
    description: 'Beautiful sadness — the songs you play at 2am staring out the window',
    colors: { primary: '#4299E1', secondary: '#63B3ED', bg: '#080c12', glow: '#90CDF4' },
    icon: '🌧',
    ambiance: 'Rain against glass, soft and endless',
  },
  {
    mood: 'rage',
    name: 'The Inferno',
    description: 'Scorched earth energy — the songs that burn it all down',
    colors: { primary: '#E53E3E', secondary: '#FC8181', bg: '#120808', glow: '#FEB2B2' },
    icon: '🔥',
    ambiance: 'Embers crackle and flames dance',
  },
  {
    mood: 'nostalgia',
    name: 'The Golden Hour Room',
    description: 'Amber-soaked memories — songs that taste like the past',
    colors: { primary: '#D69E2E', secondary: '#ECC94B', bg: '#121008', glow: '#F6E05E' },
    icon: '🌅',
    ambiance: 'Warm light through dusty windows',
  },
  {
    mood: 'romantic',
    name: 'The Garden Room',
    description: 'Blooming and breathless — love songs that make the world soft',
    colors: { primary: '#ED64A6', secondary: '#FBB6CE', bg: '#100810', glow: '#FED7E2' },
    icon: '🌸',
    ambiance: 'Petals fall in slow motion',
  },
  {
    mood: 'empowerment',
    name: 'The Throne Room',
    description: 'Crown heavy, spine straight — songs that remind you who you are',
    colors: { primary: '#D4AF37', secondary: '#F6E05E', bg: '#100e08', glow: '#FEFCBF' },
    icon: '👑',
    ambiance: 'Gold dust settles on marble',
  },
  {
    mood: 'introspective',
    name: 'The Midnight Room',
    description: 'Quiet revelations — songs for thinking too much and feeling everything',
    colors: { primary: '#667EEA', secondary: '#7F9CF5', bg: '#08081a', glow: '#C3DAFE' },
    icon: '🌙',
    ambiance: 'Starlight through an open window',
  },
];

// Room visual environment
function RoomEnvironment({ room, isActive }: { room: MoodRoom; isActive: boolean }) {
  const particleCount = 40;

  const particles = Array.from({ length: particleCount }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 5,
    duration: 5 + Math.random() * 5,
  }));

  // Mood-specific particle behavior
  const getParticleAnimation = (p: typeof particles[0]) => {
    switch (room.mood) {
      case 'heartbreak':
        return { y: [p.y + '%', (p.y + 30) + '%'], opacity: [0.3, 0, 0.3] };
      case 'euphoria':
        return { scale: [1, 2, 1], opacity: [0.5, 1, 0.5] };
      case 'melancholy':
        return { y: ['-10%', '110%'] };
      case 'rage':
        return { y: [p.y + '%', (p.y - 20) + '%'], opacity: [0.8, 0, 0.8] };
      case 'nostalgia':
        return { x: [p.x + '%', (p.x + 5) + '%', p.x + '%'], opacity: [0.2, 0.5, 0.2] };
      case 'romantic':
        return { y: [p.y + '%', (p.y - 15) + '%'], rotate: [0, 180, 360], opacity: [0.3, 0.6, 0] };
      case 'empowerment':
        return { scale: [0, 1.5, 0], opacity: [0, 0.8, 0] };
      case 'introspective':
        return { opacity: [0.1, 0.4, 0.1] };
      default:
        return { opacity: [0.2, 0.5, 0.2] };
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Gradient background */}
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={{ background: room.colors.bg }}
      />

      {/* Radial glow */}
      <motion.div
        className="absolute inset-0"
        animate={isActive ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1 }}
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px]"
          style={{ background: `${room.colors.primary}15` }}
        />
        <div
          className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full blur-[100px]"
          style={{ background: `${room.colors.secondary}10` }}
        />
      </motion.div>

      {/* Particles */}
      {isActive && particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle, ${room.colors.glow}, transparent)`,
          }}
          animate={getParticleAnimation(p)}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: room.mood === 'melancholy' ? 'linear' : 'easeInOut',
          }}
        />
      ))}

      {/* Room-specific overlays */}
      {room.mood === 'melancholy' && isActive && (
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `repeating-linear-gradient(
              180deg,
              transparent,
              transparent 20px,
              ${room.colors.primary}40 20px,
              ${room.colors.primary}40 21px
            )`,
            animation: 'scan 3s linear infinite',
          }}
        />
      )}

      {room.mood === 'rage' && isActive && (
        <div className="absolute inset-0 opacity-5 mix-blend-overlay"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="40" height="40" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M0 0h40v40H0z" fill="none"/%3E%3Cpath d="M0 0h20v20H0zM20 20h20v20H20z" fill="white" fill-opacity="0.03"/%3E%3C/svg%3E")',
          }}
        />
      )}
    </div>
  );
}

// Song card within a mood room
function MoodSongCard({
  songName,
  room,
  index,
  onClick,
}: {
  songName: string;
  room: MoodRoom;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="glass glass-hover rounded-xl p-4 text-left transition-all duration-300 group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.05 }}
      whileHover={{ scale: 1.02, y: -2 }}
      style={{ borderLeft: `2px solid ${room.colors.primary}40` }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
            {songName}
          </p>
          <p className="text-xs text-white/30 mt-0.5">Taylor Swift</p>
        </div>
        <ChevronRight size={14} className="text-white/20 group-hover:text-white/40 transition-colors" />
      </div>
    </motion.button>
  );
}

interface MoodRoomsProps {
  moodSongs: Record<string, string[]>;
  onSongClick: (songName: string) => void;
}

export default function MoodRooms({ moodSongs, onSongClick }: MoodRoomsProps) {
  const [activeRoom, setActiveRoom] = useState<Mood | null>(null);
  const [isEntering, setIsEntering] = useState(false);
  const [soundSongs, setSoundSongs] = useState<SoundMoodResult[]>([]);

  // CLAP sound-mood ranking: how this mood SOUNDS, scored on the audio itself
  useEffect(() => {
    if (!activeRoom) { setSoundSongs([]); return; }
    let cancelled = false;
    getSoundMoodSongs(activeRoom).then(res => { if (!cancelled) setSoundSongs(res); });
    return () => { cancelled = true; };
  }, [activeRoom]);

  const handleEnterRoom = (mood: Mood) => {
    setIsEntering(true);
    setTimeout(() => {
      setActiveRoom(mood);
      setIsEntering(false);
    }, 500);
  };

  const handleLeaveRoom = () => {
    setIsEntering(true);
    setTimeout(() => {
      setActiveRoom(null);
      setIsEntering(false);
    }, 500);
  };

  const currentRoom = MOOD_ROOMS.find(r => r.mood === activeRoom);

  return (
    <div className="fixed inset-0">
      <AnimatePresence mode="wait">
        {!activeRoom ? (
          // Room selection gallery
          <motion.div
            key="gallery"
            className="h-full flex flex-col items-center justify-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.h2
              className="font-display text-4xl md:text-5xl text-center mb-2"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="text-white/80">The Gallery</span>
            </motion.h2>
            <motion.p
              className="text-white/30 text-sm tracking-wider mb-12 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Choose a room. Let the mood choose the music.
            </motion.p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full">
              {MOOD_ROOMS.map((room, i) => (
                <motion.button
                  key={room.mood}
                  onClick={() => handleEnterRoom(room.mood)}
                  className="relative group rounded-2xl overflow-hidden aspect-[3/4] transition-all duration-500"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  whileHover={{ scale: 1.03, y: -5 }}
                >
                  {/* Room preview */}
                  <div className="absolute inset-0" style={{ background: room.colors.bg }}>
                    <div
                      className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity"
                      style={{
                        background: `radial-gradient(circle at 50% 50%, ${room.colors.primary}30, transparent 70%)`,
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                    <span className="text-3xl mb-3 group-hover:scale-125 transition-transform duration-300">
                      {room.icon}
                    </span>
                    <h3 className="font-display text-sm font-bold" style={{ color: room.colors.primary }}>
                      {room.name}
                    </h3>
                    <p className="text-xs text-white/30 mt-2 leading-relaxed hidden md:block">
                      {room.description}
                    </p>
                  </div>

                  {/* Border glow on hover */}
                  <div
                    className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-opacity-30 transition-all duration-500"
                    style={{ borderColor: `${room.colors.primary}00`, }}
                  />
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ boxShadow: `inset 0 0 30px ${room.colors.primary}10, 0 0 30px ${room.colors.primary}10` }}
                  />
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : currentRoom ? (
          // Inside a room
          <motion.div
            key={`room-${activeRoom}`}
            className="h-full relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <RoomEnvironment room={currentRoom} isActive />

            {/* Room content */}
            <div className="relative z-10 h-full flex flex-col px-6 md:px-12 pt-20 pb-24">
              {/* Back button */}
              <motion.button
                onClick={handleLeaveRoom}
                className="glass glass-hover rounded-full px-4 py-2 flex items-center gap-2 w-fit mb-8 transition-all duration-300"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <ArrowLeft size={16} className="text-white/60" />
                <span className="text-xs text-white/60 tracking-wider">Leave room</span>
              </motion.button>

              {/* Room header */}
              <div className="flex items-center gap-4 mb-2">
                <span className="text-4xl">{currentRoom.icon}</span>
                <div>
                  <h2 className="font-display text-3xl md:text-4xl font-bold" style={{ color: currentRoom.colors.primary }}>
                    {currentRoom.name}
                  </h2>
                  <p className="text-sm mt-1" style={{ color: `${currentRoom.colors.secondary}80` }}>
                    {currentRoom.ambiance}
                  </p>
                </div>
              </div>

              <p className="text-white/40 text-sm max-w-md mb-8 font-body">
                {currentRoom.description}
              </p>

              {/* Songs in this mood */}
              <div className="flex-1 overflow-y-auto pr-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl">
                  {(moodSongs[activeRoom] || []).map((songName, i) => (
                    <MoodSongCard
                      key={songName}
                      songName={songName}
                      room={currentRoom}
                      index={i}
                      onClick={() => onSongClick(songName)}
                    />
                  ))}
                </div>

                {(!moodSongs[activeRoom] || moodSongs[activeRoom].length === 0) && (
                  <p className="text-white/20 text-sm">No songs mapped to this mood yet.</p>
                )}

                {/* Sound-mood section: ranked by the CLAP audio engine, not curation */}
                {soundSongs.length > 0 && (
                  <div className="mt-10 max-w-4xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Ear size={14} style={{ color: currentRoom.colors.primary }} />
                      <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">
                        Sounds like {currentRoom.name.toLowerCase()} — ranked by ear
                      </p>
                    </div>
                    <p className="text-[11px] text-white/20 mb-4">
                      CLAP scores each song&apos;s actual audio against a text description of this mood — no curation, no lyrics.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {soundSongs.map((song, i) => (
                        <motion.button
                          key={`${song.name}-${song.artist}`}
                          onClick={() => onSongClick(song.name)}
                          className="glass glass-hover rounded-lg px-3 py-2.5 text-left flex items-center gap-2 transition-all duration-300"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + i * 0.04 }}
                        >
                          <Music size={12} style={{ color: `${currentRoom.colors.primary}90` }} className="flex-shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs text-white/70 truncate">{song.name}</span>
                            <span className="block text-[10px] text-white/30 truncate">{song.artist}</span>
                          </span>
                          <span className="text-[9px] font-mono text-white/20 flex-shrink-0">
                            {Math.round(song.similarity * 100)}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
