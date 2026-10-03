import type { GameMode } from '../modes/types';
import { getModeRules } from '../modes/rules';

export function energyLimitForMode(mode: GameMode): number {
  return getModeRules(mode).energyLimit;
}
