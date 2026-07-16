'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CompareResponse } from '@/lib/types';

interface AgreementHeatmapProps {
  data: CompareResponse;
  onSongClick: (name: string) => void;
}

const ENGINE_META: Record<string, { label: string; color: string }> = {
  'lyrics_transformer': { label: 'Transformer Lyrics', color: '#E53E3E' },
  'qwen3_embed': { label: 'Qwen3 Embeddings', color: '#38B2AC' },
  'clap_audio': { label: 'CLAP Audio', color: '#ECC94B' },
  'vae_latent': { label: 'VAE Latent', color: '#9F7AEA' },
  'graph_node2vec': { label: 'Graph Node2Vec', color: '#48BB78' },
  'ncf': { label: 'Neural Collab', color: '#5B9BD5' },
  'ensemble': { label: 'Hybrid Ensemble', color: '#ED8936' },
  'contrastive': { label: 'Contrastive SSL', color: '#F687B3' },
};

const ENGINE_ORDER = ['lyrics_transformer', 'qwen3_embed', 'clap_audio', 'vae_latent', 'graph_node2vec', 'ncf', 'ensemble', 'contrastive'];

interface SongColumn {
  key: string;
  name: string;
  artist: string;
  agreementCount: number;
  scores: Record<string, number>;
}

