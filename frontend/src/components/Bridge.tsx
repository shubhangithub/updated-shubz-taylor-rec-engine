'use client';

import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ERA_THEMES } from '@/lib/eraThemes';
import { EditorialBridge, Song } from '@/lib/types';
import { ExternalLink, ChevronRight, Sparkles, Zap } from 'lucide-react';

interface BridgeProps {
  taylorSong: {
    name: string;
    album: string;
    image?: string | null;
    features?: Record<string, number>;
  };
  bridge: EditorialBridge;
  onExploreNext?: (artistSong: string) => void;
}

// Animated connection line between two songs
function ConnectionBeam({ color1, color2 }: { color1: string; color2: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    let frame = 0;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      frame++;

      // Draw flowing energy along the bridge
      const y = height / 2;

      // Background beam
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, color1 + '30');
      gradient.addColorStop(0.5, '#ffffff20');
      gradient.addColorStop(1, color2 + '30');

      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.moveTo(0, y);

      for (let x = 0; x < width; x++) {
        const t = x / width;
        const wave = Math.sin(t * 8 + frame * 0.03) * 8;
        const pulse = Math.sin(t * 3 + frame * 0.02) * 4;
        ctx.lineTo(x, y + wave + pulse);
      }
      ctx.stroke();

      // Traveling particles
      for (let i = 0; i < 5; i++) {
        const particleX = ((frame * 2 + i * width / 5) % width);
        const t = particleX / width;
        const py = y + Math.sin(t * 8 + frame * 0.03) * 8 + Math.sin(t * 3 + frame * 0.02) * 4;

        const particleColor = t < 0.5 ? color1 : color2;
        const alpha = Math.sin(t * Math.PI) * 0.8;

        ctx.beginPath();
        ctx.arc(particleX, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = particleColor + Math.round(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(particleX, py, 8, 0, Math.PI * 2);
        ctx.fillStyle = particleColor + Math.round(alpha * 50).toString(16).padStart(2, '0');
        ctx.fill();
      }

      requestAnimationFrame(animate);
    };

    const animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [color1, color2]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-20"
    />
  );
}

// Shared features visualization
function SharedFeatures({ features }: { features: string[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {features.map((feature, i) => (
        <motion.span
          key={feature}
          className="text-xs px-3 py-1 rounded-full glass text-white/50"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1 + i * 0.1 }}
        >
          <Zap size={10} className="inline mr-1" />
          {feature}
        </motion.span>
      ))}
    </div>
  );
}

export default function Bridge({ taylorSong, bridge, onExploreNext }: BridgeProps) {
  const taylorTheme = ERA_THEMES[taylorSong.album] || ERA_THEMES['Midnights'];
  const taylorColor = taylorTheme?.colors.primary || '#D4AF37';
  const bridgeColor = '#5B9BD5'; // Default blue for other artists

  // Derive shared qualities from the bridge reason
  const sharedQualities = bridge.reason
    .split(/[,—–-]/)
    .map(s => s.trim())
    .filter(s => s.length > 5 && s.length < 40)
    .slice(0, 4);

  return (
    <div className="fixed inset-0 flex items-center justify-center px-6">
      {/* Background atmosphere */}
      <div className="absolute inset-0">
        {/* Left glow — Taylor */}
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <div
            className="absolute right-0 top-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[150px]"
            style={{ background: `${taylorColor}15` }}
          />
        </motion.div>

        {/* Right glow — Other artist */}
        <motion.div
          className="absolute right-0 top-0 bottom-0 w-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[150px]"
            style={{ background: `${bridgeColor}15` }}
          />
        </motion.div>
      </div>

      {/* Bridge content */}
      <div className="relative z-10 w-full max-w-4xl">
        <div className="flex items-center gap-4 md:gap-8">
          {/* Left: Taylor song */}
          <motion.div
            className="flex-1 text-right"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="glass rounded-2xl p-6 inline-block text-right ml-auto">
              {taylorSong.image && (
                <div className="holographic rounded-lg overflow-hidden w-24 h-24 ml-auto mb-4">
                  <img src={taylorSong.image} alt={taylorSong.name} className="w-full h-full object-cover" />
                </div>
              )}
              <h3 className="font-display text-xl font-bold" style={{ color: taylorColor }}>
                {taylorSong.name}
              </h3>
              <p className="text-white/40 text-sm">Taylor Swift</p>
              <p className="text-xs mt-1" style={{ color: `${taylorColor}60` }}>{taylorSong.album}</p>
            </div>
          </motion.div>

          {/* Center: Bridge */}
          <motion.div
            className="flex-shrink-0 w-32 md:w-48"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <ConnectionBeam color1={taylorColor} color2={bridgeColor} />
          </motion.div>

          {/* Right: Bridge song */}
          <motion.div
            className="flex-1"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="glass rounded-2xl p-6 inline-block">
              <div className="w-24 h-24 rounded-lg mb-4 flex items-center justify-center"
                style={{ background: `${bridgeColor}15` }}
              >
                <span className="text-3xl">🎵</span>
              </div>
              <h3 className="font-display text-xl font-bold" style={{ color: bridgeColor }}>
                {bridge.song}
              </h3>
              <p className="text-white/40 text-sm">{bridge.artist}</p>
              <p className="text-xs text-white/20 mt-1">{bridge.mood}</p>
            </div>
          </motion.div>
        </div>

        {/* Connection reason */}
        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles size={14} className="text-[#D4AF37]" />
            <span className="text-xs tracking-[0.3em] uppercase text-white/30">The Connection</span>
            <Sparkles size={14} className="text-[#D4AF37]" />
          </div>
          <p className="font-display text-lg md:text-xl text-white/70 italic max-w-lg mx-auto leading-relaxed">
            &ldquo;{bridge.reason}&rdquo;
          </p>
        </motion.div>

        {/* Shared qualities */}
        <motion.div
          className="mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <SharedFeatures features={sharedQualities} />
        </motion.div>

        {/* Explore more */}
        {onExploreNext && (
          <motion.div
            className="text-center mt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <button
              onClick={() => onExploreNext(bridge.song)}
              className="glass glass-hover rounded-full px-6 py-3 text-sm flex items-center gap-2 mx-auto transition-all duration-300 text-white/50 hover:text-white/80"
            >
              <span>Continue the chain</span>
              <ChevronRight size={16} />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
