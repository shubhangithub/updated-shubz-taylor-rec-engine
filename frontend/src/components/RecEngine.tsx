'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Plus, Sparkles, Heart, ChevronRight, ExternalLink, Star, Loader2, Zap, Users, BookOpen, ToggleLeft, Info, Columns, Download, Music } from 'lucide-react';
import { TaylorSong, Song, EditorialBridge, CompareResponse } from '@/lib/types';
import { ERA_THEMES } from '@/lib/eraThemes';
import * as api from '@/lib/api';
import ComparisonGrid from './ComparisonGrid';

interface RecEngineProps {
  catalog: TaylorSong[];
  onSongClick: (songName: string) => void;
}

type RecMode = 'lyrics_transformer' | 'qwen3_embed' | 'vae_latent' | 'graph_node2vec' | 'ncf' | 'ensemble' | 'contrastive';

interface RecResult {
  name: string;
  artist: string;
  album?: string;
  image?: string | null;
  preview_url?: string | null;
  external_url?: string;
  similarity?: number;
  recommendation_type?: string;
  reason?: string;
  mood?: string;
  explanation?: string;
  hop?: number;
  path?: string;
  confidence?: number;
}

const REC_MODES: { key: RecMode; label: string; icon: React.ReactNode; color: string; description: string; longDesc: string }[] = [
  {
    key: 'lyrics_transformer',
    label: 'Transformer Lyrics',
    icon: <Zap size={16} />,
    color: '#E53E3E',
    description: '384-dim semantic lyric embeddings',
    longDesc: 'Encodes all 801 song lyrics (341 Taylor + 460 cross-artist) into 384-dimensional semantic vectors using all-MiniLM-L6-v2 (sentence-transformers). Finds songs with similar meaning — "heartbreak in autumn" matches even with no shared words. Paper: Reimers & Gurevych (2019) Sentence-BERT, EMNLP.',
  },
  {
    key: 'qwen3_embed',
    label: 'Qwen3 Embeddings',
    icon: <Zap size={16} />,
    color: '#38B2AC',
    description: '1024-dim modern lyric embeddings',
    longDesc: 'The 2025-era counterpart to Transformer Lyrics: Qwen3-Embedding-0.6B encodes the FULL lyrics of all 801 songs (32K-token context — MiniLM truncates at 256 wordpieces, so it never sees bridges or outros). Same corpus, six years of encoder progress, side by side. Paper: Zhang et al. (2025) Qwen3 Embedding, arXiv:2506.05176.',
  },
  {
    key: 'vae_latent',
    label: 'VAE Latent Space',
    icon: <Sparkles size={16} />,
    color: '#9F7AEA',
    description: '16-dim learned lyrics latent space',
    longDesc: 'A Variational Autoencoder trained on the 384-dim lyrics embeddings learns a 16-dimensional latent space (24:1 compression) where songs cluster by non-linear structure cosine similarity misses. Encoder: 384→128→64→16, β=0.1 with KL warm-up to avoid posterior collapse. Paper: Kingma & Welling (2013) Auto-Encoding Variational Bayes, ICLR 2014.',
  },
  {
    key: 'graph_node2vec',
    label: 'Graph Node2Vec',
    icon: <Users size={16} />,
    color: '#48BB78',
    description: '64-dim graph structural embeddings',
    longDesc: 'Builds a sparse song graph (323 nodes; audio-similarity, era, and editorial-bridge edges), runs second-order biased random walks (p=1, q=2), trains skip-gram Word2Vec on walks to learn 64-dim structural embeddings. Captures multi-hop: "Song A → Song B → Song C" transitive similarity. Paper: Grover & Leskovec (2016) node2vec, KDD.',
  },
  {
    key: 'ncf',
    label: 'Neural Collaborative',
    icon: <BookOpen size={16} />,
    color: '#5B9BD5',
    description: '48-dim MLP interaction embeddings',
    longDesc: 'Adapts the MLP interaction function of Neural Collaborative Filtering to song-song pairs — no real users or listening data. 48-dim embeddings are PCA-initialized from 393-dim multi-modal features (384 lyrics + 9 audio) and fine-tuned on ~5,000 synthetic pairs from lyrics similarity, audio similarity, and editorial bridges. Paper: He et al. (2017) NCF, WWW (adapted).',
  },
  {
    key: 'ensemble',
    label: 'Hybrid Ensemble',
    icon: <BookOpen size={16} />,
    color: '#ED8936',
    description: 'Weighted blend of all 6 embedding engines',
    longDesc: 'Runs all 6 embedding engines at query time, merges results with weighted rank aggregation. Songs found by 3+ engines get a consensus boost. Truly dynamic — different results each query. Based on Burke (2002) hybrid recommender architecture.',
  },
  {
    key: 'contrastive',
    label: 'Contrastive SSL',
    icon: <Sparkles size={16} />,
    color: '#F687B3',
    description: '64-dim SimCLR-style on augmented lyrics',
    longDesc: 'Applies the SimCLR recipe to lyrics with a frozen MiniLM encoder: creates augmented views (20% word dropout, line shuffle, section removal), trains a projection head (384→128→64) with NT-Xent InfoNCE loss (τ=0.07). Learns representations robust to word dropout and line reordering. Paper: Chen et al. (2020) SimCLR, ICML — inspired by Spijkervet & Burgoyne (2021) CLMR, ISMIR.',
  },
];

