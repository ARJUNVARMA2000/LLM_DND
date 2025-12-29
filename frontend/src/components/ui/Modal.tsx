import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { audioManager } from '../../systems/audio/AudioManager';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const handleClose = () => {
    audioManager.playSfx('ui_close');
    onClose();
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm': return 'max-w-sm';
      case 'lg': return 'max-w-2xl';
      default: return 'max-w-md';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className={`bg-[var(--bg-dark)] border border-[var(--border-light)] rounded-lg w-full ${getSizeClass()} max-h-[80vh] overflow-hidden`}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-[var(--border-dark)]">
              <h2 className="font-display text-xl text-[var(--text-gold)]">{title}</h2>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center text-2xl text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

