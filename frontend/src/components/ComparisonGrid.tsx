'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zap, Users, BookOpen, Sparkles, Award } from 'lucide-react';
import { CompareResponse, ExplainableResult } from '@/lib/types';
import ExplainabilityCard from './ExplainabilityCard';
import AgreementHeatmap from './AgreementHeatmap';

interface ComparisonGridProps {
  data: CompareResponse;
  onSongClick: (name: string) => void;
}

const ENGINE_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  'lyrics_transformer': { label: 'Transformer Lyrics', color: '#E53E3E', icon: <Zap size={16} /> },
  'qwen3_embed': { label: 'Qwen3 Embeddings', color: '#38B2AC', icon: <Zap size={16} /> },
  'clap_audio': { label: 'CLAP Audio', color: '#ECC94B', icon: <Sparkles size={16} /> },
  'vae_latent': { label: 'VAE Latent', color: '#9F7AEA', icon: <Sparkles size={16} /> },
  'graph_node2vec': { label: 'Graph Node2Vec', color: '#48BB78', icon: <Users size={16} /> },
  'ncf': { label: 'Neural Collab', color: '#5B9BD5', icon: <BookOpen size={16} /> },
  'ensemble': { label: 'Ensemble', color: '#ED8936', icon: <BookOpen size={16} /> },
  'contrastive': { label: 'Contrastive SSL', color: '#F687B3', icon: <Sparkles size={16} /> },
};

const ENGINE_ORDER = ['lyrics_transformer', 'qwen3_embed', 'clap_audio', 'vae_latent', 'graph_node2vec', 'ncf', 'ensemble', 'contrastive'];

export default function ComparisonGrid({ data, onSongClick }: ComparisonGridProps) {
  const overlapMap = useMemo(() => {
    const songEngines: Record<string, string[]> = {};
    for (const [engineKey, engineData] of Object.entries(data.engines)) {
      for (const result of engineData.results || []) {
        const key = `${result.name}|||${result.artist}`.toLowerCase();
        if (!songEngines[key]) songEngines[key] = [];
        songEngines[key].push(engineKey);
      }
    }
    return songEngines;
  }, [data]);

  const getOverlapCount = (result: ExplainableResult) => {
    const key = `${result.name}|||${result.artist}`.toLowerCase();
    return overlapMap[key]?.length || 1;
  };

  return (
    <div className="space-y-6 relative">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          className="absolute top-20 -left-20 w-[400px] h-[400px] rounded-full blur-[150px]"
          style={{ background: 'radial-gradient(circle, #D4AF3708, transparent)' }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-40 -right-20 w-[350px] h-[350px] rounded-full blur-[150px]"
          style={{ background: 'radial-gradient(circle, #9F7AEA06, transparent)' }}
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
      </div>

      {/* Seed features summary — hide when the backend returned all-zero
          features (e.g. a Showgirl seed with no Spotify audio data), which
          would otherwise render an empty, all-0% profile. */}
      {data.seed_features && Object.values(data.seed_features).some(v => v > 0) && (
        <motion.div
          initial={{ opacity: 0, filter: 'blur(4px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          className="glass rounded-xl p-4 relative z-10"
        >
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/25 mb-2">Your Songs&apos; Average Audio Profile</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(data.seed_features).filter(([k]) => k !== 'loudness' && k !== 'tempo').map(([key, val], idx) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-12 h-1 bg-white/6 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#D4AF37]/60 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${val * 100}%` }}
                    transition={{ duration: 0.6, delay: idx * 0.05, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-[9px] text-white/30">{key.slice(0, 5)}</span>
                <span className="text-[9px] font-mono text-white/20">{Math.round(val * 100)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 4-column comparison */}
      <div className="overflow-x-auto relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 min-w-0">
        {ENGINE_ORDER.map((engineKey, colIndex) => {
          const meta = ENGINE_META[engineKey];
          const engineData = data.engines[engineKey];
          if (!meta || !engineData) return null;

          return (
            <motion.div
              key={engineKey}
              initial={{ opacity: 0, y: 30, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: colIndex * 0.1, duration: 0.5 }}
              className="space-y-3"
            >
              {/* Column header */}
              <div className="flex items-center gap-2 pb-2 border-b border-white/[0.04]">
                <span style={{ color: meta.color }}>{meta.icon}</span>
                <span className="text-sm font-medium" style={{ color: meta.color }}>{meta.label}</span>
                <span className="text-[10px] text-white/20 ml-auto">
                  {engineData.results?.length || 0} results
                </span>
              </div>

              {/* Results — staggered waterfall */}
              {(engineData.results || []).map((result, i) => {
                const overlap = getOverlapCount(result);
                return (
                  <motion.div
                    key={`${result.name}-${i}`}
                    className="relative"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: colIndex * 0.1 + i * 0.05 }}
                  >
                    {/* Overlap badge — pulses on high agreement */}
                    {overlap > 1 && (
                      <motion.div
                        className="absolute -top-1 -right-1 z-10 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/30"
                        animate={overlap >= 3 ? { scale: [1, 1.1, 1] } : {}}
                        transition={overlap >= 3 ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
                        style={overlap >= 4 ? { boxShadow: '0 0 8px #D4AF3740' } : {}}
                      >
                        <Award size={8} className="text-[#D4AF37]" />
                        <span className="text-[8px] text-[#D4AF37] font-mono">{overlap}/8</span>
                      </motion.div>
                    )}
                    <ExplainabilityCard
                      result={result}
                      engineColor={meta.color}
                      onClick={() => onSongClick(result.name)}
                    />
                  </motion.div>
                );
              })}

              {(!engineData.results || engineData.results.length === 0) && (
                <p className="text-xs text-white/15 text-center py-4">No results</p>
              )}
            </motion.div>
          );
        })}
      </div>
      </div>

      {/* Overlap summary */}
      {Object.values(overlapMap).some(engines => engines.length > 1) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-xl p-4 relative z-10"
        >
          <div className="flex items-center gap-2 mb-2">
            <Award size={14} className="text-[#D4AF37]" />
            <span className="text-xs tracking-[0.15em] uppercase text-white/30">Engine Consensus</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(overlapMap)
              .filter(([, engines]) => engines.length > 1)
              .sort((a, b) => b[1].length - a[1].length)
              .slice(0, 8)
              .map(([key, engines], i) => {
                const [name] = key.split('|||');
                return (
                  <motion.span
                    key={key}
                    className="text-xs px-2.5 py-1 rounded-full bg-white/[0.04] text-white/60 cursor-pointer hover:bg-white/[0.08] transition-colors"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.6 + i * 0.04 }}
                    onClick={() => onSongClick(name)}
                  >
                    {name} <span className="text-[#D4AF37] font-mono ml-1">{engines.length}/8</span>
                  </motion.span>
                );
              })}
          </div>
          <p className="text-[10px] text-white/15 mt-2">
            Songs found by multiple engines are stronger recommendations — different algorithms agree they match.
          </p>
        </motion.div>
      )}

      {/* Agreement Heatmap */}
      <div className="relative z-10">
        <AgreementHeatmap data={data} onSongClick={onSongClick} />
      </div>
    </div>
  );
}
