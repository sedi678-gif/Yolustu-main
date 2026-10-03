import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { requireFirebaseAuth, withTimeout } from '@/app/lib/firebaseAuth';
import { sanitizeBattleId, sanitizePlayerId } from '@/app/lib/battleEventLog/sanitizeBattleEventMeta';
import { replayBattleRequest } from '@/app/lib/battleReconnect/replayBattleRequest';
import { serverNowMs, syncServerClock } from '@/app/lib/battlePlay/battleServerClock';
import {
  ARENA_ENERGY_MAX,
  ARENA_ENERGY_START,
  ARENA_MATCH_COLLECTION,
  ARENA_PRESENCE_COLLECTION,
  ARENA_SLOT_COUNT,
  ARENA_TURN_DURATION_MS,
} from './config';
import { assertArenaActionAllowed, assertArenaTimeoutAllowed, assertStartEnergy, rejectClientEnergyWrite } from './policy';
import { advanceMatchTurn, createMatchSnapshot } from './turnOrder';
import { applyArenaCardPlay, applyLockedLoadout, assertArenaLoadoutLockAllowed } from './loadout';
import { emptyArenaEffects } from './effects/types';
import { opponentPlayerId, serverActiveUsers } from './effects/engine';
import type {
  ArenaLoadoutCard,
  ArenaMatchState,
  ArenaPlayerLoadout,
  ArenaPlayerState,
  ArenaPresenceState,
  ArenaSide,
  ArenaTurnRole,
} from './types';

const TX_MS = 12_000;

function matchRef(matchId: string) {
  return doc(db, ARENA_MATCH_COLLECTION, matchId);
}

function presenceRef(matchId: string, playerId: string) {
  return doc(db, ARENA_MATCH_COLLECTION, matchId, ARENA_PRESENCE_COLLECTION, playerId);
}

function asInt(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function padIds(value: unknown): Array<string | null> {
  const list = Array.isArray(value) ? value : [];
  const next: Array<string | null> = [];
  for (let i = 0; i < ARENA_SLOT_COUNT; i += 1) {
    const raw = list[i];
    if (typeof raw === 'string' && raw.trim()) next.push(raw.trim());
    else next.push(null);
  }
  return next;
}

function parseLoadoutCard(raw: unknown): ArenaLoadoutCard | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const cardId = asString(data.cardId);
  if (!cardId) return null;
  const maxUses = asInt(data.maxUses, 3);
  const used = asInt(data.used);
  return {
    cardId,
    maxUses,
    used,
    remaining: asInt(data.remaining, Math.max(0, maxUses - used)),
  };
}

function parseLoadout(raw: unknown, playerId: string, matchId: string): ArenaPlayerLoadout | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const cardsRaw = Array.isArray(data.cards) ? data.cards : [];
  const cards = cardsRaw.map(parseLoadoutCard).filter((card): card is ArenaLoadoutCard => Boolean(card));
  if (cards.length !== 5) return null;
  return {
    playerId: asString(data.playerId) || playerId,
    matchId: asString(data.matchId) || matchId,
    cards,
  };
}

function parsePlayer(raw: unknown, fallbackId: string): ArenaPlayerState | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const playerId = asString(data.playerId) || fallbackId;
  if (!playerId) return null;
  const role = asString(data.role) as ArenaTurnRole;
  const side = asString(data.side) as ArenaSide;
  return {
    playerId,
    role: role === 'HELP_LIDER' || role === 'CLICKER' || role === 'MEMBER' ? role : 'LIDER',
    side: side === 'away' ? 'away' : 'home',
    slotIndex: asInt(data.slotIndex),
    energy: asInt(data.energy, ARENA_ENERGY_START),
    maxEnergy: asInt(data.maxEnergy, ARENA_ENERGY_MAX),
  };
}