// Floating ambient particles
function AmbientParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 3 + Math.random() * 5,
      delay: Math.random() * 6,
      duration: 6 + Math.random() * 4,
    })), []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: 'radial-gradient(circle, rgba(212,175,55,0.25), transparent)',
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0, 0.4, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

export default function RecEngine({ catalog, onSongClick }: RecEngineProps) {
  const [selectedSongs, setSelectedSongs] = useState<TaylorSong[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [recMode, setRecMode] = useState<RecMode>('lyrics_transformer');
  const [results, setResults] = useState<RecResult[]>([]);
  const [editorialResults, setEditorialResults] = useState<EditorialBridge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [spotifyExporting, setSpotifyExporting] = useState(false);
  const [spotifyResult, setSpotifyResult] = useState<{url: string; count: number} | null>(null);
  const [showModeInfo, setShowModeInfo] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareData, setCompareData] = useState<CompareResponse | null>(null);

  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 1) return [];
    const q = searchQuery.toLowerCase();
    return catalog
      .filter(s => s.name.toLowerCase().includes(q) && !selectedSongs.some(sel => sel.name === s.name))
      .slice(0, 6);
  }, [searchQuery, catalog, selectedSongs]);

  const addSong = useCallback((song: TaylorSong) => {
    if (selectedSongs.length >= 5) return;
    if (selectedSongs.some(s => s.name === song.name)) return;
    setSelectedSongs(prev => [...prev, song]);
    setSearchQuery('');
    setHasSearched(false);
  }, [selectedSongs]);

  const removeSong = useCallback((song: TaylorSong) => {
    setSelectedSongs(prev => prev.filter(s => s.name !== song.name));
    setHasSearched(false);
  }, []);

  const runComparison = useCallback(async () => {
    if (selectedSongs.length === 0) return;
    setIsLoading(true);
    setHasSearched(true);
    setCompareData(null);

    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const songIds: string[] = [];
    for (const song of selectedSongs.slice(0, 3)) {
      try {
        const res = await fetch(`${url}/api/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: song.name, artist: 'Taylor Swift' }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.results?.[0]?.id) songIds.push(data.results[0].id);
        }
      } catch {}
    }

    const result = await api.compareEngines(
      songIds,
      selectedSongs.map(s => s.name),
      6
    );
    if (result) setCompareData(result);
    setIsLoading(false);
  }, [selectedSongs]);

  const getRecommendations = useCallback(async () => {
    if (selectedSongs.length === 0) return;

    if (compareMode) {
      return runComparison();
    }

    setIsLoading(true);
    setHasSearched(true);
    setResults([]);
    setEditorialResults([]);

    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    try {
      const res = await fetch(`${url}/api/engine/${recMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          liked_songs: [],
          song_names: selectedSongs.map(s => s.name),
          num_recommendations: 12,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.recommendations || []);
      }
    } catch (e) {
      console.error('Recommendation error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSongs, recMode, compareMode, runComparison]);

  const quickPicks = useMemo(() => {
    const picks = [
      'All Too Well', 'Cruel Summer', 'Blank Space', 'cardigan', 'Anti-Hero',
      'Love Story', 'Enchanted', 'Shake It Off', 'Delicate', 'willow',
      'Style', 'exile', 'Fortnight', 'august', 'champagne problems',
    ];
    return picks
      .map(name => catalog.find(s => s.name === name))
      .filter((s): s is TaylorSong => s !== undefined)
      .filter(s => !selectedSongs.some(sel => sel.name === s.name));
  }, [catalog, selectedSongs]);

  const currentMode = REC_MODES.find(m => m.key === recMode)!;

  return (
    <div className="fixed inset-0 overflow-y-auto">
      {/* Ambient floating particles */}
      <AmbientParticles />

      <div className="min-h-screen px-6 md:px-12 pt-20 pb-24 max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="font-display text-4xl md:text-5xl text-white/80 mb-2">Recommend Me</h1>
          <p className="text-white/30 text-sm tracking-wider">
            Pick Taylor songs you love. Choose your engine. See how different algorithms find different music.
          </p>
        </motion.div>

        {/* === REC MODE SELECTOR === */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-3">
            <ToggleLeft size={14} className="text-white/25" />
            <span className="text-xs tracking-[0.2em] uppercase text-white/30">Recommendation Engine</span>
            <button onClick={() => setShowModeInfo(!showModeInfo)} className="text-white/15 hover:text-white/30 transition-colors">
              <Info size={12} />
            </button>
            <div className="ml-auto">
              <button
                onClick={() => { setCompareMode(!compareMode); setHasSearched(false); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-300 ${
                  compareMode
                    ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30'
                    : 'text-white/30 hover:text-white/50 border border-white/[0.06] hover:border-white/[0.1]'
                }`}
              >
                <Columns size={12} />
                Compare All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
            {REC_MODES.map((mode) => {
              const isActive = recMode === mode.key;
              return (
                <motion.button
                  key={mode.key}
                  onClick={() => { setRecMode(mode.key); setHasSearched(false); }}
                  className={`relative rounded-xl p-3 text-left transition-all duration-300 ${
                    isActive ? 'ring-1' : 'hover:bg-white/[0.03]'
                  }`}
                  style={{
                    background: isActive ? `${mode.color}10` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isActive ? mode.color + '30' : 'rgba(255,255,255,0.04)'}`,
                    boxShadow: isActive ? `0 0 15px ${mode.color}20` : undefined,
                  }}
                  whileHover={{ scale: 1.02, boxShadow: `0 0 12px ${mode.color}15` }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ color: isActive ? mode.color : 'rgba(255,255,255,0.3)' }}>{mode.icon}</span>
                    <span className="text-xs font-medium" style={{ color: isActive ? mode.color : 'rgba(255,255,255,0.5)' }}>
                      {mode.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/25 leading-snug">{mode.description}</p>

                  {isActive && (
                    <motion.div
                      layoutId="mode-indicator"
                      className="absolute -top-px -right-px w-2 h-2 rounded-full"
                      style={{ background: mode.color }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Mode detail */}
          <AnimatePresence>
            {showModeInfo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                className="overflow-hidden"
              >
                <div className="glass rounded-xl p-4 mt-3">
                  <p className="text-xs text-white/40 leading-relaxed">{currentMode.longDesc}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* === SONG PICKER === */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Heart size={14} className="text-[#D4AF37]" />
            <span className="text-xs tracking-[0.2em] uppercase text-white/40">
              Songs you love ({selectedSongs.length}/5)
            </span>
          </div>

          <div className="flex flex-wrap gap-2 min-h-[44px]">
            <AnimatePresence mode="popLayout">
              {selectedSongs.map((song) => {
                const theme = ERA_THEMES[song.era];
                return (
                  <motion.div
                    key={`${song.name}-${song.era}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6, filter: 'blur(4px)' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    layout
                    className="flex items-center gap-2 rounded-full px-3 py-2"
                    style={{
                      background: `${theme?.colors.primary || '#D4AF37'}15`,
                      border: `1px solid ${theme?.colors.primary || '#D4AF37'}30`,
                      color: theme?.colors.primary || '#D4AF37',
                    }}
                  >
                    <span className="text-xs">{song.name}</span>
                    <button onClick={() => removeSong(song)} className="hover:opacity-100 opacity-50 transition-opacity">
                      <X size={14} />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {selectedSongs.length === 0 && (
              <p className="text-white/15 text-sm py-2">Add songs below to get started...</p>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
            <Plus size={16} className="text-white/30 flex-shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={selectedSongs.length >= 5 ? 'Max 5 songs selected' : 'Search to add a song...'}
              disabled={selectedSongs.length >= 5}
              className="bg-transparent border-none outline-none text-sm text-white/80 placeholder:text-white/20 w-full font-body"
            />
          </div>
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-full left-0 right-0 mt-1 glass rounded-xl overflow-hidden z-10"
              >
                {searchResults.map((song, i) => {
                  const theme = ERA_THEMES[song.era];
                  return (
                    <button key={`${song.name}-${i}`} onClick={() => addSong(song)}
                      className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: theme?.colors.primary || '#666' }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white/70">{song.name}</p>
                        <p className="text-[11px] text-white/25">{song.era}</p>
                      </div>
                      <Plus size={14} className="text-white/20" />
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick picks */}
        {selectedSongs.length < 5 && !searchQuery && (
          <motion.div className="mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <span className="text-[10px] tracking-[0.2em] uppercase text-white/20 mb-2 block">Quick add</span>
            <div className="flex flex-wrap gap-1.5">
              {quickPicks.slice(0, 10).map((song) => (
                <button key={song.name} onClick={() => addSong(song)}
                  className="px-3 py-1.5 rounded-full text-xs text-white/35 hover:text-white/60 transition-all duration-200 hover:bg-white/5 border border-white/[0.04] hover:border-white/[0.08]">
                  {song.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* === GO BUTTON with pulsing glow === */}
        <div className="relative mb-10">
          {/* Pulsing glow behind button when songs are selected */}
          {selectedSongs.length > 0 && (
            <motion.div
              className="absolute inset-0 rounded-xl blur-[40px]"
              style={{ background: `${currentMode.color}` }}
              animate={{ opacity: [0.05, 0.15, 0.05] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <motion.button
            onClick={getRecommendations}
            disabled={selectedSongs.length === 0 || isLoading}
            className={`relative w-full py-4 rounded-xl font-display text-lg tracking-wider transition-all duration-300 ${
              selectedSongs.length > 0
                ? 'hover:brightness-110'
                : 'cursor-not-allowed'
            }`}
            style={{
              background: selectedSongs.length > 0 ? `${currentMode.color}20` : 'rgba(255,255,255,0.03)',
              color: selectedSongs.length > 0 ? currentMode.color : 'rgba(255,255,255,0.15)',
              border: `1px solid ${selectedSongs.length > 0 ? currentMode.color + '30' : 'rgba(255,255,255,0.04)'}`,
            }}
            whileHover={selectedSongs.length > 0 ? { scale: 1.01 } : {}}
            whileTap={selectedSongs.length > 0 ? { scale: 0.99 } : {}}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-3">
                {/* Concentric expanding rings */}
                <span className="relative w-5 h-5">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="absolute inset-0 rounded-full border"
                      style={{ borderColor: currentMode.color }}
                      animate={{ scale: [0.5, 2], opacity: [0.6, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3, ease: 'easeOut' }}
                    />
                  ))}
                </span>
                {compareMode ? 'Running all 4 engines...' : `Running ${currentMode.label} engine...`}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                {currentMode.icon}
                {selectedSongs.length === 0 ? 'Add songs to get started' : compareMode ? 'Compare All 4 Engines' : `Find via ${currentMode.label}`}
              </span>
            )}
          </motion.button>
        </div>

        {/* === COMPARISON RESULTS === */}
        <AnimatePresence>
          {hasSearched && !isLoading && compareMode && compareData && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <ComparisonGrid data={compareData} onSongClick={onSongClick} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* === SINGLE ENGINE RESULTS === */}
        <AnimatePresence>
          {hasSearched && !isLoading && !compareMode && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

              {/* Mode badge + export */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full" style={{ background: currentMode.color }} />
                <span className="text-xs text-white/30">
                  Results from <span style={{ color: currentMode.color }}>{currentMode.label}</span> engine
                </span>
                {results.length > 0 && (
                  <button
                    onClick={() => {
                      const data = { engine: currentMode.label, seeds: selectedSongs.map(s => s.name), results };
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url; a.download = `recommendations-${currentMode.key}.json`; a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="ml-auto flex items-center gap-1 text-[10px] text-white/25 hover:text-white/50 transition-colors"
                  >
                    <Download size={12} />
                    JSON
                  </button>
                )}
                {results.length > 0 && (
                  <button
                    onClick={async () => {
                      const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                      setSpotifyExporting(true);
                      setSpotifyResult(null);
                      try {
                        const statusRes = await fetch(`${url}/api/spotify/status`);
                        const status = await statusRes.json();
                        if (!status.authenticated) {
                          const popup = window.open(`${url}/api/spotify/login`, 'spotify-auth', 'width=500,height=700');
                          await new Promise<void>((resolve) => {
                            const check = setInterval(() => {
                              if (!popup || popup.closed) { clearInterval(check); resolve(); }
                            }, 500);
                          });
                        }
                        const songs = results.map(r => `${r.name} ${r.artist}`);
                        const res = await fetch(`${url}/api/spotify/create-playlist`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ songs, name: `Shubz-Taylor: ${currentMode.label} Picks`, description: `Generated by The Shubz-Taylor Recommendation Engine using ${currentMode.label} engine` }),
                        });
                        if (res.ok) {
                          const data = await res.json();
                          setSpotifyResult({ url: data.playlist_url, count: data.tracks_added });
                        }
                      } catch (e) { console.error('Spotify export error:', e); }
                      setSpotifyExporting(false);
                    }}
                    disabled={spotifyExporting}
                    className="flex items-center gap-1 text-[10px] text-green-400/40 hover:text-green-400/70 transition-colors"
                  >
                    <Music size={12} />
                    {spotifyExporting ? 'Creating...' : 'Spotify Playlist'}
                  </button>
                )}
              </div>

              {/* Results list */}
              {results.length > 0 && (
                <div className="space-y-2">
                  {results.map((rec, i) => (
                    <motion.div
                      key={`${rec.name}-${rec.artist}-${i}`}
                      initial={{ opacity: 0, x: -10, scale: 0.97 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ delay: 0.1 + i * 0.04 }}
                      className="glass rounded-xl p-4 transition-all duration-300 group cursor-pointer relative overflow-hidden"
                      onClick={() => onSongClick(rec.name)}
                      whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                    >
                      {/* Left accent bar — scales in on hover */}
                      <motion.div
                        className="absolute left-0 top-0 bottom-0 w-[2px]"
                        style={{ background: currentMode.color }}
                        initial={{ scaleY: 0 }}
                        whileHover={{ scaleY: 1 }}
                        transition={{ duration: 0.2 }}
                      />

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${currentMode.color}12` }}>
                          <span style={{ color: currentMode.color }}>{currentMode.icon}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white/80 group-hover:text-white truncate transition-colors">{rec.name}</p>
                          <p className="text-xs text-white/30 truncate">{rec.artist}</p>
                        </div>
                        {rec.similarity !== undefined && (
                          <span className="text-xs font-mono flex-shrink-0" style={{ color: `${currentMode.color}90` }}>
                            {Math.round(rec.similarity * 100)}%
                          </span>
                        )}
                        {rec.hop && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: `${currentMode.color}15`, color: `${currentMode.color}80` }}>
                            {rec.hop}-hop
                          </span>
                        )}
                        <ChevronRight size={14} className="text-white/15 group-hover:text-white/30 flex-shrink-0" />
                      </div>
                      {(rec.explanation || rec.reason) && (
                        <p className="text-[11px] text-white/25 mt-2 pl-13 italic leading-relaxed">
                          {rec.explanation || rec.reason}
                        </p>
                      )}
                      {rec.path && (
                        <p className="text-[10px] text-white/15 mt-1 pl-13 font-mono">
                          Path: {rec.path}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}

              {results.length === 0 && (
                <p className="text-center text-white/20 text-sm py-8">
                  No recommendations found with {currentMode.label} engine. Try different songs or switch engines!
                </p>
              )}
              {spotifyResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-xl p-4 flex items-center gap-3 border border-green-500/20">
                  <Music size={18} className="text-green-400" />
                  <div>
                    <p className="text-sm text-green-400">Playlist created! {spotifyResult.count} tracks added</p>
                    <a href={spotifyResult.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-green-400/60 hover:text-green-400 underline">
                      Open in Spotify
                    </a>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
