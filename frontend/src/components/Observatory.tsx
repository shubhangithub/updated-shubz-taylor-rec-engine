'use client';

import { useState, useMemo, useRef, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TaylorSong } from '@/lib/types';
import { ERA_THEMES, ALL_ERAS } from '@/lib/eraThemes';
import { BarChart3, Palette, Activity, Layers, Search, ChevronDown } from 'lucide-react';

type VisualizationMode = 'spectrum' | 'heartbeat' | 'sculpture' | 'songs';

interface SongFeatures {
  name: string;
  album: string;
  danceability: number;
  energy: number;
  valence: number;
  acousticness: number;
  speechiness: number;
  instrumentalness: number;
  liveness: number;
  loudness: number;
  tempo: number;
}

interface ObservatoryProps {
  onSongClick?: (songName: string) => void;
}

// Fetch all song features from the API
function useSongFeatures() {
  const [songs, setSongs] = useState<SongFeatures[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    fetch(`${url}/api/catalog`)
      .then(r => r.json())
      .then(data => {
        const catalog = data.catalog || [];
        // Now fetch the full dataset for features
        return fetch(`${url}/api/song-data/Tim McGraw`)
          .then(() => catalog); // Just to test connectivity
      })
      .catch(() => [])
      .finally(() => setLoading(false));

    // Load features from the dataset endpoint
    fetch(`${url}/api/all-song-features`)
      .then(r => r.ok ? r.json() : { songs: [] })
      .then(data => {
        if (data.songs && data.songs.length > 0) {
          setSongs(data.songs);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { songs, loading };
}

// Per-era average features computed from actual song data
function computeEraAverages(songs: SongFeatures[]) {
  const eraMap: Record<string, SongFeatures[]> = {};
  for (const s of songs) {
    const era = s.album || 'Unknown';
    if (!eraMap[era]) eraMap[era] = [];
    eraMap[era].push(s);
  }

  const averages: Record<string, Record<string, number>> = {};
  for (const [era, eraSongs] of Object.entries(eraMap)) {
    const keys = ['energy', 'valence', 'acousticness', 'danceability', 'speechiness', 'liveness', 'instrumentalness'] as const;
    const avg: Record<string, number> = {};
    for (const key of keys) {
      avg[key] = eraSongs.reduce((sum, s) => sum + (s[key] || 0), 0) / eraSongs.length;
    }
    avg.tempo = eraSongs.reduce((sum, s) => sum + (s.tempo || 0), 0) / eraSongs.length;
    avg.loudness = eraSongs.reduce((sum, s) => sum + (s.loudness || 0), 0) / eraSongs.length;
    avg.count = eraSongs.length;
    averages[era] = avg;
  }
  return averages;
}

// Per-era static fallback
const ERA_FEATURES: Record<string, { energy: number; valence: number; acousticness: number; danceability: number; tempo: number; speechiness: number }> = {
  'Taylor Swift': { energy: 0.62, valence: 0.45, acousticness: 0.35, danceability: 0.55, tempo: 120, speechiness: 0.03 },
  'Fearless': { energy: 0.65, valence: 0.50, acousticness: 0.28, danceability: 0.56, tempo: 125, speechiness: 0.03 },
  'Speak Now': { energy: 0.63, valence: 0.42, acousticness: 0.22, danceability: 0.52, tempo: 128, speechiness: 0.04 },
  'Red': { energy: 0.65, valence: 0.40, acousticness: 0.25, danceability: 0.55, tempo: 130, speechiness: 0.04 },
  '1989': { energy: 0.70, valence: 0.52, acousticness: 0.12, danceability: 0.65, tempo: 135, speechiness: 0.05 },
  'reputation': { energy: 0.68, valence: 0.38, acousticness: 0.15, danceability: 0.62, tempo: 128, speechiness: 0.08 },
  'Lover': { energy: 0.55, valence: 0.50, acousticness: 0.30, danceability: 0.60, tempo: 120, speechiness: 0.05 },
  'folklore': { energy: 0.38, valence: 0.30, acousticness: 0.65, danceability: 0.45, tempo: 110, speechiness: 0.04 },
  'evermore': { energy: 0.42, valence: 0.32, acousticness: 0.58, danceability: 0.48, tempo: 115, speechiness: 0.04 },
  'Midnights': { energy: 0.50, valence: 0.35, acousticness: 0.40, danceability: 0.58, tempo: 118, speechiness: 0.06 },
  'The Tortured Poets Department': { energy: 0.48, valence: 0.28, acousticness: 0.45, danceability: 0.52, tempo: 115, speechiness: 0.05 },
};

// Context to share dynamic era features across sub-components
const EraFeaturesContext = createContext<Record<string, Record<string, number>>>(ERA_FEATURES);
function useEraFeatures() { return useContext(EraFeaturesContext); }

// ============= SPECTRUM VIEW =============
function SpectrumView({ songs, onSongClick }: { songs: SongFeatures[]; onSongClick?: (name: string) => void }) {
  const eraFeatures = useEraFeatures();
  const [viewMode, setViewMode] = useState<'eras' | 'songs'>('eras');
  const [selectedEra, setSelectedEra] = useState<string | null>(null);

  const eraSongs = useMemo(() => {
    if (!selectedEra) return [];
    return songs.filter(s => s.album === selectedEra);
  }, [songs, selectedEra]);

  function featureToColor(s: { energy: number; valence: number; acousticness: number; danceability: number }): string {
    const hue = s.valence * 60 + s.energy * 30;
    const sat = 30 + s.danceability * 40;
    const lit = 20 + s.acousticness * 30;
    return `hsl(${hue}, ${sat}%, ${lit}%)`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-2xl text-white/80 mb-1">The Discography Spectrum</h3>
          <p className="text-white/30 text-sm">Each bar&apos;s color is derived from sonic DNA. Click an era to see individual songs.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setViewMode('eras'); setSelectedEra(null); }}
            className={`text-xs px-3 py-1.5 rounded-full transition-all ${viewMode === 'eras' ? 'glass text-[#D4AF37]' : 'text-white/30'}`}
          >Eras</button>
          <button
            onClick={() => setViewMode('songs')}
            className={`text-xs px-3 py-1.5 rounded-full transition-all ${viewMode === 'songs' ? 'glass text-[#D4AF37]' : 'text-white/30'}`}
          >All Songs</button>
        </div>
      </div>

      {/* Era-level view */}
      {viewMode === 'eras' && !selectedEra && (
        <div className="space-y-3">
          {ALL_ERAS.map((era, i) => {
            const theme = ERA_THEMES[era];
            const feat = eraFeatures[era];
            if (!feat || !theme) return null;
            const c1 = featureToColor(feat as any);
            const c2 = featureToColor({ ...feat, valence: (feat.valence || 0) + 0.15, energy: (feat.energy || 0) + 0.1 } as any);

            return (
              <motion.button
                key={era}
                className="w-full group cursor-pointer text-left"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => { setSelectedEra(era); setViewMode('eras'); }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-xs text-white/30 w-8 text-right font-mono">{theme.year}</span>
                  <div className="flex-1 relative">
                    <motion.div
                      className="h-10 rounded-lg overflow-hidden"
                      style={{ background: `linear-gradient(90deg, ${c1}, ${c2}, ${theme.colors.primary})` }}
                      whileHover={{ scaleY: 1.4 }}
                      transition={{ duration: 0.2 }}
                    />
                    <div className="absolute inset-0 flex items-center px-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs font-bold text-white drop-shadow-lg">{era}</span>
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Songs within selected era */}
      {viewMode === 'eras' && selectedEra && (
        <div className="space-y-2">
          <button onClick={() => setSelectedEra(null)} className="text-xs text-[#D4AF37]/60 hover:text-[#D4AF37] mb-2">
            ← Back to all eras
          </button>
          <h4 className="font-display text-lg" style={{ color: ERA_THEMES[selectedEra]?.colors.primary }}>
            {selectedEra}
          </h4>
          {eraSongs.map((s, i) => (
            <motion.button
              key={s.name}
              className="w-full text-left group"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => onSongClick?.(s.name)}
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-white/20 w-4 text-right font-mono">{i + 1}</span>
                <div className="flex-1 relative">
                  <div
                    className="h-7 rounded-md overflow-hidden group-hover:h-9 transition-all"
                    style={{ background: `linear-gradient(90deg, ${featureToColor(s)}, ${ERA_THEMES[selectedEra]?.colors.primary}40)` }}
                  />
                  <div className="absolute inset-0 flex items-center px-3">
                    <span className="text-[11px] text-white/70 group-hover:text-white truncate drop-shadow">{s.name}</span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[9px] text-white/30" title="Energy">{Math.round(s.energy * 100)}e</span>
                  <span className="text-[9px] text-white/30" title="Valence">{Math.round(s.valence * 100)}v</span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* All songs flat view */}
      {viewMode === 'songs' && (
        <SongGridView songs={songs} onSongClick={onSongClick} />
      )}
    </div>
  );
}

// ============= SONG GRID VIEW (used in spectrum "all songs" mode) =============
function SongGridView({ songs, onSongClick }: { songs: SongFeatures[]; onSongClick?: (name: string) => void }) {
  const [sortBy, setSortBy] = useState<keyof SongFeatures>('energy');
  const [filterEra, setFilterEra] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');

  const filtered = useMemo(() => {
    let list = [...songs];
    if (filterEra !== 'all') list = list.filter(s => s.album === filterEra);
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      const av = (a[sortBy] as number) || 0;
      const bv = (b[sortBy] as number) || 0;
      return bv - av;
    });
    return list;
  }, [songs, sortBy, filterEra, searchFilter]);

  const sortOptions: { key: keyof SongFeatures; label: string }[] = [
    { key: 'energy', label: 'Energy' },
    { key: 'valence', label: 'Happiness' },
    { key: 'danceability', label: 'Danceability' },
    { key: 'acousticness', label: 'Acoustic' },
    { key: 'tempo', label: 'Tempo' },
    { key: 'speechiness', label: 'Speechiness' },
    { key: 'loudness', label: 'Loudness' },
  ];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="glass rounded-lg px-3 py-1.5 flex items-center gap-2">
          <Search size={12} className="text-white/30" />
          <input
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            placeholder="Filter songs..."
            className="bg-transparent border-none outline-none text-xs text-white/70 placeholder:text-white/20 w-32"
          />
        </div>

        <select
          value={filterEra}
          onChange={e => setFilterEra(e.target.value)}
          className="glass rounded-lg px-3 py-1.5 text-xs text-white/60 bg-transparent border-none outline-none cursor-pointer"
        >
          <option value="all" className="bg-[#111]">All Eras</option>
          {ALL_ERAS.map(era => (
            <option key={era} value={era} className="bg-[#111]">{era}</option>
          ))}
        </select>

        <div className="flex gap-1 ml-auto">
          {sortOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`text-[10px] px-2 py-1 rounded-full transition-all ${
                sortBy === opt.key ? 'glass text-[#D4AF37]' : 'text-white/25 hover:text-white/40'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-white/20">{filtered.length} songs sorted by {sortBy}</p>

      {/* Song bars */}
      <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-2">
        {filtered.map((s, i) => {
          const val = typeof s[sortBy] === 'number' ? s[sortBy] as number : 0;
          // Normalize: loudness is negative (-60 to 0), tempo is 50-200
          let normalized = val;
          if (sortBy === 'loudness') normalized = (val + 60) / 60;
          else if (sortBy === 'tempo') normalized = (val - 50) / 150;
          normalized = Math.max(0, Math.min(1, normalized));

          const theme = ERA_THEMES[s.album];
          const color = theme?.colors.primary || '#666';

          return (
            <motion.button
              key={`${s.name}-${s.album}`}
              className="w-full flex items-center gap-2 group text-left"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * 0.01, 0.5) }}
              onClick={() => onSongClick?.(s.name)}
            >
              <span className="text-[9px] text-white/15 w-5 text-right font-mono">{i + 1}</span>
              <div className="flex-1 h-6 bg-white/[0.02] rounded-md overflow-hidden relative group-hover:bg-white/[0.04] transition-colors">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-md"
                  style={{ background: `${color}60` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${normalized * 100}%` }}
                  transition={{ duration: 0.4, delay: Math.min(i * 0.01, 0.5) }}
                />
                <div className="absolute inset-0 flex items-center px-2 justify-between">
                  <span className="text-[11px] text-white/60 group-hover:text-white/80 truncate transition-colors">
                    {s.name}
                  </span>
                  <span className="text-[9px] text-white/25 font-mono flex-shrink-0 ml-2">
                    {sortBy === 'tempo' ? `${Math.round(val)}` : `${Math.round(normalized * 100)}%`}
                  </span>
                </div>
              </div>
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: color }}
                title={s.album}
              />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ============= HEARTBEAT VIEW =============
function HeartbeatView({ songs }: { songs: SongFeatures[] }) {
  const eraFeatures = useEraFeatures();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredEra, setHoveredEra] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const eraHeight = height / ALL_ERAS.length;

    ALL_ERAS.forEach((era, i) => {
      const features = eraFeatures[era];
      const theme = ERA_THEMES[era];
      if (!features || !theme) return;

      const y = i * eraHeight + eraHeight / 2;
      const amplitude = features.energy * eraHeight * 0.35;
      const frequency = features.tempo / 30;
      const isHovered = hoveredEra === era;

      ctx.beginPath();
      ctx.strokeStyle = theme.colors.primary;
      ctx.lineWidth = isHovered ? 2.5 : 1.5;
      ctx.globalAlpha = isHovered ? 1 : 0.7;

      for (let x = 0; x < width; x++) {
        const t = x / width;
        const wave = Math.sin(t * frequency * Math.PI * 2) * amplitude;
        const noise = Math.sin(t * 47 + i) * amplitude * 0.2;
        const heartbeat = Math.exp(-Math.pow((t * 10 % 1) * 5, 2)) * amplitude * features.energy;
        const py = y + wave + noise + heartbeat * Math.sin(t * 20);
        if (x === 0) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      }
      ctx.stroke();

      ctx.globalAlpha = isHovered ? 0.5 : 0.3;
      ctx.fillStyle = theme.colors.accent;
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText(era, 10, y - eraHeight * 0.3);

      ctx.globalAlpha = isHovered ? 0.2 : 0.1;
      ctx.fillStyle = theme.colors.primary;
      ctx.fillRect(0, y - eraHeight / 2, width * features.energy, 1);
    });
  }, [hoveredEra, eraFeatures]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-2xl text-white/80 mb-1">The Heartbeat</h3>
        <p className="text-white/30 text-sm">Energy and tempo visualized as a heartbeat per era — hover to highlight</p>
      </div>
      <div className="glass rounded-2xl p-6 overflow-hidden relative">
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ height: `${ALL_ERAS.length * 50}px` }}
        />
        {/* Hover zones */}
        {ALL_ERAS.map((era, i) => (
          <div
            key={era}
            className="absolute left-0 right-0 cursor-pointer"
            style={{ top: `${(i / ALL_ERAS.length) * 100}%`, height: `${100 / ALL_ERAS.length}%` }}
            onMouseEnter={() => setHoveredEra(era)}
            onMouseLeave={() => setHoveredEra(null)}
          />
        ))}
      </div>
    </div>
  );
}

// ============= SCULPTURE VIEW (radar comparison) =============
function SculptureView({ songs }: { songs: SongFeatures[] }) {
  const eraFeatures = useEraFeatures();
  const features = ['energy', 'valence', 'acousticness', 'danceability', 'speechiness'] as const;
  const featureLabels = ['Energy', 'Joy', 'Acoustic', 'Dance', 'Speech'];
  const [selectedEras, setSelectedEras] = useState<string[]>(['folklore', '1989', 'reputation']);
  const [compareSongs, setCompareSongs] = useState<string[]>([]);
  const [mode, setMode] = useState<'eras' | 'songs'>('eras');
  const [songSearch, setSongSearch] = useState('');

  const songMatches = useMemo(() => {
    if (!songSearch || songSearch.length < 2) return [];
    const q = songSearch.toLowerCase();
    return songs.filter(s => s.name.toLowerCase().includes(q)).slice(0, 6);
  }, [songs, songSearch]);

  const toggleEra = (era: string) => {
    setSelectedEras(prev => prev.includes(era) ? prev.filter(e => e !== era) : [...prev, era]);
  };

  const toggleSong = (name: string) => {
    setCompareSongs(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : prev.length < 5 ? [...prev, name] : prev
    );
  };

  const size = 380;
  const center = size / 2;
  const radius = size / 2 - 55;

  const normalize = (key: string, value: number) => {
    if (key === 'tempo') return (value - 80) / 80;
    return value;
  };

  // Data to plot
  type PlotItem = { name: string; features: Record<string, number>; color: string };
  const plotData = useMemo((): PlotItem[] => {
    if (mode === 'eras') {
      const items: PlotItem[] = [];
      for (const era of selectedEras) {
        const feat = eraFeatures[era];
        const theme = ERA_THEMES[era];
        if (feat && theme) items.push({ name: era, features: feat, color: theme.colors.primary });
      }
      return items;
    } else {
      const items: PlotItem[] = [];
      const colors = ['#D4AF37', '#E53E3E', '#48BB78', '#4299E1', '#ED8936'];
      compareSongs.forEach((name, idx) => {
        const song = songs.find(s => s.name === name);
        if (song) {
          items.push({ name, features: song as unknown as Record<string, number>, color: colors[idx % colors.length] });
        }
      });
      return items;
    }
  }, [mode, selectedEras, compareSongs, songs, eraFeatures]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-2xl text-white/80 mb-1">Sound Sculpture</h3>
          <p className="text-white/30 text-sm">Compare sonic DNA — eras or individual songs</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMode('eras')} className={`text-xs px-3 py-1.5 rounded-full transition-all ${mode === 'eras' ? 'glass text-[#D4AF37]' : 'text-white/30'}`}>Eras</button>
          <button onClick={() => setMode('songs')} className={`text-xs px-3 py-1.5 rounded-full transition-all ${mode === 'songs' ? 'glass text-[#D4AF37]' : 'text-white/30'}`}>Songs</button>
        </div>
      </div>

      {/* Selectors */}
      {mode === 'eras' ? (
        <div className="flex flex-wrap gap-2">
          {ALL_ERAS.map(era => {
            const theme = ERA_THEMES[era];
            const isSelected = selectedEras.includes(era);
            return (
              <button key={era} onClick={() => toggleEra(era)}
                className="px-3 py-1.5 rounded-full text-xs transition-all"
                style={{
                  background: isSelected ? `${theme?.colors.primary}30` : 'rgba(255,255,255,0.03)',
                  color: isSelected ? theme?.colors.primary : 'rgba(255,255,255,0.3)',
                  border: `1px solid ${isSelected ? theme?.colors.primary + '50' : 'rgba(255,255,255,0.06)'}`,
                }}>{era}</button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="glass rounded-lg px-3 py-2 flex items-center gap-2">
            <Search size={12} className="text-white/30" />
            <input value={songSearch} onChange={e => setSongSearch(e.target.value)}
              placeholder="Search songs to compare (max 5)..."
              className="bg-transparent border-none outline-none text-xs text-white/70 placeholder:text-white/20 w-full" />
          </div>
          {songMatches.length > 0 && (
            <div className="glass rounded-lg overflow-hidden">
              {songMatches.map(s => (
                <button key={s.name} onClick={() => { toggleSong(s.name); setSongSearch(''); }}
                  className="w-full text-left px-3 py-2 text-xs text-white/60 hover:bg-white/5 transition-colors flex justify-between">
                  <span>{s.name}</span>
                  <span className="text-white/20">{s.album}</span>
                </button>
              ))}
            </div>
          )}
          {compareSongs.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {compareSongs.map((name, i) => {
                const colors = ['#D4AF37', '#E53E3E', '#48BB78', '#4299E1', '#ED8936'];
                return (
                  <button key={name} onClick={() => toggleSong(name)}
                    className="px-2 py-1 rounded-full text-[10px] flex items-center gap-1"
                    style={{ background: `${colors[i % colors.length]}20`, color: colors[i % colors.length] }}>
                    {name} ×
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Radar */}
      <div className="glass rounded-2xl p-6 flex items-center justify-center">
        <svg width={size} height={size} className="max-w-full">
          {[0.25, 0.5, 0.75, 1].map(r => (
            <polygon key={r}
              points={features.map((_, i) => {
                const angle = (i / features.length) * Math.PI * 2 - Math.PI / 2;
                return `${center + Math.cos(angle) * radius * r},${center + Math.sin(angle) * radius * r}`;
              }).join(' ')}
              fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
          ))}
          {features.map((_, i) => {
            const angle = (i / features.length) * Math.PI * 2 - Math.PI / 2;
            return <line key={i} x1={center} y1={center}
              x2={center + Math.cos(angle) * radius} y2={center + Math.sin(angle) * radius}
              stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />;
          })}
          {featureLabels.map((label, i) => {
            const angle = (i / features.length) * Math.PI * 2 - Math.PI / 2;
            return <text key={label} x={center + Math.cos(angle) * (radius + 25)} y={center + Math.sin(angle) * (radius + 25)}
              textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.3)" fontSize={11} fontFamily="Inter, sans-serif">{label}</text>;
          })}
          {plotData.map(item => {
            const points = features.map((f, i) => {
              const angle = (i / features.length) * Math.PI * 2 - Math.PI / 2;
              const value = normalize(f, item.features[f] || 0);
              return `${center + Math.cos(angle) * radius * value},${center + Math.sin(angle) * radius * value}`;
            }).join(' ');
            return (
              <g key={item.name}>
                <motion.polygon points={points} fill={`${item.color}15`} stroke={item.color} strokeWidth={1.5}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
                  style={{ transformOrigin: `${center}px ${center}px` }} />
                {features.map((f, i) => {
                  const angle = (i / features.length) * Math.PI * 2 - Math.PI / 2;
                  const value = normalize(f, item.features[f] || 0);
                  return <circle key={`${item.name}-${f}`}
                    cx={center + Math.cos(angle) * radius * value} cy={center + Math.sin(angle) * radius * value}
                    r={3} fill={item.color} />;
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {plotData.map(item => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
            <span className="text-xs text-white/40">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============= SONGS EXPLORER VIEW =============
function SongsExplorerView({ songs, onSongClick }: { songs: SongFeatures[]; onSongClick?: (name: string) => void }) {
  const [xAxis, setXAxis] = useState<keyof SongFeatures>('energy');
  const [yAxis, setYAxis] = useState<keyof SongFeatures>('valence');
  const [hoveredSong, setHoveredSong] = useState<SongFeatures | null>(null);
  const [filterEra, setFilterEra] = useState<string>('all');

  const axes: { key: keyof SongFeatures; label: string }[] = [
    { key: 'energy', label: 'Energy' },
    { key: 'valence', label: 'Happiness' },
    { key: 'danceability', label: 'Danceability' },
    { key: 'acousticness', label: 'Acoustic' },
    { key: 'speechiness', label: 'Speechiness' },
    { key: 'tempo', label: 'Tempo' },
    { key: 'liveness', label: 'Liveness' },
  ];

  const filtered = filterEra === 'all' ? songs : songs.filter(s => s.album === filterEra);

  const normalize = (key: keyof SongFeatures, val: number) => {
    if (key === 'tempo') return (val - 50) / 160;
    if (key === 'loudness') return (val + 60) / 60;
    return val;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-2xl text-white/80 mb-1">Song Explorer</h3>
        <p className="text-white/30 text-sm">Every song plotted — choose your axes. Click any dot.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30">X:</span>
          <select value={xAxis as string} onChange={e => setXAxis(e.target.value as keyof SongFeatures)}
            className="glass rounded-lg px-2 py-1 text-xs text-white/60 bg-transparent border-none outline-none cursor-pointer">
            {axes.map(a => <option key={a.key} value={a.key as string} className="bg-[#111]">{a.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30">Y:</span>
          <select value={yAxis as string} onChange={e => setYAxis(e.target.value as keyof SongFeatures)}
            className="glass rounded-lg px-2 py-1 text-xs text-white/60 bg-transparent border-none outline-none cursor-pointer">
            {axes.map(a => <option key={a.key} value={a.key as string} className="bg-[#111]">{a.label}</option>)}
          </select>
        </div>
        <select value={filterEra} onChange={e => setFilterEra(e.target.value)}
          className="glass rounded-lg px-2 py-1 text-xs text-white/60 bg-transparent border-none outline-none cursor-pointer ml-auto">
          <option value="all" className="bg-[#111]">All Eras</option>
          {ALL_ERAS.map(era => <option key={era} value={era} className="bg-[#111]">{era}</option>)}
        </select>
      </div>

      {/* Scatter plot */}
      <div className="glass rounded-2xl p-6 relative" style={{ height: 420 }}>
        {/* Axis labels */}
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-white/20">
          {axes.find(a => a.key === xAxis)?.label} →
        </span>
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-white/20 -rotate-90 origin-center">
          {axes.find(a => a.key === yAxis)?.label} →
        </span>

        {/* Dots */}
        <svg className="w-full h-full" viewBox="0 0 400 380">
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map(v => (
            <g key={v}>
              <line x1={v * 380 + 10} y1={10} x2={v * 380 + 10} y2={370} stroke="rgba(255,255,255,0.03)" />
              <line x1={10} y1={v * 360 + 10} x2={390} y2={v * 360 + 10} stroke="rgba(255,255,255,0.03)" />
            </g>
          ))}

          {filtered.map((s, i) => {
            const xVal = normalize(xAxis, (s[xAxis] as number) || 0);
            const yVal = normalize(yAxis, (s[yAxis] as number) || 0);
            const x = 10 + xVal * 380;
            const y = 370 - yVal * 360;
            const theme = ERA_THEMES[s.album];
            const color = theme?.colors.primary || '#666';
            const isHovered = hoveredSong?.name === s.name;

            return (
              <g key={`${s.name}-${i}`}>
                <circle
                  cx={x} cy={y}
                  r={isHovered ? 6 : 4}
                  fill={color}
                  opacity={isHovered ? 1 : 0.6}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredSong(s)}
                  onMouseLeave={() => setHoveredSong(null)}
                  onClick={() => onSongClick?.(s.name)}
                />
                {isHovered && (
                  <>
                    <circle cx={x} cy={y} r={12} fill="none" stroke={color} strokeWidth={1} opacity={0.3} />
                    <text x={x + 10} y={y - 8} fill="white" fontSize={10} fontFamily="Inter, sans-serif">
                      {s.name}
                    </text>
                    <text x={x + 10} y={y + 4} fill="rgba(255,255,255,0.4)" fontSize={8} fontFamily="Inter, sans-serif">
                      {s.album}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Era legend */}
      <div className="flex flex-wrap gap-3">
        {(filterEra === 'all' ? ALL_ERAS : [filterEra]).map(era => {
          const theme = ERA_THEMES[era];
          return (
            <div key={era} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: theme?.colors.primary }} />
              <span className="text-[10px] text-white/30">{era}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============= MAIN OBSERVATORY =============
export default function Observatory({ onSongClick }: ObservatoryProps) {
  const [mode, setMode] = useState<VisualizationMode>('songs');
  const { songs, loading } = useSongFeatures();

  // Dynamic era features with API override
  const [eraFeatures, setEraFeatures] = useState<Record<string, Record<string, number>>>(ERA_FEATURES);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    fetch(`${url}/api/era-features`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.eras) {
          // Convert API format to the format ERA_FEATURES uses
          const computed: Record<string, Record<string, number>> = {};
          for (const [era, features] of Object.entries(data.eras) as any) {
            computed[era] = {
              energy: features.energy || 0,
              valence: features.valence || 0,
              acousticness: features.acousticness || 0,
              danceability: features.danceability || 0,
              tempo: features.tempo || 120,
              speechiness: features.speechiness || 0,
            };
          }
          setEraFeatures(prev => ({ ...prev, ...computed }));
        }
      })
      .catch(() => {});
  }, []);

  // Use fallback if API doesn't return song-level data
  const hasSongData = songs.length > 0;

  const modes: { key: VisualizationMode; label: string; icon: React.ReactNode }[] = [
    { key: 'songs', label: 'Explorer', icon: <Search size={16} /> },
    { key: 'spectrum', label: 'Spectrum', icon: <Palette size={16} /> },
    { key: 'sculpture', label: 'Sculpture', icon: <BarChart3 size={16} /> },
    { key: 'heartbeat', label: 'Heartbeat', icon: <Activity size={16} /> },
  ];

  return (
    <EraFeaturesContext.Provider value={eraFeatures}>
      <div className="fixed inset-0 overflow-y-auto">
        <div className="min-h-screen px-6 md:px-12 pt-20 pb-24 max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="font-display text-4xl md:text-5xl text-white/80 mb-2">The Observatory</h1>
            <p className="text-white/30 text-sm tracking-wider">
              {hasSongData ? `${songs.length} songs visualized — ` : ''}Data as art
            </p>
          </motion.div>

          <div className="flex gap-2 mb-10">
            {modes.map(m => (
              <button key={m.key} onClick={() => setMode(m.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs transition-all duration-300 ${
                  mode === m.key ? 'glass text-[#D4AF37]' : 'text-white/30 hover:text-white/50'
                }`}>
                {m.icon}
                <span className="hidden md:inline">{m.label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={mode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              {mode === 'songs' && <SongsExplorerView songs={songs} onSongClick={onSongClick} />}
              {mode === 'spectrum' && <SpectrumView songs={songs} onSongClick={onSongClick} />}
              {mode === 'sculpture' && <SculptureView songs={songs} />}
              {mode === 'heartbeat' && <HeartbeatView songs={songs} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </EraFeaturesContext.Provider>
  );
}
