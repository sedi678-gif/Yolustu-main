import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { requireFirebaseAuth } from '@/app/lib/firebaseAuth';
import { battleFromData, battleRef, eventsCol } from '@/app/lib/battleEventLog/battleEventLog';
import { BATTLE_EVENT_SCHEMA_VERSION, type BattleRecord, type BattleSide } from '@/app/lib/battleEventLog/battleEventTypes';
import { sanitizePlayerId } from '@/app/lib/battleEventLog/sanitizeBattleEventMeta';
import { BATTLE_LOADOUT_COLLECTION, isBattleLoadoutCardId } from '@/app/lib/battleLoadout/battleLoadoutConfig';
import {
  BATTLE_CARD_COSTS_COLLECTION,
  BATTLE_ENERGY_COLLECTION,
  BATTLE_ENERGY_MAX,
  BATTLE_ENERGY_REQUESTS_COLLECTION,
  clampBattleEnergy,
  makeEnergyRequestId,
  officialCardEnergyCost,
  sanitizeEnergyRequestId,
} from '@/app/lib/battleEnergy/battleEnergyConfig';
import {
  BATTLE_CARD_MAX_USES,
  BATTLE_TURN_DURATION_MS,
  canPlayOnTurn,
  cardUsageCount,
  nextTurnState,
  officialCardCooldownMs,
  readCardUsage,
  readCooldownUntil,
} from './battlePlayConfig';

export interface PlayBattleCardInput {
  battleId: string;
  playerId: string;
  cardId: unknown;
  requestId?: unknown;
  expectedStateVersion: unknown;
  expectedEventSeq: unknown;
  slotIndex?: unknown;
}

export interface PlayBattleCardResult {
  accepted: true;
  duplicate: boolean;
  cardId: string;
  cost: number;
  energyBefore: number;
  energyAfter: number;
  usage: number;
  usageMax: number;
  cooldownUntil: number;
  requestId: string;
  eventSeq: number;
  stateVersion: number;
  turn: number;
  turnSide: BattleSide;
  turnPlayerId: string;
}

const WRITE_MS = 12_000;
const playLocks = new Set<string>();
const inFlight = new Map<string, Promise<PlayBattleCardResult>>();

function battleEnergyRef(battleId: string, playerId: string) {
  return doc(db, 'battles', battleId, BATTLE_ENERGY_COLLECTION, playerId);
}

function energyRequestRef(battleId: string, requestId: string) {
  return doc(db, 'battles', battleId, BATTLE_ENERGY_REQUESTS_COLLECTION, requestId);
}

function cardCostRef(cardId: string) {
  return doc(db, BATTLE_CARD_COSTS_COLLECTION, cardId);
}

