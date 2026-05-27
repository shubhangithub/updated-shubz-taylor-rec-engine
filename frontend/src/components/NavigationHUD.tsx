'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Clock, Palette, BarChart3, Search, X, ArrowLeft, Star, Sparkles, Cog, Play, BookOpen, TrendingUp } from 'lucide-react';
import { TaylorSong } from '@/lib/types';
import { ERA_THEMES } from '@/lib/eraThemes';

type View = 'vault' | 'constellation' | 'song' | 'eras' | 'mood-rooms' | 'observatory' | 'insights' | 'bridge' | 'recommend' | 'how-it-works' | 'trending';

interface NavigationHUDProps {
  currentView: View;
  onNavigate: (view: View) => void;
  isSearchOpen: boolean;
  onSearchOpen: () => void;
  onSearchClose: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  canGoBack: boolean;
  onBack: () => void;
  catalog: TaylorSong[];
  onSongSelect: (song: TaylorSong) => void;
  onStartTour?: () => void;
  showTourPrompt?: boolean;
  onDismissTourPrompt?: () => void;
}

const NAV_ITEMS: { view: View; icon: React.ReactNode; label: string }[] = [
  { view: 'constellation', icon: <Compass className="w-5 h-5 md:w-[18px] md:h-[18px]" />, label: 'Constellation' },
  { view: 'recommend', icon: <Sparkles className="w-5 h-5 md:w-[18px] md:h-[18px]" />, label: 'Recommend' },
  { view: 'trending', icon: <TrendingUp className="w-5 h-5 md:w-[18px] md:h-[18px]" />, label: 'Trending' },
  { view: 'eras', icon: <Clock className="w-5 h-5 md:w-[18px] md:h-[18px]" />, label: 'Eras' },
  { view: 'observatory', icon: <BarChart3 className="w-5 h-5 md:w-[18px] md:h-[18px]" />, label: 'Observatory' },
  { view: 'insights', icon: <BookOpen className="w-5 h-5 md:w-[18px] md:h-[18px]" />, label: 'Insights' },
  { view: 'how-it-works', icon: <Cog className="w-5 h-5 md:w-[18px] md:h-[18px]" />, label: 'Engine' },
];

