import { create } from 'zustand';
import type { 
  Player, 
  Enemy, 
  Choice, 
  Screen, 
  Notification, 
  DamageNumber,
  DiceRoll,
  MusicContext,
} from '../types';

interface GameState {
  // Screen state
  currentScreen: Screen;
  setScreen: (screen: Screen) => void;

  // Player state
  player: Player | null;
  setPlayer: (player: Player | null) => void;
  updatePlayer: (updates: Partial<Player>) => void;

  // Game state
  currentLocation: string;
  setLocation: (location: string) => void;
  currentChoices: Choice[];
  setChoices: (choices: Choice[]) => void;
  currentNarrative: string;
  setNarrative: (narrative: string) => void;
  sceneImageUrl: string;
  setSceneImageUrl: (url: string) => void;

  // Combat state
  inCombat: boolean;
  setInCombat: (inCombat: boolean) => void;
  enemy: Enemy | null;
  setEnemy: (enemy: Enemy | null) => void;
  combatNarrative: string;
  setCombatNarrative: (narrative: string) => void;

  // Loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  loadingMessage: string;
  setLoadingMessage: (message: string) => void;

  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Damage numbers (for combat effects)
  damageNumbers: DamageNumber[];
  addDamageNumber: (damage: Omit<DamageNumber, 'id'>) => void;
  removeDamageNumber: (id: string) => void;
  clearDamageNumbers: () => void;

  // Dice rolling
  showDice: boolean;
  setShowDice: (show: boolean) => void;
  currentDiceRoll: DiceRoll | null;
  setCurrentDiceRoll: (roll: DiceRoll | null) => void;

  // Screen shake
  shakeIntensity: 'none' | 'light' | 'heavy';
  triggerShake: (intensity: 'light' | 'heavy') => void;

  // Music context
  musicContext: MusicContext;
  setMusicContext: (context: MusicContext) => void;

  // Character creation
  selectedClass: 'fighter' | 'rogue' | 'mage' | null;
  setSelectedClass: (cls: 'fighter' | 'rogue' | 'mage' | null) => void;
  characterName: string;
  setCharacterName: (name: string) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  // Screen state
  currentScreen: 'title',
  setScreen: (screen) => set({ currentScreen: screen }),

  // Player state
  player: null,
  setPlayer: (player) => set({ player }),
  updatePlayer: (updates) => set((state) => ({
    player: state.player ? { ...state.player, ...updates } : null,
  })),

  // Game state
  currentLocation: '',
  setLocation: (currentLocation) => set({ currentLocation }),
  currentChoices: [],
  setChoices: (currentChoices) => set({ currentChoices }),
  currentNarrative: '',
  setNarrative: (currentNarrative) => set({ currentNarrative }),
  sceneImageUrl: '',
  setSceneImageUrl: (sceneImageUrl) => set({ sceneImageUrl }),

  // Combat state
  inCombat: false,
  setInCombat: (inCombat) => set({ inCombat }),
  enemy: null,
  setEnemy: (enemy) => set({ enemy }),
  combatNarrative: '',
  setCombatNarrative: (combatNarrative) => set({ combatNarrative }),

  // Loading state
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
  loadingMessage: 'The Dungeon Master is crafting your fate...',
  setLoadingMessage: (loadingMessage) => set({ loadingMessage }),

  // Notifications
  notifications: [],
  addNotification: (notification) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id }],
    }));
    // Auto-remove after 4 seconds
    setTimeout(() => {
      get().removeNotification(id);
    }, 4000);
  },
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id),
  })),
  clearNotifications: () => set({ notifications: [] }),

  // Damage numbers
  damageNumbers: [],
  addDamageNumber: (damage) => {
    const id = `dmg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    set((state) => ({
      damageNumbers: [...state.damageNumbers, { ...damage, id }],
    }));
    // Auto-remove after animation
    setTimeout(() => {
      get().removeDamageNumber(id);
    }, 1500);
  },
  removeDamageNumber: (id) => set((state) => ({
    damageNumbers: state.damageNumbers.filter((d) => d.id !== id),
  })),
  clearDamageNumbers: () => set({ damageNumbers: [] }),

  // Dice rolling
  showDice: false,
  setShowDice: (showDice) => set({ showDice }),
  currentDiceRoll: null,
  setCurrentDiceRoll: (currentDiceRoll) => set({ currentDiceRoll }),

  // Screen shake
  shakeIntensity: 'none',
  triggerShake: (intensity) => {
    set({ shakeIntensity: intensity });
    setTimeout(() => {
      set({ shakeIntensity: 'none' });
    }, intensity === 'heavy' ? 500 : 300);
  },

  // Music context
  musicContext: 'title',
  setMusicContext: (musicContext) => set({ musicContext }),

  // Character creation
  selectedClass: null,
  setSelectedClass: (selectedClass) => set({ selectedClass }),
  characterName: '',
  setCharacterName: (characterName) => set({ characterName }),
}));

