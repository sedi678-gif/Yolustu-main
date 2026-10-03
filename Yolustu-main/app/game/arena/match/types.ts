import type { ArenaTurnRole } from './config';
import type { ArenaEffectState } from './effects/types';
import type { ArenaScoreTick } from './effects/scoreHistory';

export type ArenaSide = 'home' | 'away';
export type ArenaMatchStatus = 'active' | 'closed';
export type ArenaMatchPhase = 'loadout' | 'combat';

export type ArenaLoadoutCard = {
  cardId: string;
  maxUses: number;
  used: number;
  remaining: number;
};

export type ArenaPlayerLoadout = {
  playerId: string;
  matchId: string;
  cards: ArenaLoadoutCard[];
};

export type ArenaPlayerState = {
  playerId: string;
  role: ArenaTurnRole;
  side: ArenaSide;
  slotIndex: number;
  energy: number;
  maxEnergy: number;
};

export type ArenaTurnSeat = {
  playerId: string;
  role: ArenaTurnRole;
  side: ArenaSide;
  slotIndex: number;
};

export type ArenaMatchState = {
  matchId: string;
  status: ArenaMatchStatus;
  phase: ArenaMatchPhase;
  createdBy: string;
  homePlayerIds: Array<string | null>;
  awayPlayerIds: Array<string | null>;
  players: Record<string, ArenaPlayerState>;
  displayNames: Record<string, string>;
  currentTurn: string;
  turnSide: ArenaSide;
  turnSlotIndex: number;
  turnIndex: number;
  turnSeq: number;
  turnStartedAt: number;
  turnExpiresAt: number;
  turnDuration: number;
  lastActionId: string | null;
  lastActionTurnSeq: number;
  loadouts: Record<string, ArenaPlayerLoadout>;
  usedActionIds: Record<string, boolean>;
  gameMode: '1v1' | '5v5';
  sideScores: { home: number; away: number };
  scoreHistory: ArenaScoreTick[];
  effects: ArenaEffectState;
  createdAt: number;
  updatedAt: number;
};

export type ArenaPresenceState = {
  playerId: string;
  online: boolean;
  updatedAt: number;
};
