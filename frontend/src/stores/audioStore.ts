import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AudioState {
  // Volume controls (0-1)
  masterVolume: number;
  setMasterVolume: (volume: number) => void;
  musicVolume: number;
  setMusicVolume: (volume: number) => void;
  sfxVolume: number;
  setSfxVolume: (volume: number) => void;

  // Mute controls
  isMuted: boolean;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;

  // Audio enabled (user interaction required)
  audioEnabled: boolean;
  enableAudio: () => void;

  // Computed effective volumes
  getEffectiveMusicVolume: () => number;
  getEffectiveSfxVolume: () => number;
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set, get) => ({
      // Volume controls
      masterVolume: 0.7,
      setMasterVolume: (masterVolume) => set({ masterVolume }),
      musicVolume: 0.5,
      setMusicVolume: (musicVolume) => set({ musicVolume }),
      sfxVolume: 0.8,
      setSfxVolume: (sfxVolume) => set({ sfxVolume }),

      // Mute controls
      isMuted: false,
      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
      setMuted: (isMuted) => set({ isMuted }),

      // Audio enabled
      audioEnabled: false,
      enableAudio: () => set({ audioEnabled: true }),

      // Computed effective volumes
      getEffectiveMusicVolume: () => {
        const state = get();
        if (state.isMuted) return 0;
        return state.masterVolume * state.musicVolume;
      },
      getEffectiveSfxVolume: () => {
        const state = get();
        if (state.isMuted) return 0;
        return state.masterVolume * state.sfxVolume;
      },
    }),
    {
      name: 'dragons-shadow-audio',
      partialize: (state) => ({
        masterVolume: state.masterVolume,
        musicVolume: state.musicVolume,
        sfxVolume: state.sfxVolume,
        isMuted: state.isMuted,
      }),
    }
  )
);