export default function AgreementHeatmap({ data, onSongClick }: AgreementHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ ri: number; ci: number } | null>(null);

  const columns = useMemo(() => {
    const songMap: Record<string, SongColumn> = {};

    for (const [engineKey, engineData] of Object.entries(data.engines)) {
      for (const result of engineData.results || []) {
        const key = `${result.name}|||${result.artist}`.toLowerCase();
        if (!songMap[key]) {
          songMap[key] = { key, name: result.name, artist: result.artist, agreementCount: 0, scores: {} };
        }
        songMap[key].scores[engineKey] = result.similarity ?? 0;
        songMap[key].agreementCount = Object.keys(songMap[key].scores).length;
      }
    }

    return Object.values(songMap).sort((a, b) => {
      if (b.agreementCount !== a.agreementCount) return b.agreementCount - a.agreementCount;
      const maxA = Math.max(...Object.values(a.scores));
      const maxB = Math.max(...Object.values(b.scores));
      return maxB - maxA;
    });
  }, [data]);

  const rowHeaderWidth = 130;
  const cellSize = 36;
  const colHeaderHeight = 80;
  const totalWidth = rowHeaderWidth + columns.length * cellSize;
  const totalHeight = colHeaderHeight + ENGINE_ORDER.length * cellSize;

  const getCellColor = (score: number, exists: boolean) => {
    if (!exists) return '#1a1a1a';
    return `hsl(${score * 120}, 70%, ${20 + score * 30}%)`;
  };

  const handleCellHover = (
    e: React.MouseEvent,
    engineKey: string,
    col: SongColumn,
    score: number,
    exists: boolean,
    ri: number,
    ci: number
  ) => {
    const rect = (e.target as SVGElement).getBoundingClientRect();
    const label = ENGINE_META[engineKey]?.label || engineKey;
    const pct = exists ? `${Math.round(score * 100)}%` : 'not recommended';
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      text: `${label} → ${col.name}: ${pct}`,
    });
    setHoveredCell({ ri, ci });
  };

  if (columns.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className="glass rounded-xl p-4 mt-6"
    >
      <p className="text-[10px] tracking-[0.2em] uppercase text-white/25 mb-4">
        Agreement Heatmap
      </p>

      {/* Scrollable matrix */}
      <div className="overflow-x-auto pb-2">
        <svg
          width={totalWidth}
          height={totalHeight}
          className="block"
          onMouseLeave={() => { setTooltip(null); setHoveredCell(null); }}
        >
          {/* SVG glow filter for hovered cells */}
          <defs>
            <filter id="cell-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Column headers (song names, rotated) */}
          {columns.map((col, ci) => (
            <g key={col.key}>
              <text
                x={rowHeaderWidth + ci * cellSize + cellSize / 2}
                y={colHeaderHeight - 6}
                textAnchor="end"
                fontSize={9}
                fill={hoveredCell?.ci === ci ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)'}
                transform={`rotate(-45, ${rowHeaderWidth + ci * cellSize + cellSize / 2}, ${colHeaderHeight - 6})`}
                className="cursor-pointer select-none transition-colors"
                onClick={() => onSongClick(col.name)}
              >
                {col.name.length > 16 ? col.name.slice(0, 15) + '...' : col.name}
              </text>
            </g>
          ))}

          {/* Row headers (engine names) + cells */}
          {ENGINE_ORDER.map((engineKey, ri) => {
            const meta = ENGINE_META[engineKey];
            if (!meta) return null;
            const y = colHeaderHeight + ri * cellSize;
            const isRowHovered = hoveredCell?.ri === ri;

            return (
              <g key={engineKey}>
                {/* Row header — engine dot pulses on hover */}
                <circle
                  cx={12}
                  cy={y + cellSize / 2}
                  r={isRowHovered ? 6 : 4}
                  fill={meta.color}
                  style={{ transition: 'r 0.2s ease' }}
                />
                <text
                  x={22}
                  y={y + cellSize / 2 + 3}
                  fontSize={10}
                  fill={meta.color}
                  opacity={isRowHovered ? 1 : 0.8}
                  className="select-none"
                >
                  {meta.label}
                </text>

                {/* Cells — wave-fill entry + hover glow */}
                {columns.map((col, ci) => {
                  const exists = engineKey in col.scores;
                  const score = col.scores[engineKey] ?? 0;
                  const cx = rowHeaderWidth + ci * cellSize;
                  const isHovered = hoveredCell?.ri === ri && hoveredCell?.ci === ci;

                  return (
                    <motion.rect
                      key={col.key}
                      x={cx + 1}
                      y={y + 1}
                      width={cellSize - 2}
                      height={cellSize - 2}
                      rx={3}
                      fill={getCellColor(score, exists)}
                      className="cursor-pointer"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: isHovered ? 1 : 0.9 }}
                      transition={{ delay: ri * 0.04 + ci * 0.02, duration: 0.3 }}
                      filter={isHovered ? 'url(#cell-glow)' : undefined}
                      stroke={isHovered ? getCellColor(score, exists) : 'none'}
                      strokeWidth={isHovered ? 1.5 : 0}
                      strokeOpacity={0.5}
                      onMouseEnter={(e) => handleCellHover(e, engineKey, col, score, exists, ri, ci)}
                      onMouseLeave={() => { setTooltip(null); setHoveredCell(null); }}
                      onClick={() => onSongClick(col.name)}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none px-2.5 py-1.5 rounded-lg bg-black/90 border border-white/10 text-[11px] text-white/80 whitespace-nowrap"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Consensus summary — spring pop-in */}
      <div className="mt-4 flex flex-wrap gap-2">
        {columns
          .filter((col) => col.agreementCount > 1)
          .slice(0, 10)
          .map((col, i) => (
            <motion.button
              key={col.key}
              onClick={() => onSongClick(col.name)}
              className="text-xs px-2.5 py-1 rounded-full bg-white/[0.04] text-white/60 hover:bg-white/[0.08] transition-colors"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.8 + i * 0.04 }}
            >
              {col.name}{' '}
              <span className="text-[#D4AF37] font-mono ml-1">
                {col.agreementCount}/8
              </span>
            </motion.button>
          ))}
      </div>
      {columns.some((c) => c.agreementCount > 1) && (
        <p className="text-[10px] text-white/15 mt-2">
          Songs found by more engines appear first. Color intensity shows similarity score.
        </p>
      )}
    </motion.div>
  );
}
