import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useGameStore } from './stores/gameStore';
import { useAudioStore } from './stores/audioStore';
import { audioManager } from './systems/audio/AudioManager';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Screens
import TitleScreen from './components/screens/TitleScreen';
import CharacterScreen from './components/screens/CharacterScreen';
import GameScreen from './components/screens/GameScreen';
import CombatScreen from './components/screens/CombatScreen';

// UI Components
import LoadingOverlay from './components/ui/LoadingOverlay';
import NotificationStack from './components/ui/NotificationStack';
import DiceOverlay from './components/dice/DiceOverlay';
import AtmosphericBackground from './components/effects/AtmosphericBackground';
import ScreenShakeWrapper from './components/effects/ScreenShakeWrapper';
import AudioControls from './components/ui/AudioControls';
import { LowHPVignette } from './components/effects/SpellEffects';

function App() {
  const currentScreen = useGameStore((s) => s.currentScreen);
  const musicContext = useGameStore((s) => s.musicContext);
  const player = useGameStore((s) => s.player);
  const { masterVolume, musicVolume, sfxVolume, isMuted, audioEnabled, enableAudio } = useAudioStore();

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  // Calculate HP percentage for vignette effect
  const hpPercent = player ? (player.hp / player.max_hp) * 100 : 100;

  // Sync audio settings with audio manager
  useEffect(() => {
    audioManager.setMusicVolume(masterVolume * musicVolume);
    audioManager.setSfxVolume(masterVolume * sfxVolume);
    audioManager.setMuted(isMuted);
  }, [masterVolume, musicVolume, sfxVolume, isMuted]);

  // Play music based on context
  useEffect(() => {
    if (audioEnabled) {
      audioManager.playMusic(musicContext);
    }
  }, [musicContext, audioEnabled]);

  // Enable audio on first user interaction
  useEffect(() => {
    const handleInteraction = () => {
      if (!audioEnabled) {
        enableAudio();
        audioManager.enable();
      }
    };

    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [audioEnabled, enableAudio]);

  // Render screen based on current state
  const renderScreen = () => {
    switch (currentScreen) {
      case 'title':
        return <TitleScreen key="title" />;
      case 'character':
        return <CharacterScreen key="character" />;
      case 'game':
        return <GameScreen key="game" />;
      case 'combat':
        return <CombatScreen key="combat" />;
      default:
        return <TitleScreen key="title" />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-darkest)] text-[var(--text-primary)]">
      {/* Atmospheric Background */}
      <AtmosphericBackground />

      {/* Screen Shake Wrapper */}
      <ScreenShakeWrapper>
        {/* Main Content */}
        <AnimatePresence mode="wait">
          {renderScreen()}
        </AnimatePresence>
      </ScreenShakeWrapper>

      {/* Global Overlays */}
      <LoadingOverlay />
      <NotificationStack />
      <DiceOverlay />
      <AudioControls />
      
      {/* Low HP Vignette Effect */}
      <LowHPVignette hpPercent={hpPercent} />
    </div>
  );
}

export default App;
