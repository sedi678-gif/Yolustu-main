import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
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
  BATTLE_ENERGY_START,
  clampBattleEnergy,
  energyRequestIdForCard,
  officialCardEnergyCost,
  sanitizeEnergyRequestId,
} from './battleEnergyConfig';

export interface BattleEnergy {
  battleId: string;
  playerId: string;
  energy: number;
  maxEnergy: number;
  usedCardIds: string[];
  lastRequestId: string | null;
}

export interface PlayBattleCardResult {
  duplicate: boolean;
  cardId: string;
  cost: number;
  energyBefore: number;
  energyAfter: number;
  requestId: string;
}

const WRITE_MS = 12_000;
const playLocks = new Set<string>();
const inFlight = new Map<string, Promise<PlayBattleCardResult>>();

export function battleEnergyRef(battleId: string, playerId: string) {
  return doc(db, 'battles', battleId, BATTLE_ENERGY_COLLECTION, playerId);
}

export function battleEnergyRequestsCol(battleId: string) {
  return collection(db, 'battles', battleId, BATTLE_ENERGY_REQUESTS_COLLECTION);
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

function energyFromData(battleId: string, playerId: string, data: Record<string, unknown>): BattleEnergy {
  const used = Array.isArray(data.usedCardIds) ? data.usedCardIds.map(String).filter(Boolean) : [];
  return {
    battleId,
    playerId,
    energy: clampBattleEnergy(Number(data.energy)),
    maxEnergy: BATTLE_ENERGY_MAX,
    usedCardIds: used,
    lastRequestId: typeof data.lastRequestId === 'string' ? data.lastRequestId : null,
  };
}

function emptyEnergy(battleId: string, playerId: string): BattleEnergy {
  return {
    battleId,
    playerId,
    energy: BATTLE_ENERGY_START,
    maxEnergy: BATTLE_ENERGY_MAX,
    usedCardIds: [],
    lastRequestId: null,
  };
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

/** Client yalnız bunu göstərir — local hesab yoxdur. */
export function listenBattleEnergy(
  battleId: string,
  playerId: string,
  onChange: (energy: BattleEnergy | null) => void
): Unsubscribe {
  const id = String(battleId || '').trim();
  const pid = String(playerId || '').trim();
  if (!id || !pid) {
    onChange(null);
    return () => {};
  }
  return onSnapshot(battleEnergyRef(id, pid), (snap) => {
    onChange(snap.exists() ? energyFromData(id, pid, snap.data() as Record<string, unknown>) : null);
  });
}

export async function playBattleCard(input: {
  battleId: string;
  playerId: string;
  cardId: unknown;
  requestId?: unknown;
  slotIndex?: unknown;
}): Promise<PlayBattleCardResult> {
  const user = await requireFirebaseAuth();
  const playerId = sanitizePlayerId(input.playerId);
  const battleId = String(input.battleId || '').trim();
  if (!battleId) throw new Error('Battle ID tələb olunur');
  if (typeof input.cardId !== 'string' || !isBattleLoadoutCardId(input.cardId.trim())) {
    throw new Error('Bu kart battle hovuzunda yoxdur');
  }
  const cardId = input.cardId.trim();
  const requestId =
    input.requestId == null
      ? energyRequestIdForCard(battleId, playerId, cardId)
      : sanitizeEnergyRequestId(input.requestId);
  const slotIndex = typeof input.slotIndex === 'number' && Number.isFinite(input.slotIndex)
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
        const prev = receiptSnap.data() as Record<string, unknown>;
        return {
          duplicate: true,
          cardId: String(prev.cardId ?? cardId),
          cost: Number(prev.cost) || 0,
          energyBefore: Number(prev.energyBefore) || 0,
          energyAfter: Number(prev.energyAfter) || 0,
          requestId,
        };
      }

      if (!parentSnap.exists()) throw new Error('Battle tapılmadı');
      const battle = battleFromData(parentSnap.id, parentSnap.data());
      if (battle.status === 'finished') throw new Error('Battle bitib');
      if (battle.status !== 'locked' && battle.status !== 'active') {
        throw new Error('Kart yalnız battle başladıqdan sonra oynana bilər');
      }

      const side = sideOf(battle, playerId);
      if (!side) throw new Error('Bu döyüşə qoşulmamısan');
      if (battle.kind === 'alliance_map' && !uidOwnsPlayerSlot(battle, playerId, user.uid, side)) {
        throw new Error('Bu hesabın loadout-u deyil');
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

      if (!energySnap.exists()) throw new Error('Energy tapılmadı');
      const current = energyFromData(battleId, playerId, energySnap.data() as Record<string, unknown>);
      if (current.usedCardIds.includes(cardId)) throw new Error('Bu kart artıq oynanıb');
      if (current.energy < cost) throw new Error('Kifayət qədər energy yoxdur');

      const energyAfter = current.energy - cost;
      if (energyAfter < 0 || energyAfter > BATTLE_ENERGY_MAX) {
        throw new Error('Energy mənfi ola bilməz');
      }

      const seq1 = battle.eventSeq + 1;
      const seq2 = battle.eventSeq + 2;
      const playEvent = doc(eventsCol(battleId));
      const energyEvent = doc(eventsCol(battleId));
      const nextStatus = battle.status === 'locked' ? 'active' : battle.status;

      if (!costSnap.exists()) {
        tx.set(costRef, {
          cardId,
          energyCost: cost,
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
        energyBefore: current.energy,
        energyAfter,
        schemaVersion: 1,
        createdAt: serverTimestamp(),
      });

      tx.update(energyRef, {
        energy: energyAfter,
        maxEnergy: BATTLE_ENERGY_MAX,
        usedCardIds: [...current.usedCardIds, cardId],
        lastRequestId: requestId,
        updatedAt: serverTimestamp(),
      });

      tx.update(parentRef, {
        eventSeq: seq2,
        updatedAt: serverTimestamp(),
        status: nextStatus,
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
        duplicate: false,
        cardId,
        cost,
        energyBefore: current.energy,
        energyAfter,
        requestId,
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

export function viewBattleEnergy(energy: BattleEnergy | null): BattleEnergy {
  if (!energy) {
    return {
      battleId: '',
      playerId: '',
      energy: BATTLE_ENERGY_START,
      maxEnergy: BATTLE_ENERGY_MAX,
      usedCardIds: [],
      lastRequestId: null,
    };
  }
  return {
    ...energy,
    energy: clampBattleEnergy(energy.energy),
    maxEnergy: BATTLE_ENERGY_MAX,
  };
}

export { emptyEnergy };