export function matchFromData(matchId: string, raw: Record<string, unknown> | undefined): ArenaMatchState {
  if (!raw) throw new Error('Match tapılmadı');
  const playersRaw = raw.players && typeof raw.players === 'object' ? (raw.players as Record<string, unknown>) : {};
  const players: Record<string, ArenaPlayerState> = {};
  Object.entries(playersRaw).forEach(([id, value]) => {
    const parsed = parsePlayer(value, id);
    if (parsed) players[id] = parsed;
  });
  const namesRaw =
    raw.displayNames && typeof raw.displayNames === 'object' ? (raw.displayNames as Record<string, unknown>) : {};
  const displayNames: Record<string, string> = {};
  Object.entries(namesRaw).forEach(([id, value]) => {
    if (typeof value === 'string' && value.trim()) displayNames[id] = value.trim().slice(0, 32);
  });
  const loadoutsRaw = raw.loadouts && typeof raw.loadouts === 'object' ? (raw.loadouts as Record<string, unknown>) : {};
  const loadouts: Record<string, ArenaPlayerLoadout> = {};
  Object.entries(loadoutsRaw).forEach(([id, value]) => {
    const parsed = parseLoadout(value, id, matchId);
    if (parsed) loadouts[id] = parsed;
  });
  const usedRaw =
    raw.usedActionIds && typeof raw.usedActionIds === 'object' ? (raw.usedActionIds as Record<string, unknown>) : {};
  const usedActionIds: Record<string, boolean> = {};
  Object.entries(usedRaw).forEach(([id, value]) => {
    if (value === true) usedActionIds[id] = true;
  });
  return {
    matchId,
    status: raw.status === 'closed' ? 'closed' : 'active',
    phase: raw.phase === 'loadout' ? 'loadout' : 'combat',
    createdBy: asString(raw.createdBy),
    homePlayerIds: padIds(raw.homePlayerIds),
    awayPlayerIds: padIds(raw.awayPlayerIds),
    players,
    displayNames,
    currentTurn: asString(raw.currentTurn),
    turnSide: raw.turnSide === 'away' ? 'away' : 'home',
    turnSlotIndex: asInt(raw.turnSlotIndex),
    turnIndex: asInt(raw.turnIndex),
    turnSeq: asInt(raw.turnSeq),
    turnStartedAt: asInt(raw.turnStartedAt),
    turnExpiresAt: asInt(raw.turnExpiresAt),
    turnDuration: asInt(raw.turnDuration, ARENA_TURN_DURATION_MS),
    lastActionId: typeof raw.lastActionId === 'string' ? raw.lastActionId : null,
    lastActionTurnSeq: asInt(raw.lastActionTurnSeq, -1),
    loadouts,
    usedActionIds,
    gameMode: raw.gameMode === '5v5' ? '5v5' : '1v1',
    sideScores: {
      home: asInt((raw.sideScores as Record<string, unknown> | undefined)?.home),
      away: asInt((raw.sideScores as Record<string, unknown> | undefined)?.away),
    },
    scoreHistory: Array.isArray(raw.scoreHistory)
      ? raw.scoreHistory
          .map((tick) => {
            if (!tick || typeof tick !== 'object') return null;
            const row = tick as Record<string, unknown>;
            return {
              at: asInt(row.at),
              side: row.side === 'away' ? 'away' as const : 'home' as const,
              score: asInt(row.score),
            };
          })
          .filter((tick): tick is NonNullable<typeof tick> => Boolean(tick))
      : [],
    effects: { ...emptyArenaEffects(), ...(raw.effects && typeof raw.effects === 'object' ? (raw.effects as object) : {}) },
    createdAt: asInt(raw.createdAt),
    updatedAt: asInt(raw.updatedAt),
  };
}

function matchWrite(match: ArenaMatchState): Record<string, unknown> {
  return {
    matchId: match.matchId,
    status: match.status,
    phase: match.phase,
    createdBy: match.createdBy,
    homePlayerIds: match.homePlayerIds,
    awayPlayerIds: match.awayPlayerIds,
    players: match.players,
    displayNames: match.displayNames,
    currentTurn: match.currentTurn,
    turnSide: match.turnSide,
    turnSlotIndex: match.turnSlotIndex,
    turnIndex: match.turnIndex,
    turnSeq: match.turnSeq,
    turnStartedAt: match.turnStartedAt,
    turnExpiresAt: match.turnExpiresAt,
    turnDuration: match.turnDuration,
    lastActionId: match.lastActionId,
    lastActionTurnSeq: match.lastActionTurnSeq,
    loadouts: match.loadouts,
    usedActionIds: match.usedActionIds,
    gameMode: match.gameMode,
    sideScores: match.sideScores,
    scoreHistory: match.scoreHistory,
    effects: match.effects,
    energyStart: ARENA_ENERGY_START,
    energyMax: ARENA_ENERGY_MAX,
    schemaVersion: 1,
    createdAt: match.createdAt,
    updatedAt: match.updatedAt,
  };
}

async function requireServerNow(): Promise<number> {
  await syncServerClock().catch(() => {});
  const now = serverNowMs();
  if (now <= 0) throw new Error('Server saatı yoxdur');
  return now;
}

