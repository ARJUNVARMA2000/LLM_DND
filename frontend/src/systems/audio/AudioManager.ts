import { Howl, Howler } from 'howler';
import type { MusicContext, SFXType } from '../../types';

// =============================================================================
// AUDIO CONFIGURATION
// =============================================================================

// Music tracks - using royalty-free placeholder URLs
// These will be replaced with actual audio files
const MUSIC_TRACKS: Record<MusicContext, string> = {
  title: 'https://cdn.pixabay.com/audio/2024/11/10/audio_4956a13538.mp3', // Epic fantasy
  tavern: 'https://cdn.pixabay.com/audio/2022/10/25/audio_052a54dec1.mp3', // Medieval tavern
  exploration: 'https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3', // Mysterious ambient
  dungeon: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3', // Dark dungeon
  combat: 'https://cdn.pixabay.com/audio/2024/07/19/audio_4485ade695.mp3', // Battle music
  boss: 'https://cdn.pixabay.com/audio/2024/07/19/audio_4485ade695.mp3', // Epic boss (same as combat for now)
  victory: 'https://cdn.pixabay.com/audio/2021/08/04/audio_bb630cc098.mp3', // Victory fanfare
  defeat: 'https://cdn.pixabay.com/audio/2022/03/15/audio_8eede5fb0e.mp3', // Somber defeat
};

// Sound effects - using data URLs for simple synthesized sounds
// These will be replaced with actual audio files
const SFX_SOUNDS: Record<SFXType, string> = {
  ui_click: 'https://cdn.pixabay.com/audio/2022/03/15/audio_8d569d25a0.mp3',
  ui_hover: 'https://cdn.pixabay.com/audio/2022/03/10/audio_3594a5df55.mp3',
  ui_open: 'https://cdn.pixabay.com/audio/2022/03/15/audio_8d569d25a0.mp3',
  ui_close: 'https://cdn.pixabay.com/audio/2022/03/15/audio_8d569d25a0.mp3',
  dice_roll: 'https://cdn.pixabay.com/audio/2022/03/24/audio_4e3a165912.mp3',
  dice_land: 'https://cdn.pixabay.com/audio/2022/03/24/audio_4e3a165912.mp3',
  dice_critical: 'https://cdn.pixabay.com/audio/2021/08/04/audio_bb630cc098.mp3',
  sword_swing: 'https://cdn.pixabay.com/audio/2022/03/10/audio_ec8e369a4a.mp3',
  sword_hit: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c40cb8c7eb.mp3',
  spell_cast: 'https://cdn.pixabay.com/audio/2022/03/15/audio_a47e88a0a0.mp3',
  fireball: 'https://cdn.pixabay.com/audio/2022/03/15/audio_a47e88a0a0.mp3',
  heal: 'https://cdn.pixabay.com/audio/2021/08/04/audio_bb630cc098.mp3',
  damage_taken: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c40cb8c7eb.mp3',
  gold_pickup: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3',
  item_pickup: 'https://cdn.pixabay.com/audio/2022/03/15/audio_8d569d25a0.mp3',
  level_up: 'https://cdn.pixabay.com/audio/2021/08/04/audio_bb630cc098.mp3',
  quest_complete: 'https://cdn.pixabay.com/audio/2021/08/04/audio_bb630cc098.mp3',
  notification: 'https://cdn.pixabay.com/audio/2022/03/15/audio_8d569d25a0.mp3',
};

// =============================================================================
// AUDIO MANAGER CLASS
// =============================================================================

class AudioManager {
  private static instance: AudioManager;
  private musicHowl: Howl | null = null;
  private sfxCache: Map<SFXType, Howl> = new Map();
  private currentMusicContext: MusicContext | null = null;
  private musicVolume: number = 0.5;
  private sfxVolume: number = 0.8;
  private isMuted: boolean = false;
  private isEnabled: boolean = false;

  private constructor() {
    // Preload common SFX
    this.preloadSfx();
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  // Enable audio (requires user interaction)
  enable(): void {
    this.isEnabled = true;
    Howler.autoUnlock = true;
  }

  // Volume controls
  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicHowl) {
      this.musicHowl.volume(this.isMuted ? 0 : this.musicVolume);
    }
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.musicHowl) {
      this.musicHowl.volume(muted ? 0 : this.musicVolume);
    }
  }

  toggleMute(): void {
    this.setMuted(!this.isMuted);
  }

  // Music playback
  playMusic(context: MusicContext, fadeIn: boolean = true): void {
    if (!this.isEnabled) return;
    if (context === this.currentMusicContext && this.musicHowl?.playing()) return;

    const trackUrl = MUSIC_TRACKS[context];
    if (!trackUrl) return;

    // Fade out current music
    if (this.musicHowl) {
      const currentHowl = this.musicHowl;
      currentHowl.fade(currentHowl.volume(), 0, 1000);
      setTimeout(() => currentHowl.stop(), 1000);
    }

    // Create new music howl
    this.musicHowl = new Howl({
      src: [trackUrl],
      volume: fadeIn ? 0 : (this.isMuted ? 0 : this.musicVolume),
      loop: true,
      html5: true, // Use HTML5 Audio for streaming
      onload: () => {
        if (this.musicHowl && fadeIn) {
          this.musicHowl.play();
          this.musicHowl.fade(0, this.isMuted ? 0 : this.musicVolume, 2000);
        }
      },
      onloaderror: (_id, error) => {
        console.warn(`Failed to load music track: ${context}`, error);
      },
    });

    if (!fadeIn) {
      this.musicHowl.play();
    }

    this.currentMusicContext = context;
  }

  stopMusic(fadeOut: boolean = true): void {
    if (!this.musicHowl) return;

    if (fadeOut) {
      const currentHowl = this.musicHowl;
      currentHowl.fade(currentHowl.volume(), 0, 1000);
      setTimeout(() => currentHowl.stop(), 1000);
    } else {
      this.musicHowl.stop();
    }

    this.currentMusicContext = null;
  }

  // SFX playback
  playSfx(type: SFXType): void {
    if (!this.isEnabled || this.isMuted) return;

    let sfx = this.sfxCache.get(type);
    
    if (!sfx) {
      const sfxUrl = SFX_SOUNDS[type];
      if (!sfxUrl) return;

      sfx = new Howl({
        src: [sfxUrl],
        volume: this.sfxVolume,
        onloaderror: (_id, error) => {
          console.warn(`Failed to load SFX: ${type}`, error);
        },
      });
      this.sfxCache.set(type, sfx);
    }

    sfx.volume(this.sfxVolume);
    sfx.play();
  }

  // Preload common sound effects
  private preloadSfx(): void {
    const commonSfx: SFXType[] = [
      'ui_click',
      'dice_roll',
      'sword_hit',
      'damage_taken',
    ];

    commonSfx.forEach((type) => {
      const sfxUrl = SFX_SOUNDS[type];
      if (sfxUrl) {
        const sfx = new Howl({
          src: [sfxUrl],
          volume: 0,
          preload: true,
        });
        this.sfxCache.set(type, sfx);
      }
    });
  }

  // Get current state
  getCurrentContext(): MusicContext | null {
    return this.currentMusicContext;
  }

  isPlaying(): boolean {
    return this.musicHowl?.playing() ?? false;
  }
}

// Export singleton instance
export const audioManager = AudioManager.getInstance();
export default audioManager;

