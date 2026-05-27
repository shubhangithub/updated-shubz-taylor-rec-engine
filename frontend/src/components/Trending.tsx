'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Sparkles, ArrowUpRight, Music } from 'lucide-react';
import { ERA_THEMES } from '@/lib/eraThemes';

interface TrendingSong {
  name: string;
  album: string;
  artwork_url?: string;
  preview_url?: string;
  genre?: string;
}

interface TrendingData {
  date: string;
  songs: TrendingSong[];
  total_snapshots: number;
  changes?: {
    new_entries: string[];
    dropped: string[];
    new_count: number;
    dropped_count: number;
  };
}

interface TrendingProps {
  onSongClick: (songName: string) => void;
}

export default function Trending({ onSongClick }: TrendingProps) {
  const [data, setData] = useState<TrendingData | null>(null);
  const [recs, setRecs] = useState<Record<string, any[]>>({});

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    fetch(`${url}/api/trending`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setData(d);
        // Get ML recommendations for the #1 song
        if (d?.songs?.[0]) {
          fetch(`${url}/api/engine/lyrics_transformer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ song_names: [d.songs[0].name], liked_songs: [], num_per_engine: 4 }),
          })
            .then(r => r.ok ? r.json() : null)
            .then(recData => {
              if (recData?.recommendations) {
                setRecs({ [d.songs[0].name]: recData.recommendations.filter((r: any) => r.artist !== 'Taylor Swift').slice(0, 3) });
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  if (!data || !data.songs?.length) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <p className="text-white/30 font-display text-lg">Loading trending data...</p>
      </div>
    );
  }

  const topSong = data.songs[0];
  const topTheme = ERA_THEMES[topSong.album] || ERA_THEMES['Midnights'];
  const topRecs = recs[topSong.name] || [];

  return (
    <div className="fixed inset-0 overflow-y-auto">
      <div className="min-h-screen px-6 md:px-12 pt-20 pb-24 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp size={24} className="text-[#D4AF37]" />
            <h1 className="font-display text-4xl md:text-5xl text-white/80">Trending Now</h1>
          </div>
          <p className="text-white/30 text-sm tracking-wider">
            What&apos;s hot in Taylor&apos;s catalog right now — and what the engines think you&apos;d love alongside it.
            <span className="text-white/15 ml-2">Updated {data.date}</span>
          </p>
        </motion.div>

        {/* #1 Song — Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6 md:p-8 mb-8 relative overflow-hidden"
        >
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 30% 50%, ${topTheme?.colors.primary}15, transparent 70%)` }} />

          <div className="relative flex flex-col md:flex-row items-start gap-6">
            {/* Artwork */}
            <div className="flex-shrink-0">
              {topSong.artwork_url ? (
                <motion.img
                  src={topSong.artwork_url.replace('100x100', '300x300')}
                  alt={topSong.name}
                  className="w-32 h-32 md:w-40 md:h-40 rounded-xl object-cover"
                  style={{ boxShadow: `0 8px 30px ${topTheme?.colors.primary}30` }}
                  whileHover={{ scale: 1.03 }}
                />
              ) : (
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-xl flex items-center justify-center"
                  style={{ background: `${topTheme?.colors.primary}15` }}>
                  <Music size={40} style={{ color: topTheme?.colors.primary }} />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] font-mono">#1</span>
                <span className="text-xs text-white/20">Most trending</span>
              </div>
              <h2 className="font-display text-3xl md:text-4xl text-white/90 mb-1">{topSong.name}</h2>
              <p className="text-white/40 text-sm mb-4" style={{ color: topTheme?.colors.accent }}>
                {topSong.album}
              </p>
              <button
                onClick={() => onSongClick(topSong.name)}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-full transition-all duration-300 hover:brightness-110"
                style={{ background: `${topTheme?.colors.primary}20`, color: topTheme?.colors.primary, border: `1px solid ${topTheme?.colors.primary}30` }}
              >
                <Sparkles size={14} />
                Explore this song
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>

          {/* ML recommendations for #1 */}
          {topRecs.length > 0 && (
            <div className="mt-6 pt-6 border-t border-white/[0.04]">
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/25 mb-3">
                If #{topSong.name} is trending, the engine thinks you&apos;d also love...
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {topRecs.map((rec, i) => (
                  <motion.button
                    key={rec.name}
                    onClick={() => onSongClick(rec.name)}
                    className="glass glass-hover rounded-lg p-3 text-left transition-all duration-300 group"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                  >
                    <p className="text-sm text-white/70 group-hover:text-white truncate">{rec.name}</p>
                    <p className="text-xs text-white/30 truncate">{rec.artist}</p>
                    <p className="text-[10px] text-white/15 mt-1 truncate italic">{rec.explanation?.slice(0, 60)}</p>
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Rest of trending list */}
        <div className="space-y-2">
          <p className="text-xs tracking-[0.2em] uppercase text-white/20 mb-3">Full Chart</p>
          {data.songs.slice(1, 20).map((song, i) => {
            const theme = ERA_THEMES[song.album];
            return (
              <motion.button
                key={`${song.name}-${i}`}
                onClick={() => onSongClick(song.name)}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-xl glass-hover transition-all duration-300 group text-left"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.03 }}
              >
                <span className="text-xs text-white/15 font-mono w-6 text-right">#{i + 2}</span>
                {song.artwork_url ? (
                  <img src={song.artwork_url} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: `${theme?.colors.primary || '#333'}12` }}>
                    <Music size={14} style={{ color: theme?.colors.primary || '#666' }} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/70 group-hover:text-white truncate transition-colors">{song.name}</p>
                  <p className="text-xs text-white/25 truncate">{song.album}</p>
                </div>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: theme?.colors.primary || '#333' }} />
              </motion.button>
            );
          })}
        </div>

        {/* Changes callout */}
        {data.changes && (data.changes.new_count > 0 || data.changes.dropped_count > 0) && (
          <motion.div
            className="mt-8 glass rounded-xl p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/20 mb-2">Week-over-week changes</p>
            <div className="flex gap-4 text-xs">
              {data.changes.new_count > 0 && (
                <span className="text-green-400/60">+{data.changes.new_count} new entries</span>
              )}
              {data.changes.dropped_count > 0 && (
                <span className="text-red-400/40">-{data.changes.dropped_count} dropped</span>
              )}
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <p className="text-[10px] text-white/10 text-center mt-8">
          Data from iTunes Search API. Refreshed weekly via automated pipeline. Snapshot #{data.total_snapshots}.
        </p>
      </div>
    </div>
  );
}