export async function createArenaMatch(input: {
  createdBy: string;
  homePlayerIds: Array<string | null>;
  awayPlayerIds: Array<string | null>;
  displayNames?: Record<string, string>;
  matchId?: string;
}): Promise<ArenaMatchState> {
  await requireFirebaseAuth();
  const createdBy = sanitizePlayerId(input.createdBy);
  const now = await requireServerNow();
  const ref = input.matchId
    ? matchRef(sanitizeBattleId(input.matchId))
    : doc(collection(db, ARENA_MATCH_COLLECTION));
  return withTimeout(
    runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) {
        return matchFromData(snap.id, snap.data() as Record<string, unknown>);
      }
      const created = createMatchSnapshot({
        matchId: ref.id,
        createdBy,
        homePlayerIds: input.homePlayerIds,
        awayPlayerIds: input.awayPlayerIds,
        displayNames: input.displayNames,
        serverNow: now,
      });
      const match = { ...created, phase: 'loadout' as const, loadouts: {}, usedActionIds: {} };
      assertStartEnergy(match.players);
      tx.set(ref, matchWrite(match));
      return match;
    }),
    TX_MS,
    'Arena match yaradılmadı'
  );
}

export function listenArenaMatch(
  matchId: string,
  onValue: (match: ArenaMatchState) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const id = sanitizeBattleId(matchId);
  return onSnapshot(
    matchRef(id),
    (snap) => {
      if (!snap.exists()) {
        onError?.(new Error('Match tapılmadı'));
        return;
      }
      onValue(matchFromData(snap.id, snap.data() as Record<string, unknown>));
    },
    (error) => onError?.(error instanceof Error ? error : new Error('Match oxunmadı'))
  );
}

export function listenArenaPresence(
  matchId: string,
  onValue: (presence: Record<string, ArenaPresenceState>) => void
): Unsubscribe {
  const id = sanitizeBattleId(matchId);
  return onSnapshot(collection(db, ARENA_MATCH_COLLECTION, id, ARENA_PRESENCE_COLLECTION), (snap) => {
    const next: Record<string, ArenaPresenceState> = {};
    snap.forEach((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>;
      next[docSnap.id] = {
        playerId: docSnap.id,
        online: data.online === true,
        updatedAt: asInt(data.updatedAt),
      };
    });
    onValue(next);
  });
}

export async function heartbeatArenaPresence(input: {
  matchId: string;
  playerId: string;
  online: boolean;
}): Promise<void> {
  await requireFirebaseAuth();
  const matchId = sanitizeBattleId(input.matchId);
  const playerId = sanitizePlayerId(input.playerId);
  const now = await requireServerNow();
  await setDoc(presenceRef(matchId, playerId), {
    playerId,
    online: input.online === true,
    updatedAt: now,
  });
}

export async function submitArenaTurnAction(input: {
  matchId: string;
  playerId: string;
  actionId: string;
}): Promise<ArenaMatchState> {
  await requireFirebaseAuth();
  const matchId = sanitizeBattleId(input.matchId);
  const playerId = sanitizePlayerId(input.playerId);
  const actionId = asString(input.actionId).slice(0, 64);
  if (!actionId) throw new Error('Action id yoxdur');
  const now = await requireServerNow();
  const lockKey = `arena-action:${matchId}:${actionId}`;
  return replayBattleRequest(lockKey, async () =>
    withTimeout(
      runTransaction(db, async (tx) => {
        const snap = await tx.get(matchRef(matchId));
        if (!snap.exists()) throw new Error('Match tapılmadı');
        const match = matchFromData(snap.id, snap.data() as Record<string, unknown>);
        const verdict = assertArenaActionAllowed({ match, playerId, actionId, serverNow: now });
        if (verdict === 'duplicate') return match;
        const next = advanceMatchTurn(match, now);
        tx.update(matchRef(matchId), matchWrite(next));
        return next;
      }),
      TX_MS,
      'Arena action vaxtı bitdi'
    )
  );
}

export async function timeoutArenaTurn(input: { matchId: string }): Promise<ArenaMatchState> {
  await requireFirebaseAuth();
  const matchId = sanitizeBattleId(input.matchId);
  const now = await requireServerNow();
  const lockKey = `arena-timeout:${matchId}`;
  return replayBattleRequest(lockKey, async () =>
    withTimeout(
      runTransaction(db, async (tx) => {
        const snap = await tx.get(matchRef(matchId));
        if (!snap.exists()) throw new Error('Match tapılmadı');
        const match = matchFromData(snap.id, snap.data() as Record<string, unknown>);
        assertArenaTimeoutAllowed(match, now);
        const next = advanceMatchTurn(match, now);
        tx.update(matchRef(matchId), matchWrite(next));
        return next;
      }),
      TX_MS,
      'Arena timeout vaxtı bitdi'
    )
  );
}

