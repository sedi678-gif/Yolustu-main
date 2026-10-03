import type { GameMode, GameModeRules } from './types';

export const MODE_RULES: Record<GameMode, GameModeRules> = {
  '1v1': {
    mode: '1v1',
    seatsPerSide: 1,
    hasRoles: false,
    energyLimit: 35,
  },
  '4v4': {
    mode: '4v4',
    seatsPerSide: 4,
    hasRoles: true,
    energyLimit: 30,
  },
};

export function getModeRules(mode: GameMode): GameModeRules {
  return MODE_RULES[mode];
}
