'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, TrendingUp, BarChart3, Brain, FileText, ChevronRight } from 'lucide-react';
import { ERA_THEMES, ALL_ERAS } from '@/lib/eraThemes';

interface InsightData {
  acousticness_ucurve: any;
  valence_sentiment: any;
  engine_consensus: any;
  songwriting_density: any;
}

export default function Insights() {
  const [data, setData] = useState<InsightData | null>(null);
  const [failed, setFailed] = useState(false);
  const [activePost, setActivePost] = useState<string | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    fetch(`${url}/api/insights`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('bad status')))
      .then(d => setData(d))
      .catch(() => setFailed(true));
  }, []);

  if (failed) {
    return (
      <div className="fixed inset-0 flex items-center justify-center px-6">
        <p className="text-white/30 font-display text-lg text-center">
          Couldn&apos;t load insights. The backend may be waking up — try again in a minute.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <p className="text-white/30 font-display text-lg">Loading insights...</p>
      </div>
    );
  }

  const posts = [
    { key: 'acousticness_ucurve', data: data.acousticness_ucurve, icon: <TrendingUp size={18} />, color: '#D4AF37' },
    { key: 'valence_sentiment', data: data.valence_sentiment, icon: <BarChart3 size={18} />, color: '#E53E3E' },
    { key: 'engine_consensus', data: data.engine_consensus, icon: <Brain size={18} />, color: '#48BB78' },
    { key: 'songwriting_density', data: data.songwriting_density, icon: <FileText size={18} />, color: '#9F7AEA' },
  ];

  return (
    <div className="fixed inset-0 overflow-y-auto">
      <div className="min-h-screen px-6 md:px-12 pt-20 pb-24 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="font-display text-4xl md:text-5xl text-white/80 mb-2">Insights</h1>
          <p className="text-white/30 text-sm tracking-wider">
            Data science findings from {data.acousticness_ucurve?.n_songs || 323} songs across 19 years of Taylor Swift&apos;s discography. All numbers computed from real Spotify audio features.
          </p>
        </motion.div>

        {/* Blog post cards */}
        <div className="space-y-6">
          {posts.map((post, i) => (
            <motion.div
              key={post.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <InsightPost
                insight={post.data}
                icon={post.icon}
                color={post.color}
                isExpanded={activePost === post.key}
                onToggle={() => setActivePost(activePost === post.key ? null : post.key)}
              />
            </motion.div>
          ))}
        </div>

        {/* Methodology note */}
        <motion.div
          className="mt-12 glass rounded-xl p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/25 mb-2">Methodology</p>
          <p className="text-xs text-white/30 leading-relaxed">
            All audio features are from Spotify&apos;s official API (danceability, energy, valence, acousticness, speechiness, instrumentalness, liveness, tempo, loudness). Audio statistics cover {data.acousticness_ucurve?.n_songs || 317} album songs across 11 of 12 studio-album eras (2006–2024; The Life Of A Showgirl lacks Spotify audio features). Era-level regressions use scipy on era means and are descriptive; song-level correlations report n and p. Lyric-density statistics use raw lyric word counts; the 341 Whisper-synchronized songs power the karaoke view.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function InsightPost({ insight, icon, color, isExpanded, onToggle }: {
  insight: any; icon: React.ReactNode; color: string; isExpanded: boolean; onToggle: () => void;
}) {
  if (!insight) return null;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header — always visible */}
      <button onClick={onToggle} className="w-full text-left p-6 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl flex-shrink-0 mt-0.5" style={{ background: `${color}15` }}>
            <span style={{ color }}>{icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-xl md:text-2xl text-white/85 leading-snug mb-2">
              {insight.title}
            </h2>
            <p className="text-sm text-white/30 italic leading-relaxed">
              {insight.hypothesis}
            </p>
            {/* Key finding preview */}
            {insight.finding && !isExpanded && (
              <p className="text-xs text-white/20 mt-3 line-clamp-2">
                {insight.finding}
              </p>
            )}
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            className="text-white/20 flex-shrink-0 mt-2"
          >
            <ChevronRight size={18} />
          </motion.div>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-6 border-t border-white/[0.04] pt-6">
              {/* Chart */}
              {insight.data_points && (
                <InsightChart dataPoints={insight.data_points} color={color} insight={insight} />
              )}

              {/* Engines list (for engine consensus post) */}
              {insight.engines && (
                <div className="space-y-2">
                  {insight.engines.map((engine: any, i: number) => (
                    <motion.div
                      key={engine.key}
                      className="glass rounded-lg p-3 flex items-center gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: `${color}15`, color }}>
                        {engine.dim}d
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white/70">{engine.name}</p>
                        <p className="text-[10px] text-white/25">{engine.paper} — {engine.expected_bias}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Finding box */}
              {insight.finding && (
                <div className="rounded-xl p-4" style={{ background: `${color}08`, border: `1px solid ${color}15` }}>
                  <p className="text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: `${color}60` }}>Finding</p>
                  <p className="text-sm text-white/60 leading-relaxed">{insight.finding}</p>
                </div>
              )}

              {/* Stats row */}
              <div className="flex flex-wrap gap-4 text-xs text-white/20">
                {insight.n_songs && <span>n = {insight.n_songs} songs</span>}
                {insight.regression?.r_squared && <span>R² = {insight.regression.r_squared} ({insight.n_eras || insight.data_points?.length} era means, descriptive)</span>}
                {insight.trend?.r_squared && <span>R² = {insight.trend.r_squared}{insight.trend.p_value !== undefined ? `, p = ${insight.trend.p_value}` : ''}</span>}
                {insight.valence_lyrics_correlation && <span>r = {insight.valence_lyrics_correlation}{insight.correlation_n ? ` (n = ${insight.correlation_n}, p = ${insight.correlation_p})` : ''}</span>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InsightChart({ dataPoints, color, insight }: { dataPoints: any[]; color: string; insight: any }) {
  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Determine what to plot
  const yKey = insight.title?.includes('Acousticness') ? 'acousticness_mean' :
               insight.title?.includes('Valence') ? 'valence_mean' :
               insight.title?.includes('Density') ? 'avg_words' : 'acousticness_mean';

  const yLabel = insight.title?.includes('Acousticness') ? 'Acousticness' :
                 insight.title?.includes('Valence') ? 'Valence' :
                 insight.title?.includes('Density') ? 'Avg Words' : '';

  const values = dataPoints.map(d => d[yKey] || 0);
  const minY = Math.min(...values) * 0.85;
  const maxY = Math.max(...values) * 1.1;

  return (
    <div className="glass rounded-xl p-4 overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-2xl">
        {/* Y axis */}
        <text x={padding.left - 35} y={height / 2} fill="rgba(255,255,255,0.2)" fontSize={9}
          textAnchor="middle" transform={`rotate(-90, ${padding.left - 35}, ${height / 2})`}>
          {yLabel}
        </text>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const y = padding.top + (1 - t) * chartH;
          const val = minY + t * (maxY - minY);
          return (
            <g key={t}>
              <line x1={padding.left} y1={y} x2={padding.left + chartW} y2={y}
                stroke="rgba(255,255,255,0.04)" />
              <text x={padding.left - 5} y={y + 3} fill="rgba(255,255,255,0.15)" fontSize={8} textAnchor="end">
                {yKey === 'avg_words' ? Math.round(val) : val.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Data points + line */}
        {dataPoints.map((d, i) => {
          const x = padding.left + (i / Math.max(dataPoints.length - 1, 1)) * chartW;
          const y = padding.top + (1 - (d[yKey] - minY) / (maxY - minY)) * chartH;
          const theme = ERA_THEMES[d.era];
          const dotColor = theme?.colors.primary || color;

          return (
            <g key={d.era}>
              {/* Line to next point */}
              {i < dataPoints.length - 1 && (
                <line
                  x1={x}
                  y1={y}
                  x2={padding.left + ((i + 1) / Math.max(dataPoints.length - 1, 1)) * chartW}
                  y2={padding.top + (1 - ((dataPoints[i + 1][yKey] || 0) - minY) / (maxY - minY)) * chartH}
                  stroke={`${color}40`}
                  strokeWidth={1.5}
                />
              )}
              {/* Dot */}
              <circle cx={x} cy={y} r={4} fill={dotColor} opacity={0.8} />
              <circle cx={x} cy={y} r={7} fill={dotColor} opacity={0.15} />
              {/* Era label */}
              <text x={x} y={height - 5} fill="rgba(255,255,255,0.3)" fontSize={7}
                textAnchor="middle" transform={`rotate(-35, ${x}, ${height - 5})`}>
                {d.era?.length > 12 ? d.era.slice(0, 12) + '...' : d.era}
              </text>
              {/* Value label */}
              <text x={x} y={y - 10} fill="rgba(255,255,255,0.4)" fontSize={8} textAnchor="middle">
                {yKey === 'avg_words' ? d[yKey] : (d[yKey] || 0).toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Regression line if U-curve */}
        {insight.regression?.is_u_shaped && (
          <text x={width - padding.right} y={padding.top + 10} fill={`${color}60`} fontSize={8} textAnchor="end">
            R² = {insight.regression.r_squared}
          </text>
        )}
      </svg>
    </div>
  );
}