export async function lockArenaLoadout(input: {
  matchId: string;
  playerId: string;
  cardIds: unknown;
}): Promise<ArenaMatchState> {
  await requireFirebaseAuth();
  const matchId = sanitizeBattleId(input.matchId);
  const playerId = sanitizePlayerId(input.playerId);
  const now = await requireServerNow();
  const lockKey = `arena-loadout:${matchId}:${playerId}`;
  return replayBattleRequest(lockKey, async () =>
    withTimeout(
      runTransaction(db, async (tx) => {
        const snap = await tx.get(matchRef(matchId));
        if (!snap.exists()) throw new Error('Match tapılmadı');
        const match = matchFromData(snap.id, snap.data() as Record<string, unknown>);
        const loadout = assertArenaLoadoutLockAllowed({ match, playerId, cardIds: input.cardIds });
        const next = applyLockedLoadout(match, loadout, now);
        tx.update(matchRef(matchId), matchWrite(next));
        return next;
      }),
      TX_MS,
      'Loadout yazılmadı'
    )
  );
}

export async function playArenaCard(input: {
  matchId: string;
  playerId: string;
  cardId: string;
  actionId: string;
  mode?: unknown;
}): Promise<ArenaMatchState> {
  await requireFirebaseAuth();
  const matchId = sanitizeBattleId(input.matchId);
  const playerId = sanitizePlayerId(input.playerId);
  const cardId = asString(input.cardId);
  const actionId = asString(input.actionId).slice(0, 64);
  if (!cardId) throw new Error('Kart ID yoxdur');
  if (!actionId) throw new Error('Action id yoxdur');
  const now = await requireServerNow();
  const lockKey = `arena-play:${matchId}:${actionId}`;
  return replayBattleRequest(lockKey, async () =>
    withTimeout(
      runTransaction(db, async (tx) => {
        const snap = await tx.get(matchRef(matchId));
        if (!snap.exists()) throw new Error('Match tapılmadı');
        const match = matchFromData(snap.id, snap.data() as Record<string, unknown>);
        const energyBefore = match.players[playerId]?.energy ?? 0;
        const usesBefore = match.loadouts[playerId]?.cards.find((card) => card.cardId === cardId)?.remaining ?? 0;
        const oppSide = match.players[playerId]?.side === 'home' ? 'away' : 'home';
        const next = applyArenaCardPlay({
          match,
          playerId,
          cardId,
          actionId,
          serverNow: now,
          mode: input.mode,
          activeUsers: serverActiveUsers(match, {}, oppSide),
        });
        if (next === match) return match;
        tx.update(matchRef(matchId), matchWrite(next));
        const auditRef = doc(db, ARENA_MATCH_COLLECTION, matchId, 'audit', actionId);
        tx.set(auditRef, {
          matchId,
          playerId,
          cardId,
          mode: input.mode ?? null,
          timestamp: now,
          energyBefore,
          energyAfter: next.players[playerId]?.energy ?? energyBefore,
          usesBefore,
          usesAfter: next.loadouts[playerId]?.cards.find((card) => card.cardId === cardId)?.remaining ?? usesBefore,
          effectType: next.effects.lastSummary,
          damage: next.effects.lastPlay?.damage ?? 0,
          targetPlayer: opponentPlayerId(match, playerId),
          result: next.effects.lastSummary,
          actionId,
        });
        return next;
      }),
      TX_MS,
      'Kart oynanılmadı'
    )
  );
}

export async function shareArenaClickEvent(input: { matchId: string; playerId: string }): Promise<ArenaMatchState> {
  await requireFirebaseAuth();
  const matchId = sanitizeBattleId(input.matchId);
  const playerId = sanitizePlayerId(input.playerId);
  const now = await requireServerNow();
  return withTimeout(
    runTransaction(db, async (tx) => {
      const snap = await tx.get(matchRef(matchId));
      if (!snap.exists()) throw new Error('Match tapılmadı');
      const match = matchFromData(snap.id, snap.data() as Record<string, unknown>);
      const role = match.players[playerId]?.role;
      if (role !== 'CLICKER') throw new Error('REJECT');
      if (!match.effects.clickEvent) throw new Error('REJECT');
      const next = {
        ...match,
        effects: {
          ...match.effects,
          clickEvent: { ...match.effects.clickEvent, sharedToChat: true },
        },
        updatedAt: now,
      };
      tx.update(matchRef(matchId), matchWrite(next));
      return next;
    }),
    TX_MS,
    'Click event paylaşılmadı'
  );
}

export { rejectClientEnergyWrite };
