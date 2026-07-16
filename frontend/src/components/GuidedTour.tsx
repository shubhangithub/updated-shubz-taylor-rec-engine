'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkipForward, X } from 'lucide-react';

interface GuidedTourProps {
  isActive: boolean;
  onEnd: () => void;
  navigateTo: (view: string) => void;
  loadSongData: (name: string, album?: string) => Promise<any>;
  setSearchQuery: (q: string) => void;
}

interface TourStep {
  narration: string;
  subtext: string;
  action: ((props: GuidedTourProps) => void | Promise<void>) | null;
  duration: number;
}

const TOUR_STEPS: TourStep[] = [
  {
    narration: 'Welcome to The Shubz-Taylor Recommendation Engine',
    subtext: 'A Taylor Swift-centric music discovery platform powered by 8 ML engines',
    action: (props) => props.navigateTo('constellation'),
    duration: 4000,
  },
  {
    narration: 'The Constellation',
    subtext: '300+ Taylor Swift songs mapped in 3D space, clustered by era. Each star is a song.',
    action: (props) => props.setSearchQuery('All Too Well'),
    duration: 4000,
  },
  {
    narration: 'Dive into a song...',
    subtext: 'Click any star to enter its world — lyrics, audio features, cross-artist connections',
    action: async (props) => {
      await props.loadSongData('All Too Well', 'Red');
      props.navigateTo('song');
    },
    duration: 5000,
  },
  {
    narration: '8 ML Recommendation Engines',
    subtext: 'Transformer Lyrics, Qwen3 Embeddings, CLAP Audio, VAE, Node2Vec, Neural Collaborative, Hybrid Ensemble, Contrastive SSL',
    action: (props) => props.navigateTo('recommend'),
    duration: 5000,
  },
  {
    narration: 'Compare engines side-by-side',
    subtext: 'See how different algorithms find different music from the same seed',
    action: null,
    duration: 4000,
  },
  {
    narration: 'The Research Behind It',
    subtext: 'Every engine is backed by peer-reviewed papers with real implementations',
    action: (props) => props.navigateTo('how-it-works'),
    duration: 5000,
  },
  {
    narration: 'Now explore freely!',
    subtext: 'Try the Constellation, Eras Corridor, Observatory, or Recommend page',
    action: (props) => props.navigateTo('constellation'),
    duration: 3000,
  },
];

export default function GuidedTour({
  isActive,
  onEnd,
  navigateTo,
  loadSongData,
  setSearchQuery,
}: GuidedTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);

  const step = TOUR_STEPS[stepIndex];
  const totalSteps = TOUR_STEPS.length;

  const cleanup = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  const runStep = useCallback(
    async (idx: number) => {
      cleanup();
      const s = TOUR_STEPS[idx];
      if (!s) {
        setSearchQuery('');
        onEnd();
        return;
      }

      // Execute step action
      if (s.action) {
        try {
          await s.action({ isActive, onEnd, navigateTo, loadSongData, setSearchQuery });
        } catch {
          // Continue tour even if action fails
        }
      }

      // Animate progress bar
      startTimeRef.current = Date.now();
      setProgress(0);

      const tick = () => {
        const elapsed = Date.now() - startTimeRef.current;
        const pct = Math.min(elapsed / s.duration, 1);
        setProgress(pct);
        if (pct < 1) {
          animFrameRef.current = requestAnimationFrame(tick);
        }
      };
      animFrameRef.current = requestAnimationFrame(tick);

      // Auto-advance
      timerRef.current = setTimeout(() => {
        if (idx + 1 < TOUR_STEPS.length) {
          setStepIndex(idx + 1);
        } else {
          setSearchQuery('');
          onEnd();
        }
      }, s.duration);
    },
    [cleanup, onEnd, isActive, navigateTo, loadSongData, setSearchQuery]
  );

  // Run step when index changes
  useEffect(() => {
    if (isActive) {
      runStep(stepIndex);
    }
    return cleanup;
  }, [stepIndex, isActive, runStep, cleanup]);

  // Reset on activation
  useEffect(() => {
    if (isActive) {
      setStepIndex(0);
      setProgress(0);
    }
  }, [isActive]);

  // Clear the tour's demo search so the constellation isn't left highlighted.
  const endTour = useCallback(() => {
    setSearchQuery('');
    onEnd();
  }, [setSearchQuery, onEnd]);

  const handleNext = () => {
    cleanup();
    if (stepIndex + 1 < totalSteps) {
      setStepIndex(stepIndex + 1);
    } else {
      endTour();
    }
  };

  const handleSkip = () => {
    cleanup();
    endTour();
  };

  return (
    <AnimatePresence>
      {isActive && step && (
        <motion.div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-lg"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="glass rounded-2xl p-5 border border-white/[0.06]">
            {/* Step counter */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] tracking-[0.2em] uppercase text-white/25 font-mono">
                {stepIndex + 1} / {totalSteps}
              </span>
              <button
                onClick={handleSkip}
                className="text-white/25 hover:text-white/50 transition-colors flex items-center gap-1 text-[10px] tracking-wider uppercase"
              >
                <X size={12} />
                Skip Tour
              </button>
            </div>

            {/* Narration */}
            <AnimatePresence mode="wait">
              <motion.div
                key={stepIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="font-display text-lg text-white/90 mb-1">
                  {step.narration}
                </h3>
                <p className="text-sm text-white/40 leading-relaxed">
                  {step.subtext}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Progress bar */}
            <div className="mt-4 mb-3 h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#D4AF37]/60 rounded-full"
                style={{ width: `${progress * 100}%` }}
              />
            </div>

            {/* Next button */}
            <div className="flex justify-end">
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-white/60 hover:text-white/80 text-xs tracking-wider transition-colors"
              >
                <SkipForward size={12} />
                {stepIndex + 1 < totalSteps ? 'Next' : 'Finish'}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
