// =============================================================================
// GAME TYPES
// =============================================================================

export interface PlayerStats {
  STR: { score: number; modifier: number };
  DEX: { score: number; modifier: number };
  INT: { score: number; modifier: number };
  CHA: { score: number; modifier: number };
}

export interface Player {
  name: string;
  class: 'fighter' | 'rogue' | 'mage';
  hp: number;
  max_hp: number;
  gold: number;
  ac: number;
  stats: PlayerStats;
  inventory: string[];
  equipped_weapon: string;
  ability_uses: number;
  ability_max: number;
  ability_name: string;
  quest: string | null;
  turn: number;
}

export interface Enemy {
  name: string;
  hp: number;
  max_hp: number;
  description?: string;
  image_url?: string;
}

export interface Choice {
  id: number;
  text: string;
  type: 'explore' | 'talk' | 'combat' | 'rest' | 'quest';
}

export interface QuestUpdate {
  quest_id: string;
  name: string;
  description: string;
  status: 'started' | 'progressed' | 'completed';
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface NewGameResponse {
  success: boolean;
  opening: string;
  location: string;
  choices: Choice[];
  image_url: string;
  player: Player;
  quest: string | null;
}

export interface ChoiceResponse {
  success: boolean;
  narration: string;
  location?: string;
  choices?: Choice[];
  image_url?: string;
  player: Player;
  items_found?: string[];
  gold_found?: number;
  quest_update?: QuestUpdate;
  skill_check?: string;
  combat?: boolean;
  enemy?: Enemy;
  rest?: boolean;
}

export interface CombatActionResponse {
  success: boolean;
  player: Player;
  enemy?: Enemy;
  player_result?: {
    success: boolean;
    message: string;
    damage?: number;
    roll?: string;
    critical?: boolean;
  };
  enemy_result?: {
    success: boolean;
    message: string;
    damage?: number;
    roll?: string;
  };
  narration?: string;
  victory?: boolean;
  defeat?: boolean;
  fled?: boolean;
  rewards?: {
    gold: number;
    xp: number;
    loot: string[];
  };
  combat_continues?: boolean;
}

export interface InventoryResponse {
  inventory: string[];
  gold: number;
  equipped_weapon: string;
}

export interface StatsResponse extends Player {}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  tier: string;
}

export interface ModelsResponse {
  models: ModelInfo[];
  default: string;
  current: string;
}

// =============================================================================
// AUDIO TYPES
// =============================================================================

export type MusicContext = 
  | 'title'
  | 'tavern'
  | 'exploration'
  | 'dungeon'
  | 'combat'
  | 'boss'
  | 'victory'
  | 'defeat';

export type SFXType =
  | 'ui_click'
  | 'ui_hover'
  | 'ui_open'
  | 'ui_close'
  | 'dice_roll'
  | 'dice_land'
  | 'dice_critical'
  | 'sword_swing'
  | 'sword_hit'
  | 'spell_cast'
  | 'fireball'
  | 'heal'
  | 'damage_taken'
  | 'gold_pickup'
  | 'item_pickup'
  | 'level_up'
  | 'quest_complete'
  | 'notification';

// =============================================================================
// GAME STATE TYPES
// =============================================================================

export type Screen = 'title' | 'character' | 'game' | 'combat';

export interface DamageNumber {
  id: string;
  value: number;
  x: number;
  y: number;
  type: 'damage' | 'heal' | 'critical' | 'enemy';
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'item' | 'gold' | 'quest' | 'combat' | 'error';
}

export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

export interface DiceRoll {
  type: DiceType;
  result: number;
  modifier?: number;
  label?: string;
  success?: boolean;
}

