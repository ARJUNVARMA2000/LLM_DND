import type {
  NewGameResponse,
  ChoiceResponse,
  CombatActionResponse,
  InventoryResponse,
  StatsResponse,
  ModelsResponse,
  Choice,
} from '../types';

const API_BASE = '/api';

async function apiCall<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  data?: unknown
): Promise<T> {
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE}/${endpoint}`, options);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'API request failed');
  }

  return result;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

export async function checkStatus() {
  return apiCall<{
    api_configured: boolean;
    api_message: string;
    has_game: boolean;
    game_started: boolean;
  }>('status');
}

export async function getModels() {
  return apiCall<ModelsResponse>('models');
}

export async function setModel(model: string) {
  return apiCall<{ success: boolean; model: string }>('set_model', 'POST', { model });
}

export async function newGame(name: string, playerClass: string) {
  return apiCall<NewGameResponse>('new_game', 'POST', { name, class: playerClass });
}

export async function makeChoice(choice: Choice) {
  return apiCall<ChoiceResponse>('choice', 'POST', { choice });
}

export async function combatAction(action: string, item?: string) {
  return apiCall<CombatActionResponse>('combat_action', 'POST', { action, item });
}

export async function saveGame(filename?: string) {
  return apiCall<{ success: boolean; message: string }>('save', 'POST', { filename });
}

export async function loadGame(filename: string = 'save.json') {
  return apiCall<{
    success: boolean;
    message: string;
    player: StatsResponse;
    location: string;
    image_url: string;
  }>('load', 'POST', { filename });
}

export async function getInventory() {
  return apiCall<InventoryResponse>('inventory');
}

export async function getStats() {
  return apiCall<StatsResponse>('stats');
}

