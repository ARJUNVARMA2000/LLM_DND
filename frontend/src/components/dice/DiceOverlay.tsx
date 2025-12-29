import { Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { useGameStore } from '../../stores/gameStore';

// Lazy load the 3D dice component for better initial load
const Dice3D = lazy(() => import('./Dice3D'));

export default function DiceOverlay() {
  const showDice = useGameStore((s) => s.showDice);
  const currentDiceRoll = useGameStore((s) => s.currentDiceRoll);

  return (
    <AnimatePresence>
      {showDice && currentDiceRoll && (
        <motion.div
          className="fixed inset-0 z-[1500] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" />

          {/* 3D Dice Container */}
          <motion.div
            className="relative w-80 h-80"
            initial={{ scale: 0.5, rotateZ: -30 }}
            animate={{ scale: 1, rotateZ: 0 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', damping: 15 }}
          >
            <Canvas camera={{ position: [0, 3, 5], fov: 50 }}>
              <Suspense fallback={null}>
                <Dice3D 
                  type={currentDiceRoll.type}
                  result={currentDiceRoll.result}
                />
              </Suspense>
            </Canvas>
          </motion.div>

          {/* Result Display */}
          <motion.div
            className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div 
              className={`font-display text-5xl mb-2 ${
                currentDiceRoll.success === true
                  ? 'text-[var(--text-green)]'
                  : currentDiceRoll.success === false
                  ? 'text-[var(--text-red)]'
                  : 'text-[var(--text-gold)]'
              }`}
              style={{ textShadow: '0 0 30px currentColor' }}
            >
              {currentDiceRoll.result}
              {currentDiceRoll.modifier !== undefined && currentDiceRoll.modifier !== 0 && (
                <span className="text-2xl text-[var(--text-secondary)] ml-2">
                  {currentDiceRoll.modifier > 0 ? '+' : ''}{currentDiceRoll.modifier}
                </span>
              )}
            </div>
            {currentDiceRoll.label && (
              <div className="text-[var(--text-secondary)] text-sm">
                {currentDiceRoll.label}
              </div>
            )}
            {currentDiceRoll.success !== undefined && (
              <div className={`font-display text-xl mt-2 ${
                currentDiceRoll.success ? 'text-[var(--text-green)]' : 'text-[var(--text-red)]'
              }`}>
                {currentDiceRoll.success ? 'SUCCESS!' : 'FAILED'}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