export default function NavigationHUD({
  currentView,
  onNavigate,
  isSearchOpen,
  onSearchOpen,
  onSearchClose,
  searchQuery,
  onSearchChange,
  canGoBack,
  onBack,
  catalog,
  onSongSelect,
  onStartTour,
  showTourPrompt,
  onDismissTourPrompt,
}: NavigationHUDProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Autocomplete results
  const results = useMemo(() => {
    if (!searchQuery || searchQuery.length < 1) return [];
    const q = searchQuery.toLowerCase();
    const matches = catalog.filter(s =>
      s.name.toLowerCase().includes(q) || s.album.toLowerCase().includes(q) || s.era.toLowerCase().includes(q)
    );
    // Sort: exact start match first, then by era order
    matches.sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return 0;
    });
    return matches.slice(0, 8);
  }, [searchQuery, catalog]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
      e.preventDefault();
      onSongSelect(results[selectedIndex]);
      onSearchClose();
    } else if (e.key === 'Escape') {
      onSearchClose();
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        // Don't close if clicking the input
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
      {/* Top bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        {/* Left: Back button + Logo */}
        <div className="flex items-center gap-4">
          <AnimatePresence>
            {canGoBack && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={onBack}
                className="glass glass-hover rounded-full p-2 transition-all duration-300"
              >
                <ArrowLeft size={18} className="text-white/60" />
              </motion.button>
            )}
          </AnimatePresence>

          <motion.button
            onClick={() => onNavigate('constellation')}
            className="flex items-center gap-2 group"
            whileHover={{ scale: 1.02 }}
          >
            <span className="text-[#D4AF37] text-lg font-display font-bold tracking-wider">
              ST
            </span>
            <span className="text-white/30 text-xs tracking-[0.3em] uppercase hidden md:block group-hover:text-white/50 transition-colors">
              Shubz-Taylor
            </span>
          </motion.button>
        </div>

        {/* Center: Search with autocomplete */}
        <div className="flex-1 max-w-md mx-2 md:mx-8 relative" ref={dropdownRef}>
          <AnimatePresence mode="wait">
            {isSearchOpen ? (
              <motion.div
                key="search-input"
                initial={{ opacity: 0, scaleX: 0.8 }}
                animate={{ opacity: 1, scaleX: 1 }}
                exit={{ opacity: 0, scaleX: 0.8 }}
                className="relative"
              >
                <div className="glass rounded-2xl px-4 py-2 flex items-center gap-3 focus-within:shadow-[0_0_20px_rgba(212,175,55,0.15)] focus-within:border-[#D4AF37]/20 transition-shadow duration-300">
                  <Search size={16} className="text-white/40 flex-shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search songs, eras, moods..."
                    className="bg-transparent border-none outline-none text-sm text-white/90 placeholder:text-white/20 w-full font-body"
                    autoFocus
                  />
                  <button onClick={onSearchClose} className="text-white/40 hover:text-white/60 flex-shrink-0">
                    <X size={16} />
                  </button>
                </div>

                {/* Autocomplete dropdown */}
                <AnimatePresence>
                  {results.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute top-full left-0 right-0 mt-2 glass rounded-xl overflow-hidden"
                    >
                      {results.map((song, i) => {
                        const theme = ERA_THEMES[song.era];
                        const isSelected = i === selectedIndex;
                        return (
                          <button
                            key={`${song.name}-${song.era}-${i}`}
                            onClick={() => {
                              onSongSelect(song);
                              onSearchClose();
                            }}
                            onMouseEnter={() => setSelectedIndex(i)}
                            className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-all duration-150 ${
                              isSelected ? 'bg-white/8' : 'hover:bg-white/5'
                            }`}
                          >
                            {/* Era color dot */}
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: theme?.colors.primary || '#666' }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-white/80 truncate">
                                {song.is_single && <Star size={10} className="inline mr-1 text-[#D4AF37]/60" />}
                                {highlightMatch(song.name, searchQuery)}
                              </p>
                              <p className="text-[11px] text-white/30 truncate">{song.era}</p>
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.button
                key="search-button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onSearchOpen}
                className="glass glass-hover rounded-full px-4 py-2 flex items-center gap-2 w-full transition-all duration-300"
              >
                <Search size={16} className="text-white/30" />
                <span className="text-white/20 text-sm font-body">Search songs, eras, moods...</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Tour button */}
        <div className="w-24 flex justify-end">
          {onStartTour && (
            <motion.button
              onClick={onStartTour}
              className="glass glass-hover rounded-full px-3.5 py-2 flex items-center gap-2 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Start guided tour"
            >
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Play size={14} className="text-[#D4AF37]" />
              </motion.div>
              <span className="text-[11px] tracking-wider uppercase text-white/50">Tour</span>
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Floating tour prompt — shown on first visit to constellation */}
      <AnimatePresence>
        {showTourPrompt && onStartTour && onDismissTourPrompt && (
          <motion.div
            className="fixed top-20 right-6 z-50"
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 1.5 }}
          >
            <div className="glass rounded-2xl p-4 border border-[#D4AF37]/20 max-w-[220px]"
              style={{ boxShadow: '0 0 30px rgba(212,175,55,0.15)' }}
            >
              <p className="text-sm text-white/80 font-medium mb-1">New here?</p>
              <p className="text-xs text-white/40 leading-relaxed mb-3">
                Take a quick guided tour to discover the constellation, engines, and more.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { onStartTour(); onDismissTourPrompt(); }}
                  className="flex-1 px-3 py-1.5 rounded-full text-xs tracking-wider bg-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/30 transition-colors"
                >
                  Start Tour
                </button>
                <button
                  onClick={onDismissTourPrompt}
                  className="px-3 py-1.5 rounded-full text-xs tracking-wider text-white/30 hover:text-white/50 transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom navigation */}
      <motion.nav
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.8 }}
      >
        <div className="glass rounded-full px-2 py-2 flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = currentView === item.view;
            return (
              <motion.button
                key={item.view}
                onClick={() => onNavigate(item.view)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'text-[#D4AF37]'
                    : 'text-white/40 hover:text-white/70'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 bg-white/5 rounded-full"
                    style={{ boxShadow: '0 0 15px rgba(212,175,55,0.15)' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{item.icon}</span>
                <span className="relative z-10 text-xs tracking-wider hidden md:block font-body">
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.nav>
    </>
  );
}

// Highlight matching text
function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-[#D4AF37]">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}
