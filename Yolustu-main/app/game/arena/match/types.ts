import type { ArenaTurnRole } from './config';

export type ArenaSide = 'home' | 'away';
export type ArenaMatchStatus = 'active' | 'closed';

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
  createdAt: number;
  updatedAt: number;
};

export type ArenaPresenceState = {
  playerId: string;
  online: boolean;
  updatedAt: number;
};
