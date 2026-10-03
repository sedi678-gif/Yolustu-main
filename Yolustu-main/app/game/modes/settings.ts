import type { GameMode, GameModeSettings } from './types';

export const GAME_MODES = ['1v1', '5v5'] as const;

export const MODE_NAMES: Record<GameMode, string> = {
  '1v1': '1v1',
  '5v5': '5v5',
};

export const MODE_SETTINGS: Record<GameMode, GameModeSettings> = {
  '1v1': {},
  '5v5': {},
};

export function getModeSettings(mode: GameMode): GameModeSettings {
  return MODE_SETTINGS[mode];
}
