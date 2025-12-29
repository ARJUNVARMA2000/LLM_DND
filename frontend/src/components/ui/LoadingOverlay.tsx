import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';

export default function LoadingOverlay() {
  const isLoading = useGameStore((s) => s.isLoading);
  const loadingMessage = useGameStore((s) => s.loadingMessage);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="fixed inset-0 bg-[var(--bg-darkest)]/90 flex items-center justify-center z-[2000]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="text-center">
            {/* Spinning Loader */}
            <motion.div
              className="w-16 h-16 border-4 border-[var(--border-dark)] border-t-[var(--accent-gold)] rounded-full mx-auto mb-6"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            
            {/* Loading Text */}
            <motion.p
              className="text-[var(--text-secondary)] italic"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {loadingMessage}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

