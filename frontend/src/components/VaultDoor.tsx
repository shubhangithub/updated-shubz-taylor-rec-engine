'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VaultDoorProps {
  onOpen: () => void;
}

export default function VaultDoor({ onOpen }: VaultDoorProps) {
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [crackWidth, setCrackWidth] = useState(0);
  const [isOpening, setIsOpening] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number; size: number }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate floating dust particles
  useEffect(() => {
    const p = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 20,
      size: Math.random() * 3 + 1,
    }));
    setParticles(p);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || isOpening) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePos({ x, y });

    // Crack widens based on proximity to center
    const distFromCenter = Math.sqrt((x - 0.5) ** 2 + (y - 0.5) ** 2);
    const proximity = Math.max(0, 1 - distFromCenter * 2.5);
    setCrackWidth(proximity);
  }, [isOpening]);

  const handleClick = useCallback(() => {
    if (crackWidth > 0.3) {
      setIsOpening(true);
      setTimeout(onOpen, 1800);
    }
  }, [crackWidth, onOpen]);

  // Touch support
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current || isOpening) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / rect.width;
    const y = (touch.clientY - rect.top) / rect.height;
    setMousePos({ x, y });
    const distFromCenter = Math.sqrt((x - 0.5) ** 2 + (y - 0.5) ** 2);
    setCrackWidth(Math.max(0, 1 - distFromCenter * 2.5));
  }, [isOpening]);

  return (
    <motion.div
      ref={containerRef}
      className="fixed inset-0 z-50 cursor-pointer select-none overflow-hidden"
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onClick={handleClick}
      initial={{ opacity: 1 }}
      animate={isOpening ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 1.5, delay: isOpening ? 0.3 : 0 }}
    >
      {/* Deep black background */}
      <div className="absolute inset-0 bg-[#020202]" />

      {/* Floating dust particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: `rgba(212, 175, 55, ${0.1 + Math.random() * 0.2})`,
          }}
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            opacity: [0.1, 0.4, 0.1],
          }}
          transition={{
            duration: 8 + p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: p.delay,
          }}
        />
      ))}

      {/* Film grain */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.5\'/%3E%3C/svg%3E")', backgroundSize: '128px 128px' }}
      />

      {/* The crack of light */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Central crack glow */}
        <motion.div
          className="relative"
          style={{
            width: `${2 + crackWidth * (isOpening ? 200 : 40)}px`,
            height: isOpening ? '200vh' : '70vh',
          }}
          animate={isOpening ? {
            width: '200vw',
            height: '200vh',
          } : {}}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Outer glow */}
          <div
            className="absolute inset-0 blur-[60px]"
            style={{
              background: `linear-gradient(180deg,
                transparent 0%,
                rgba(212, 175, 55, ${crackWidth * 0.3}) 30%,
                rgba(255, 255, 255, ${crackWidth * 0.5}) 50%,
                rgba(212, 175, 55, ${crackWidth * 0.3}) 70%,
                transparent 100%)`,
            }}
          />

          {/* Mid glow */}
          <div
            className="absolute inset-0 blur-[20px]"
            style={{
              background: `linear-gradient(180deg,
                transparent 10%,
                rgba(255, 248, 220, ${crackWidth * 0.5}) 30%,
                rgba(255, 255, 255, ${crackWidth * 0.8}) 50%,
                rgba(255, 248, 220, ${crackWidth * 0.5}) 70%,
                transparent 90%)`,
            }}
          />

          {/* Sharp center line */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg,
                transparent 15%,
                rgba(255, 255, 255, ${crackWidth * 0.9}) 40%,
                rgba(255, 255, 255, ${crackWidth}) 50%,
                rgba(255, 255, 255, ${crackWidth * 0.9}) 60%,
                transparent 85%)`,
            }}
          />

          {/* Chromatic aberration */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, transparent 15%, rgba(255,100,100,${crackWidth * 0.3}) 40%, rgba(255,100,100,${crackWidth * 0.4}) 50%, transparent 85%)`,
              transform: 'translateX(-3px)',
              filter: 'blur(2px)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, transparent 15%, rgba(100,100,255,${crackWidth * 0.3}) 40%, rgba(100,100,255,${crackWidth * 0.4}) 50%, transparent 85%)`,
              transform: 'translateX(3px)',
              filter: 'blur(2px)',
            }}
          />
        </motion.div>

        {/* Light rays emanating from crack */}
        {crackWidth > 0.2 && (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  width: '2px',
                  height: `${30 + crackWidth * 40}vh`,
                  background: `linear-gradient(${90 + (i - 4) * 15}deg, transparent, rgba(212,175,55,${crackWidth * 0.15}), transparent)`,
                  transform: `rotate(${(i - 4) * 12}deg)`,
                  transformOrigin: 'center',
                  filter: 'blur(3px)',
                }}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: crackWidth, scaleY: 1 }}
                transition={{ duration: 0.5 }}
              />
            ))}
          </>
        )}
      </div>

      {/* Parallax response to mouse */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${mousePos.x * 100}% ${mousePos.y * 100}%,
            rgba(212, 175, 55, ${crackWidth * 0.05}) 0%,
            transparent 50%)`,
        }}
      />

      {/* Explosion on open */}
      {isOpening && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 150 }).map((_, i) => {
            const angle = (i / 150) * Math.PI * 2 + Math.random() * 0.5;
            const speed = 30 + Math.random() * 70;
            const size = 2 + Math.random() * 4;
            return (
              <motion.div
                key={`exp-${i}`}
                className="absolute rounded-full"
                style={{
                  left: '50%', top: '50%',
                  width: size, height: size,
                  background: `rgba(${200 + Math.random() * 55}, ${170 + Math.random() * 85}, ${Math.random() * 100}, 0.8)`,
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos(angle) * speed + 'vw',
                  y: Math.sin(angle) * speed + 'vh',
                  opacity: 0,
                  scale: 0,
                }}
                transition={{ duration: 1.2 + Math.random() * 0.6, ease: 'easeOut' }}
              />
            );
          })}
        </div>
      )}

      {/* Text hint */}
      <AnimatePresence>
        {!isOpening && crackWidth < 0.3 && (
          <motion.div
            className="absolute bottom-12 left-0 right-0 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.4, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 2, duration: 1 }}
          >
            <p className="text-sm tracking-[0.3em] uppercase text-white/40 font-body">
              Move closer to the light
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* "Click to enter" when close enough */}
      <AnimatePresence>
        {!isOpening && crackWidth > 0.3 && (
          <motion.div
            className="absolute bottom-12 left-0 right-0 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-sm tracking-[0.3em] uppercase text-[#D4AF37]/80 font-body animate-pulse-slow">
              Enter the vault
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title that appears subtly */}
      <motion.div
        className="absolute top-1/4 left-0 right-0 text-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: crackWidth > 0.1 ? crackWidth * 0.6 : 0 }}
      >
        <h1
          className="font-display text-5xl md:text-7xl tracking-wider"
          style={{
            color: `rgba(212, 175, 55, ${crackWidth * 0.5})`,
            textShadow: `0 0 ${crackWidth * 40}px rgba(212, 175, 55, ${crackWidth * 0.3})`,
          }}
        >
          The Shubz-Taylor
        </h1>
        <p
          className="mt-4 text-sm tracking-[0.5em] uppercase font-body"
          style={{ color: `rgba(255, 255, 255, ${crackWidth * 0.3})` }}
        >
          Recommendation Engine
        </p>
      </motion.div>
    </motion.div>
  );
}
