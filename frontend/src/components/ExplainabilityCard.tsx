'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { ChevronDown, Zap } from 'lucide-react';
import { ExplainableResult, FeatureBreakdown } from '@/lib/types';

interface ExplainabilityCardProps {
  result: ExplainableResult;
  engineColor: string;
  onClick?: () => void;
}

const FEATURE_LABELS: Record<string, string> = {
  danceability: 'Dance',
  energy: 'Energy',
  valence: 'Joy',
  acousticness: 'Acoustic',
  speechiness: 'Speech',
  instrumentalness: 'Instr.',
  liveness: 'Live',
  loudness: 'Loud',
  tempo: 'Tempo',
};

// Animated percentage counter
function AnimatedScore({ value, color }: { value: number; color: string }) {
  const motionVal = useMotionValue(0);
  const display = useTransform(motionVal, (v) => `${Math.round(v)}%`);

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration: 0.8,
      ease: 'easeOut',
    });
    return controls.stop;
  }, [value, motionVal]);

  return (
    <motion.span className="text-xs font-mono flex-shrink-0" style={{ color: `${color}90` }}>
      {display}
    </motion.span>
  );
}

export default function ExplainabilityCard({ result, engineColor, onClick }: ExplainabilityCardProps) {
  const [expanded, setExpanded] = useState(false);

  const hasBreakdown = result.feature_breakdown && Object.keys(result.feature_breakdown).length > 0;
  const hasReason = !!result.reason;

  return (
    <motion.div
      className="glass rounded-xl overflow-hidden group transition-colors duration-300"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        backgroundColor: 'rgba(255,255,255,0.03)',
        boxShadow: `0 0 20px ${engineColor}15`,
      }}
      transition={{ duration: 0.2 }}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={onClick}>
        {result.image ? (
          <img src={result.image} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: `${engineColor}12` }}>
            <Zap size={14} style={{ color: engineColor }} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-white/80 truncate group-hover:text-white transition-colors">{result.name}</p>
          <p className="text-xs text-white/30 truncate">{result.artist}</p>
        </div>
        {result.similarity !== undefined && (
          <AnimatedScore value={Math.round(result.similarity * 100)} color={engineColor} />
        )}
        {(hasBreakdown || hasReason) && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/5 transition-all"
          >
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
              <ChevronDown size={14} />
            </motion.div>
          </button>
        )}
      </div>

      {/* Top factors pills — spring pop-in */}
      {result.top_factors && result.top_factors.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {result.top_factors.map((f, i) => (
            <motion.span
              key={i}
              className="text-[9px] px-2 py-0.5 rounded-full"
              style={{ background: `${engineColor}12`, color: `${engineColor}80` }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: i * 0.05 }}
            >
              {f}
            </motion.span>
          ))}
        </div>
      )}

      {/* Expanded: feature breakdown or reason */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -5 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -5 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-white/[0.04] space-y-3">
              {/* Editorial reason */}
              {hasReason && (
                <motion.p
                  className="text-xs text-white/40 italic leading-relaxed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  &ldquo;{result.reason}&rdquo;
                </motion.p>
              )}

              {/* Feature breakdown bars — animated fill */}
              {hasBreakdown && (
                <div className="space-y-1.5">
                  <p className="text-[9px] tracking-[0.2em] uppercase text-white/20">Feature Comparison</p>
                  {Object.entries(result.feature_breakdown!).map(([key, breakdown], idx) => {
                    const label = FEATURE_LABELS[key] || key;
                    let seedDisplay = breakdown.seed;
                    let matchDisplay = breakdown.match;
                    if (key === 'loudness') {
                      seedDisplay = (breakdown.seed + 60) / 60;
                      matchDisplay = (breakdown.match + 60) / 60;
                    } else if (key === 'tempo') {
                      seedDisplay = (breakdown.seed - 50) / 150;
                      matchDisplay = (breakdown.match - 50) / 150;
                    }

                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-[9px] text-white/25 w-12 text-right">{label}</span>
                        <div className="flex-1 flex gap-0.5">
                          {/* Seed bar — animated width */}
                          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden" title={`Your pick: ${Math.round(seedDisplay * 100)}%`}>
                            <motion.div
                              className="h-full rounded-full bg-white/20"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(Math.abs(seedDisplay) * 100, 100)}%` }}
                              transition={{ duration: 0.5, delay: idx * 0.05, ease: 'easeOut' }}
                            />
                          </div>
                          {/* Match bar — animated width */}
                          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden" title={`Match: ${Math.round(matchDisplay * 100)}%`}>
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: engineColor }}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(Math.abs(matchDisplay) * 100, 100)}%` }}
                              transition={{ duration: 0.5, delay: idx * 0.05 + 0.1, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                        <span className="text-[8px] font-mono w-8 text-right"
                          style={{ color: breakdown.closeness > 0.8 ? '#48BB78' : breakdown.closeness > 0.5 ? '#D4AF37' : '#E53E3E' }}>
                          {Math.round(breakdown.closeness * 100)}%
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-3 mt-1 text-[8px] text-white/15">
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-white/20 rounded" /> Your pick</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded" style={{ background: engineColor }} /> This match</span>
                    <span className="ml-auto">Green = close match</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
