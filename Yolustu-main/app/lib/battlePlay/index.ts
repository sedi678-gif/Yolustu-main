export {
  BATTLE_CARD_COOLDOWN_MS,
  BATTLE_CARD_MAX_USES,
  canPlayOnTurn,
  cardUsageCount,
  initialTurnState,
  nextTurnState,
  officialCardCooldownMs,
  officialCardCooldownSec,
  readCardUsage,
  readCooldownUntil,
} from './battlePlayConfig';

export { playBattleCard } from './battlePlayService';

export type { PlayBattleCardInput, PlayBattleCardResult } from './battlePlayService';
