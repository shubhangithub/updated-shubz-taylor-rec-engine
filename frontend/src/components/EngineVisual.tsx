'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

interface EngineVisualProps {
  onClick: () => void;
}

export default function EngineVisual({ onClick }: EngineVisualProps) {
  const [hovered, setHovered] = useState(false);

  // Ambient sparkles around the core
  const sparkles = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      angle: (i / 8) * Math.PI * 2,
      r: 65 + Math.random() * 35,
      size: 1.5 + Math.random() * 1.5,
      delay: i * 0.4,
      duration: 3 + Math.random() * 2,
    })), []);

  const outerDuration = hovered ? 10 : 22;
  const innerDuration = hovered ? 6 : 14;

  return (
    <motion.div
      className="cursor-pointer select-none"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="relative w-full max-w-2xl mx-auto">
        <svg viewBox="0 0 800 500" className="w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-strong">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="pipe-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#D4AF3720" />
              <stop offset="50%" stopColor="#D4AF3750" />
              <stop offset="100%" stopColor="#D4AF3720" />
            </linearGradient>
            <radialGradient id="core-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(212,175,55,0.3)" />
              <stop offset="100%" stopColor="rgba(212,175,55,0)" />
            </radialGradient>
          </defs>

          {/* Background grid */}
          <g opacity="0.03">
            {Array.from({ length: 40 }).map((_, i) => (
              <line key={`h${i}`} x1={0} y1={i * 13} x2={800} y2={i * 13} stroke="white" strokeWidth={0.5} />
            ))}
            {Array.from({ length: 62 }).map((_, i) => (
              <line key={`v${i}`} x1={i * 13} y1={0} x2={i * 13} y2={500} stroke="white" strokeWidth={0.5} />
            ))}
          </g>

          {/* === INPUT STAGE (Left) === */}
          <text x={80} y={60} fill="rgba(255,255,255,0.25)" fontSize={10} fontFamily="Inter, sans-serif" textAnchor="middle" letterSpacing="3">INPUT</text>

          {[0, 1, 2].map(i => {
            const y = 120 + i * 80;
            const labels = ['Audio Features', 'Seed Songs', 'Song Metadata'];
            const icons = ['♪', '♥', '◈'];
            return (
              <g key={`input-${i}`}>
                <rect x={20} y={y - 20} width={120} height={40} rx={8}
                  fill="rgba(255,255,255,0.03)" stroke="rgba(212,175,55,0.2)" strokeWidth={1} />
                <text x={40} y={y + 4} fill="rgba(212,175,55,0.6)" fontSize={14}>{icons[i]}</text>
                <text x={56} y={y + 4} fill="rgba(255,255,255,0.5)" fontSize={10} fontFamily="Inter, sans-serif">{labels[i]}</text>
                <line x1={140} y1={y} x2={230} y2={250} stroke="url(#pipe-grad)" strokeWidth={1.5} />
                {/* Flow particle — framer-motion animated */}
                <motion.circle
                  r={2.5}
                  fill="#D4AF37"
                  opacity={0.6}
                  filter="url(#glow)"
                  animate={{
                    cx: [140, 230],
                    cy: [y, 250],
                  }}
                  transition={{
                    duration: 2.5 - i * 0.3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.6,
                  }}
                />
              </g>
            );
          })}

          {/* === PROCESSING CORE (Center) === */}
          <g transform="translate(350, 250)">
            {/* Core glow — breathing */}
            <motion.circle
              cx={0} cy={0}
              fill="url(#core-grad)"
              animate={{ r: [85, 95, 85] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Outer ring gear — smooth rotation via framer-motion */}
            <motion.g
              animate={{ rotate: 360 }}
              transition={{ duration: outerDuration, repeat: Infinity, ease: 'linear' }}
            >
              <circle cx={0} cy={0} r={85} fill="none" stroke="rgba(212,175,55,0.15)" strokeWidth={2} />
              {Array.from({ length: 24 }).map((_, i) => {
                const angle = (i / 24) * Math.PI * 2;
                return (
                  <line key={i}
                    x1={Math.cos(angle) * 80} y1={Math.sin(angle) * 80}
                    x2={Math.cos(angle) * 90} y2={Math.sin(angle) * 90}
                    stroke="rgba(212,175,55,0.2)" strokeWidth={3}
                  />
                );
              })}
            </motion.g>

            {/* Inner gear — counter-rotation */}
            <motion.g
              animate={{ rotate: -360 }}
              transition={{ duration: innerDuration, repeat: Infinity, ease: 'linear' }}
            >
              <circle cx={0} cy={0} r={50} fill="none" stroke="rgba(212,175,55,0.25)" strokeWidth={2} />
              {Array.from({ length: 16 }).map((_, i) => {
                const angle = (i / 16) * Math.PI * 2;
                return (
                  <line key={i}
                    x1={Math.cos(angle) * 45} y1={Math.sin(angle) * 45}
                    x2={Math.cos(angle) * 55} y2={Math.sin(angle) * 55}
                    stroke="rgba(212,175,55,0.3)" strokeWidth={2.5}
                  />
                );
              })}
            </motion.g>

            {/* Center hub — breathing pulse */}
            <motion.circle
              cx={0} cy={0}
              fill="rgba(212,175,55,0.05)" stroke="rgba(212,175,55,0.4)" strokeWidth={1.5}
              animate={{ r: [25, 28, 25] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.circle
              cx={0} cy={0}
              fill="rgba(212,175,55,0.3)" filter="url(#glow)"
              animate={{ r: [7, 9, 7], opacity: [0.25, 0.4, 0.25] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Ambient sparkles around the core */}
            {sparkles.map((s, i) => (
              <motion.circle
                key={`sparkle-${i}`}
                cx={Math.cos(s.angle) * s.r}
                cy={Math.sin(s.angle) * s.r}
                r={s.size}
                fill="#D4AF37"
                animate={{ opacity: [0, 0.6, 0] }}
                transition={{ duration: s.duration, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }}
              />
            ))}

            {/* Core label */}
            <text x={0} y={-105} fill="rgba(255,255,255,0.25)" fontSize={10} fontFamily="Inter, sans-serif" textAnchor="middle" letterSpacing="3">PROCESSING</text>

            {/* Algorithm labels — slow orbit */}
            {['Cosine Similarity', 'Feature Extraction', 'Normalization'].map((label, i) => (
              <motion.g
                key={label}
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: 'linear', delay: (i / 3) * 20 }}
              >
                <text
                  x={0} y={-68}
                  fill="rgba(212,175,55,0.35)" fontSize={7}
                  fontFamily="JetBrains Mono, monospace" textAnchor="middle"
                >
                  {label}
                </text>
              </motion.g>
            ))}
          </g>

          {/* === ANALYSIS MODULES === */}
          <g>
            <rect x={280} y={70} width={140} height={50} rx={6}
              fill="rgba(255,255,255,0.02)" stroke="rgba(91,155,213,0.3)" strokeWidth={1} />
            <text x={350} y={90} fill="rgba(91,155,213,0.6)" fontSize={9} fontFamily="Inter, sans-serif" textAnchor="middle">Content-Based</text>
            <text x={350} y={104} fill="rgba(91,155,213,0.4)" fontSize={8} fontFamily="JetBrains Mono, monospace" textAnchor="middle">Filtering</text>
            <line x1={350} y1={120} x2={350} y2={165} stroke="rgba(91,155,213,0.15)" strokeWidth={1} strokeDasharray="4 4" />
          </g>

          <g>
            <rect x={280} y={380} width={140} height={50} rx={6}
              fill="rgba(255,255,255,0.02)" stroke="rgba(72,187,120,0.3)" strokeWidth={1} />
            <text x={350} y={400} fill="rgba(72,187,120,0.6)" fontSize={9} fontFamily="Inter, sans-serif" textAnchor="middle">Neural Song-Pair</text>
            <text x={350} y={414} fill="rgba(72,187,120,0.4)" fontSize={8} fontFamily="JetBrains Mono, monospace" textAnchor="middle">(NCF-style, synthetic pairs)</text>
            <line x1={350} y1={380} x2={350} y2={340} stroke="rgba(72,187,120,0.15)" strokeWidth={1} strokeDasharray="4 4" />
          </g>

          <g>
            <rect x={470} y={170} width={100} height={40} rx={6}
              fill="rgba(255,255,255,0.02)" stroke="rgba(237,137,54,0.3)" strokeWidth={1} />
            <text x={520} y={193} fill="rgba(237,137,54,0.5)" fontSize={8} fontFamily="Inter, sans-serif" textAnchor="middle">Knowledge-Based</text>
            <line x1={470} y1={190} x2={435} y2={230} stroke="rgba(237,137,54,0.15)" strokeWidth={1} strokeDasharray="4 4" />
          </g>

          <g>
            <rect x={470} y={290} width={100} height={40} rx={6}
              fill="rgba(255,255,255,0.02)" stroke="rgba(159,122,234,0.3)" strokeWidth={1} />
            <text x={520} y={313} fill="rgba(159,122,234,0.5)" fontSize={8} fontFamily="Inter, sans-serif" textAnchor="middle">Editorial Curation</text>
            <line x1={470} y1={310} x2={435} y2={270} stroke="rgba(159,122,234,0.15)" strokeWidth={1} strokeDasharray="4 4" />
          </g>

          {/* === OUTPUT STAGE (Right) === */}
          <text x={700} y={60} fill="rgba(255,255,255,0.25)" fontSize={10} fontFamily="Inter, sans-serif" textAnchor="middle" letterSpacing="3">OUTPUT</text>

          {[0, 1, 2].map(i => {
            const y = 140 + i * 70;
            const labels = ['Ranked Songs', 'Cross-Artist Bridges', 'Mood Matches'];
            return (
              <g key={`output-${i}`}>
                <line x1={435} y1={250} x2={630} y2={y} stroke="url(#pipe-grad)" strokeWidth={1.5} />
                <motion.circle
                  r={2.5}
                  fill="#D4AF37"
                  opacity={0.5}
                  filter="url(#glow)"
                  animate={{
                    cx: [435, 630],
                    cy: [250, y],
                  }}
                  transition={{
                    duration: 2.5 + i * 0.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.5,
                  }}
                />
                <rect x={630} y={y - 18} width={140} height={36} rx={8}
                  fill="rgba(255,255,255,0.03)" stroke="rgba(212,175,55,0.15)" strokeWidth={1} />
                <text x={700} y={y + 4} fill="rgba(255,255,255,0.45)" fontSize={9} fontFamily="Inter, sans-serif" textAnchor="middle">{labels[i]}</text>
              </g>
            );
          })}

          {/* Bottom label */}
          <text x={400} y={475} fill={hovered ? 'rgba(212,175,55,0.7)' : 'rgba(255,255,255,0.2)'} fontSize={11}
            fontFamily="Inter, sans-serif" textAnchor="middle" letterSpacing="2"
            style={{ transition: 'fill 0.3s' }}>
            {hovered ? 'CLICK TO EXPLORE HOW IT WORKS' : 'THE RECOMMENDATION ENGINE'}
          </text>

          {hovered && (
            <rect x={0} y={0} width={800} height={500} fill="rgba(212,175,55,0.02)" rx={12} />
          )}
        </svg>
      </div>
    </motion.div>
  );
}