function loadoutRef(battleId: string, playerId: string) {
  return doc(db, 'battles', battleId, BATTLE_LOADOUT_COLLECTION, playerId);
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function sideOf(battle: BattleRecord, playerId: string): BattleSide | null {
  if ((battle.attackerPlayerIds ?? []).includes(playerId)) return 'attacker';
  if ((battle.defenderPlayerIds ?? []).includes(playerId)) return 'defender';
  return null;
}

function uidOwnsPlayerSlot(battle: BattleRecord, playerId: string, uid: string, side: BattleSide): boolean {
  const ids = side === 'attacker' ? battle.attackerPlayerIds ?? [] : battle.defenderPlayerIds ?? [];
  const uids = side === 'attacker' ? battle.attackerUids ?? [] : battle.defenderUids ?? [];
  const index = ids.indexOf(playerId);
  return index >= 0 && uids[index] === uid;
}

function readCostFromDatabase(raw: Record<string, unknown> | undefined, cardId: string): number {
  const catalog = officialCardEnergyCost(cardId);
  if (catalog <= 0) return 0;
  if (!raw) return catalog;
  const stored = Math.trunc(Number(raw.energyCost));
  if (!Number.isInteger(stored) || stored <= 0) throw new Error('Kart energy cost database-də yanlışdır');
  if (stored !== catalog) throw new Error('Kart energy cost database ilə uyğun gəlmir');
  return stored;
}

function requireInt(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} tələb olunur`);
  return Math.trunc(value);
}

function resultFromReceipt(requestId: string, prev: Record<string, unknown>): PlayBattleCardResult {
  return {
    accepted: true,
    duplicate: true,
    cardId: String(prev.cardId ?? ''),
    cost: Number(prev.cost) || 0,
    energyBefore: Number(prev.energyBefore) || 0,
    energyAfter: Number(prev.energyAfter) || 0,
    usage: Number(prev.usageAfter) || 0,
    usageMax: BATTLE_CARD_MAX_USES,
    cooldownUntil: typeof prev.cooldownUntil === 'number' ? prev.cooldownUntil : 0,
    requestId,
    eventSeq: Number(prev.eventSeq) || 0,
    stateVersion: Number(prev.stateVersion) || 0,
    turn: Number(prev.turn) || 0,
    turnSide: prev.turnSide === 'defender' ? 'defender' : 'attacker',
    turnPlayerId: String(prev.turnPlayerId ?? ''),
  };
}

export async function playBattleCard(input: PlayBattleCardInput): Promise<PlayBattleCardResult> {
  const user = await requireFirebaseAuth();
  const playerId = sanitizePlayerId(input.playerId);
  const battleId = String(input.battleId || '').trim();
  if (!battleId) throw new Error('Battle ID tələb olunur');
  if (typeof input.cardId !== 'string' || !isBattleLoadoutCardId(input.cardId.trim())) {
    throw new Error('Bu kart battle hovuzunda yoxdur');
  }
  const cardId = input.cardId.trim();
  const requestId =
    input.requestId == null ? makeEnergyRequestId() : sanitizeEnergyRequestId(input.requestId);
  const expectedStateVersion = requireInt(input.expectedStateVersion, 'Battle state version');
  const expectedEventSeq = requireInt(input.expectedEventSeq, 'Battle event seq');
  const slotIndex =
    typeof input.slotIndex === 'number' && Number.isFinite(input.slotIndex)
      ? Math.trunc(input.slotIndex)
      : undefined;

  const flightKey = `${battleId}:${requestId}`;
  const existing = inFlight.get(flightKey);
  if (existing) return existing;

  const playerLock = `${battleId}:${playerId}`;
  if (playLocks.has(playerLock)) throw new Error('Kart artıq oynanılır');
  playLocks.add(playerLock);

  const work = withTimeout(
    runTransaction(db, async (tx) => {
      const parentRef = battleRef(battleId);
      const energyRef = battleEnergyRef(battleId, playerId);
      const receiptRef = energyRequestRef(battleId, requestId);
      const costRef = cardCostRef(cardId);
      const handRef = loadoutRef(battleId, playerId);

      const parentSnap = await tx.get(parentRef);
      const energySnap = await tx.get(energyRef);
      const receiptSnap = await tx.get(receiptRef);
      const costSnap = await tx.get(costRef);
      const handSnap = await tx.get(handRef);

      if (receiptSnap.exists()) {
        return resultFromReceipt(requestId, receiptSnap.data() as Record<string, unknown>);
      }

      if (!parentSnap.exists()) throw new Error('Battle tapılmadı');
      const battle = battleFromData(parentSnap.id, parentSnap.data());

      if (!(battle.participantIds ?? []).includes(playerId)) throw new Error('Bu döyüşdə deyilsən');
      if (battle.status !== 'active') throw new Error('Battle aktiv deyil');
      if (!canPlayOnTurn(battle, playerId)) throw new Error('İndi sənin növbən deyil');

      const side = sideOf(battle, playerId);
      if (!side) throw new Error('Bu döyüşə qoşulmamısan');
      if (battle.kind === 'alliance_map' && !uidOwnsPlayerSlot(battle, playerId, user.uid, side)) {
        throw new Error('Bu hesabın loadout-u deyil');
      }

      if ((battle.stateVersion ?? 0) !== expectedStateVersion) {
        throw new Error('Battle state dəyişib');
      }
      if (battle.eventSeq !== expectedEventSeq) {
        throw new Error('Battle state dəyişib');
      }

      if (!handSnap.exists()) throw new Error('Loadout tapılmadı');
      const handIds = Array.isArray(handSnap.data()?.cardIds)
        ? (handSnap.data()?.cardIds as unknown[]).map(String)
        : [];
      if (!handIds.includes(cardId)) throw new Error('Bu kart seçilmiş 5-likdə yoxdur');

      const cost = readCostFromDatabase(
        costSnap.exists() ? (costSnap.data() as Record<string, unknown>) : undefined,
        cardId
      );
      if (cost <= 0) throw new Error('Kart energy cost tapılmadı');

      const cooldownMs = officialCardCooldownMs(cardId);
      if (cooldownMs <= 0) throw new Error('Kart cooldown tapılmadı');

      if (!energySnap.exists()) throw new Error('Energy tapılmadı');
      const energyData = energySnap.data() as Record<string, unknown>;
      const energy = clampBattleEnergy(Number(energyData.energy));
      const usage = readCardUsage(energyData.cardUsage, energyData.usedCardIds);
      const cooldowns = readCooldownUntil(energyData.cardCooldownUntil);
      const used = cardUsageCount(usage, cardId);
      if (used >= BATTLE_CARD_MAX_USES) throw new Error('Kart 3 istifadəyə çatıb');
      if (energy < cost) throw new Error('Kifayət qədər energy yoxdur');

      const now = Date.now();
      const readyAt = cooldowns[cardId] ?? 0;
      if (readyAt > now) throw new Error('Kart cooldown-dadır');

      const energyAfter = energy - cost;
      if (energyAfter < 0 || energyAfter > BATTLE_ENERGY_MAX) throw new Error('Energy mənfi ola bilməz');

      const usageAfter = used + 1;
      const cooldownUntil = now + cooldownMs;
      const nextTurn = nextTurnState(battle, side);
      const seq1 = battle.eventSeq + 1;
      const seq2 = battle.eventSeq + 2;
      const stateVersion = (battle.stateVersion ?? 0) + 1;
      const playEvent = doc(eventsCol(battleId));
      const energyEvent = doc(eventsCol(battleId));

      if (!costSnap.exists()) {
        tx.set(costRef, {
          cardId,
          energyCost: cost,
          cooldownMs,
          schemaVersion: 1,
          updatedAt: serverTimestamp(),
        });
      }

      tx.set(receiptRef, {
        requestId,
        battleId,
        playerId,
        cardId,
        cost,
        energyBefore: energy,
        energyAfter,
        usageAfter,
        cooldownUntil,
        eventSeq: seq2,
        stateVersion,
        turn: nextTurn.turn,
        turnSide: nextTurn.turnSide,
        turnPlayerId: nextTurn.turnPlayerId,
        schemaVersion: 1,
        createdAt: serverTimestamp(),
      });

      tx.update(energyRef, {
        energy: energyAfter,
        maxEnergy: BATTLE_ENERGY_MAX,
        cardUsage: { ...usage, [cardId]: usageAfter },
        cardCooldownUntil: { ...cooldowns, [cardId]: cooldownUntil },
        lastRequestId: requestId,
        updatedAt: serverTimestamp(),
      });

      tx.update(parentRef, {
        eventSeq: seq2,
        updatedAt: serverTimestamp(),
        status: 'active',
        turn: nextTurn.turn,
        turnSide: nextTurn.turnSide,
        turnPlayerId: nextTurn.turnPlayerId,
        stateVersion,
        turnStartAt: serverTimestamp(),
        turnDurationMs: BATTLE_TURN_DURATION_MS,
      });

      tx.set(playEvent, {
        eventId: playEvent.id,
        battleId,
        playerId,
        type: 'card_played',
        seq: seq1,
        createdAt: serverTimestamp(),
        schemaVersion: BATTLE_EVENT_SCHEMA_VERSION,
        meta: {
          cardId,
          side,
          requestId,
          usage: usageAfter,
          ...(slotIndex !== undefined ? { slotIndex } : {}),
        },
      });

      tx.set(energyEvent, {
        eventId: energyEvent.id,
        battleId,
        playerId,
        type: 'energy_changed',
        seq: seq2,
        createdAt: serverTimestamp(),
        schemaVersion: BATTLE_EVENT_SCHEMA_VERSION,
        meta: {
          energy: energyAfter,
          delta: -cost,
          reason: 'card_played',
          cardId,
          requestId,
        },
      });

      return {
        accepted: true as const,
        duplicate: false,
        cardId,
        cost,
        energyBefore: energy,
        energyAfter,
        usage: usageAfter,
        usageMax: BATTLE_CARD_MAX_USES,
        cooldownUntil,
        requestId,
        eventSeq: seq2,
        stateVersion,
        turn: nextTurn.turn,
        turnSide: nextTurn.turnSide,
        turnPlayerId: nextTurn.turnPlayerId,
      };
    }),
    WRITE_MS,
    'Kart oynanılmadı.'
  );

  inFlight.set(flightKey, work);
  try {
    return await work;
  } finally {
    inFlight.delete(flightKey);
    playLocks.delete(playerLock);
  }
}

const timeoutLocks = new Set<string>();

export async function timeoutBattleTurn(input: {
  battleId: string;
  playerId: string;
  expectedStateVersion: unknown;
}): Promise<BattleRecord> {
  await requireFirebaseAuth();
  const playerId = sanitizePlayerId(input.playerId);
  const battleId = String(input.battleId || '').trim();
  if (!battleId) throw new Error('Battle ID tələb olunur');
  const expectedStateVersion = requireInt(input.expectedStateVersion, 'Battle state version');

  const lockKey = `${battleId}:${expectedStateVersion}`;
  if (timeoutLocks.has(lockKey)) throw new Error('Timeout artıq göndərilir');
  timeoutLocks.add(lockKey);

  try {
    return await withTimeout(
      runTransaction(db, async (tx) => {
        const parentRef = battleRef(battleId);
        const parentSnap = await tx.get(parentRef);
        if (!parentSnap.exists()) throw new Error('Battle tapılmadı');
        const battle = battleFromData(parentSnap.id, parentSnap.data());

        if (battle.status !== 'active') throw new Error('Battle aktiv deyil');
        if ((battle.stateVersion ?? 0) !== expectedStateVersion) {
          return battle;
        }
        if (!(battle.participantIds ?? []).includes(playerId)) {
          throw new Error('Bu döyüşdə deyilsən');
        }

        const timedSide = battle.turnSide ?? 'attacker';
        const nextTurn = nextTurnState(battle, timedSide);
        const seq = battle.eventSeq + 1;
        const stateVersion = (battle.stateVersion ?? 0) + 1;
        const eventDoc = doc(eventsCol(battleId));

        tx.update(parentRef, {
          eventSeq: seq,
          updatedAt: serverTimestamp(),
          status: 'active',
          turn: nextTurn.turn,
          turnSide: nextTurn.turnSide,
          turnPlayerId: nextTurn.turnPlayerId,
          stateVersion,
          turnStartAt: serverTimestamp(),
          turnDurationMs: BATTLE_TURN_DURATION_MS,
        });
        tx.set(eventDoc, {
          eventId: eventDoc.id,
          battleId,
          playerId,
          type: 'turn_timeout',
          seq,
          createdAt: serverTimestamp(),
          schemaVersion: BATTLE_EVENT_SCHEMA_VERSION,
          meta: { turn: battle.turn, side: timedSide },
        });

        return {
          ...battle,
          eventSeq: seq,
          updatedAt: Date.now(),
          turn: nextTurn.turn,
          turnSide: nextTurn.turnSide,
          turnPlayerId: nextTurn.turnPlayerId,
          stateVersion,
          turnDurationMs: BATTLE_TURN_DURATION_MS,
        };
      }),
      WRITE_MS,
      'Turn timeout yazılmadı.'
    );
  } finally {
    timeoutLocks.delete(lockKey);
  }
}
