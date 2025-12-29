import { useEffect, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';
import { audioManager } from '../systems/audio/AudioManager';

export function useKeyboardShortcuts() {
  const currentScreen = useGameStore((s) => s.currentScreen);
  const currentChoices = useGameStore((s) => s.currentChoices);
  const inCombat = useGameStore((s) => s.inCombat);
  const isLoading = useGameStore((s) => s.isLoading);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't handle if loading or typing in an input
    if (isLoading) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    // Number keys for choices (game screen)
    if (currentScreen === 'game' && !inCombat) {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9 && num <= currentChoices.length) {
        // Trigger choice selection
        audioManager.playSfx('ui_click');
        // The actual selection is handled by the GameScreen component
      }
    }

    // Combat shortcuts
    if (currentScreen === 'combat' && inCombat) {
      switch (e.key.toLowerCase()) {
        case 'a':
          // Attack - handled by CombatScreen
          audioManager.playSfx('ui_click');
          break;
        case 's':
          // Special ability
          audioManager.playSfx('ui_click');
          break;
        case 'd':
          // Use item
          audioManager.playSfx('ui_click');
          break;
        case 'f':
          // Flee
          audioManager.playSfx('ui_click');
          break;
      }
    }

    // Global shortcuts
    if (e.key === 'Escape') {
      audioManager.playSfx('ui_close');
      // Close modals - handled by components
    }

    if (e.key.toLowerCase() === 'i' && currentScreen === 'game') {
      // Open inventory
      audioManager.playSfx('ui_open');
    }

    if (e.key.toLowerCase() === 'm') {
      // Toggle mute
      audioManager.toggleMute();
    }
  }, [currentScreen, currentChoices, inCombat, isLoading]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export default useKeyboardShortcuts;

