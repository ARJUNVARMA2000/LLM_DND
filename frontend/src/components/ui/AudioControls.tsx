import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioStore } from '../../stores/audioStore';

export default function AudioControls() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    masterVolume,
    setMasterVolume,
    musicVolume,
    setMusicVolume,
    sfxVolume,
    setSfxVolume,
    isMuted,
    toggleMute,
  } = useAudioStore();

  return (
    <>
      {/* Mute Toggle Button */}
      <motion.button
        className="fixed bottom-4 right-4 w-12 h-12 bg-[var(--bg-medium)] border border-[var(--border-light)] rounded-lg flex items-center justify-center text-xl z-50 hover:border-[var(--accent-gold)] transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isMuted ? '🔇' : '🔊'}
      </motion.button>

      {/* Audio Settings Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-20 right-4 w-64 bg-[var(--bg-dark)] border border-[var(--border-light)] rounded-lg p-4 z-50 shadow-2xl"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
          >
            <h3 className="font-display text-[var(--text-gold)] mb-4">Audio Settings</h3>

            {/* Master Volume */}
            <div className="mb-4">
              <label className="text-sm text-[var(--text-secondary)] flex justify-between mb-1">
                <span>Master</span>
                <span>{Math.round(masterVolume * 100)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={masterVolume}
                onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                className="w-full accent-[var(--accent-gold)]"
              />
            </div>

            {/* Music Volume */}
            <div className="mb-4">
              <label className="text-sm text-[var(--text-secondary)] flex justify-between mb-1">
                <span>🎵 Music</span>
                <span>{Math.round(musicVolume * 100)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={musicVolume}
                onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                className="w-full accent-[var(--accent-gold)]"
              />
            </div>

            {/* SFX Volume */}
            <div className="mb-4">
              <label className="text-sm text-[var(--text-secondary)] flex justify-between mb-1">
                <span>🔊 Effects</span>
                <span>{Math.round(sfxVolume * 100)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={sfxVolume}
                onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                className="w-full accent-[var(--accent-gold)]"
              />
            </div>

            {/* Mute Button */}
            <button
              onClick={toggleMute}
              className={`w-full py-2 rounded font-display text-sm transition-colors ${
                isMuted
                  ? 'bg-[var(--accent-red)] text-white'
                  : 'bg-[var(--bg-light)] text-[var(--text-primary)] hover:bg-[var(--bg-lighter)]'
              }`}
            >
              {isMuted ? 'Unmute All' : 'Mute All'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

