import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { checkStatus, getModels, setModel, loadGame } from '../../api/client';
import Button from '../ui/Button';
import type { ModelInfo } from '../../types';

export default function TitleScreen() {
  const setScreen = useGameStore((s) => s.setScreen);
  const setPlayer = useGameStore((s) => s.setPlayer);
  const setLocation = useGameStore((s) => s.setLocation);
  const setSceneImageUrl = useGameStore((s) => s.setSceneImageUrl);
  const setIsLoading = useGameStore((s) => s.setIsLoading);
  const addNotification = useGameStore((s) => s.addNotification);

  const [apiConfigured, setApiConfigured] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [currentModel, setCurrentModel] = useState('');
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    // Check API status and load models
    const init = async () => {
      try {
        const status = await checkStatus();
        setApiConfigured(status.api_configured);
        setHasSave(status.has_game);

        const modelsData = await getModels();
        setModels(modelsData.models);
        setCurrentModel(modelsData.current);
      } catch (error) {
        console.error('Failed to initialize:', error);
      }
    };
    init();
  }, []);

  const handleModelChange = async (modelId: string) => {
    try {
      await setModel(modelId);
      setCurrentModel(modelId);
    } catch (error) {
      console.error('Failed to set model:', error);
    }
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      const result = await loadGame('save.json');
      if (result.success) {
        setPlayer(result.player);
        setLocation(result.location);
        setSceneImageUrl(result.image_url);
        setScreen('game');
        addNotification({ message: 'Game loaded!', type: 'info' });
      }
    } catch (error) {
      addNotification({ message: 'No save file found', type: 'error' });
    }
    setIsLoading(false);
  };

  return (
    <motion.section
      className="min-h-screen flex flex-col items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="text-center max-w-lg">
        {/* Emblem */}
        <motion.div
          className="text-7xl mb-4 filter drop-shadow-[0_0_20px_var(--accent-gold)]"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          ⚔
        </motion.div>

        {/* Title */}
        <motion.h1
          className="font-display mb-2"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <span className="block text-lg font-normal text-[var(--text-secondary)] tracking-[0.5em] uppercase">
            The
          </span>
          <span className="block text-5xl md:text-6xl font-bold text-[var(--text-gold)] text-shadow-glow">
            Dragon's Shadow
          </span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          className="text-[var(--text-secondary)] italic text-lg mb-12"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          An LLM-Powered D&D Adventure
        </motion.p>

        {/* Buttons */}
        <motion.div
          className="flex flex-col gap-4 mb-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            onClick={() => setScreen('character')}
            icon="🗡"
            size="lg"
            disabled={!apiConfigured}
          >
            New Adventure
          </Button>

          <Button
            onClick={handleContinue}
            variant="secondary"
            icon="📜"
            disabled={!hasSave}
          >
            Continue Journey
          </Button>
        </motion.div>

        {/* Model Selector */}
        <motion.div
          className="text-[var(--text-muted)] text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <label htmlFor="model-select" className="mr-2">
            AI Dungeon Master:
          </label>
          <select
            id="model-select"
            value={currentModel}
            onChange={(e) => handleModelChange(e.target.value)}
            className="bg-[var(--bg-medium)] border border-[var(--border-light)] text-[var(--text-primary)] px-3 py-2 rounded cursor-pointer focus:outline-none focus:border-[var(--accent-gold)]"
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </motion.div>

        {/* API Warning */}
        {!apiConfigured && (
          <motion.div
            className="mt-6 p-4 bg-[var(--accent-red)]/20 border border-[var(--accent-red)] rounded text-[var(--text-red)] text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="mr-2">⚠</span>
            OpenRouter API key not configured. Set OPENROUTER_API_KEY environment variable.
          </motion.div>
        )}
      </div>
    </motion.section>
  );
}

