import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { requireFirebaseAuth } from '@/app/lib/firebaseAuth';
import {
  BATTLE_EVENT_SCHEMA_VERSION,
  type BattleRecord,
  type BattleSide,
} from '@/app/lib/battleEventLog/battleEventTypes';
import {
  battleFromData,
  battleRef,
  eventsCol,
  makeBattleId,
  timestampToMs,
} from '@/app/lib/battleEventLog/battleEventLog';
import { sanitizePlayerId } from '@/app/lib/battleEventLog/sanitizeBattleEventMeta';
import { BATTLE_ENERGY_COLLECTION, initialBattleEnergyDoc } from '@/app/lib/battleEnergy/battleEnergyConfig';
import { initialTurnState } from '@/app/lib/battlePlay/battlePlayConfig';
import type { AllianceData } from '@/app/components/alliance/types';

export const ALLIANCE_BATTLE_COOLDOWN_MS = 3 * 60 * 60 * 1000;
export const ALLIANCE_BATTLE_JOIN_MS = 15_000;
export const ALLIANCE_BATTLE_MIN_PER_SIDE = 1;
export const ALLIANCE_BATTLE_MAX_PER_SIDE = 5;
export const ALLIANCE_BATTLE_COOLDOWN_COLLECTION = 'alliance_battle_cooldowns';

export interface AllianceBattleCooldown {
  allianceId: string;
  lastBattleId: string | null;
  lastBattleAt: number;
  cooldownUntil: number;
  attackerAllianceId: string | null;
}

export interface AllianceBattleGate {
  allianceId: string;
  canAttack: boolean;
  cooldownUntil: number;
  lastBattleId: string | null;
  lastBattleAt: number;
  attackerAllianceId: string | null;
}

export interface AllianceBattleView {
  battle: BattleRecord;
  phase: 'joining' | 'locked' | 'finished' | 'active' | 'open';
  joinRemainingMs: number;
  joinOpen: boolean;
}

const WRITE_MS = 12_000;
const startLocks = new Set<string>();

function cooldownRef(allianceId: string) {
  return doc(db, ALLIANCE_BATTLE_COOLDOWN_COLLECTION, allianceId);
}

function allianceRef(allianceId: string) {
  return doc(db, 'alliances', allianceId);
}

function playerRef(playerId: string) {
  return doc(db, 'players', playerId);
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

function cooldownFromData(allianceId: string, data: Record<string, unknown> | undefined): AllianceBattleCooldown {
  return {
    allianceId,
    lastBattleId: data?.lastBattleId ? String(data.lastBattleId) : null,
    lastBattleAt: timestampToMs(data?.lastBattleAt),
    cooldownUntil: timestampToMs(data?.cooldownUntil),
    attackerAllianceId: data?.attackerAllianceId ? String(data.attackerAllianceId) : null,
  };
}

export function viewAllianceBattleGate(
  allianceId: string,
  cooldown: Pick<AllianceBattleCooldown, 'cooldownUntil' | 'lastBattleId' | 'lastBattleAt' | 'attackerAllianceId'> | null,
  now = Date.now()
): AllianceBattleGate {
  const cooldownUntil = cooldown?.cooldownUntil ?? 0;
  return {
    allianceId,
    canAttack: !cooldown || cooldownUntil <= 0 || now >= cooldownUntil,
    cooldownUntil,
    lastBattleId: cooldown?.lastBattleId ?? null,
    lastBattleAt: cooldown?.lastBattleAt ?? 0,
    attackerAllianceId: cooldown?.attackerAllianceId ?? null,
  };
}

export function viewAllianceBattle(battle: BattleRecord, now = Date.now()): AllianceBattleView {
  const joinEndsAt = battle.joinEndsAt ?? 0;
  const joinRemainingMs = Math.max(0, joinEndsAt - now);
  const timeLocked = battle.status === 'joining' && joinEndsAt > 0 && now >= joinEndsAt;
  const phase =
    battle.status === 'finished'
      ? 'finished'
      : battle.status === 'active'
        ? 'active'
        : battle.status === 'locked' || timeLocked
          ? 'locked'
          : battle.status === 'joining'
            ? 'joining'
            : 'open';
  return {
    battle,
    phase,
    joinRemainingMs: phase === 'joining' ? joinRemainingMs : 0,
    joinOpen: phase === 'joining' && joinRemainingMs > 0,
  };
}

export async function identifyAlliance(allianceId: string): Promise<AllianceData> {
  const id = String(allianceId || '').trim();
  if (!id) throw new Error('İttifaq ID tələb olunur');
  const snap = await getDoc(allianceRef(id));
  if (!snap.exists()) throw new Error('İttifaq tapılmadı');
  return { id: snap.id, ...snap.data() } as AllianceData;
}

export async function getAllianceBattleGate(allianceId: string): Promise<AllianceBattleGate> {
  const snap = await getDoc(cooldownRef(allianceId));
  return viewAllianceBattleGate(
    allianceId,
    snap.exists() ? cooldownFromData(allianceId, snap.data() as Record<string, unknown>) : null
  );
}

export function listenAllianceBattleGate(
  allianceId: string,
  onChange: (gate: AllianceBattleGate) => void
): Unsubscribe {
  return onSnapshot(cooldownRef(allianceId), (snap) => {
    onChange(
      viewAllianceBattleGate(
        allianceId,
        snap.exists() ? cooldownFromData(allianceId, snap.data() as Record<string, unknown>) : null
      )
    );
  });
}

export async function startAllianceMapBattle(input: {
  playerId: string;
  defenderAllianceId: string;
}): Promise<BattleRecord> {
  const authUser = await requireFirebaseAuth();
  const playerId = sanitizePlayerId(input.playerId);
  const defenderAllianceId = String(input.defenderAllianceId || '').trim();
  if (!defenderAllianceId) throw new Error('Hədəf ittifaq seçilməyib');

  const lockKey = `${playerId}:${defenderAllianceId}`;
  if (startLocks.has(lockKey)) throw new Error('Hücum artıq göndərilir');
  startLocks.add(lockKey);

  try {
    return await withTimeout(
      runTransaction(db, async (tx) => {
        const playerSnap = await tx.get(playerRef(playerId));
        if (!playerSnap.exists()) throw new Error('Oyunçu tapılmadı');
        const player = playerSnap.data();
        const attackerAllianceId = String(player.allianceId || '');
        if (!attackerAllianceId) throw new Error('Hücum üçün ittifaqda olmalısan');
        if (attackerAllianceId === defenderAllianceId) throw new Error('Öz ittifaqına hücum edilə bilməz');

        const attackerSnap = await tx.get(allianceRef(attackerAllianceId));
        const defenderSnap = await tx.get(allianceRef(defenderAllianceId));
        if (!attackerSnap.exists() || !defenderSnap.exists()) throw new Error('İttifaq tapılmadı');

        const attacker = attackerSnap.data();
        const defender = defenderSnap.data();
        const attackerMembers: string[] = Array.isArray(attacker.members) ? attacker.members.map(String) : [];
        if (!attackerMembers.includes(playerId) && attacker.leaderId !== playerId) {
          throw new Error('Yalnız öz ittifaqın adından hücum edə bilərsən');
        }

        const cdRef = cooldownRef(defenderAllianceId);
        const cdSnap = await tx.get(cdRef);
        const existingCd = cdSnap.exists()
          ? cooldownFromData(defenderAllianceId, cdSnap.data() as Record<string, unknown>)
          : null;

        if (existingCd?.lastBattleId) {
          const liveSnap = await tx.get(battleRef(existingCd.lastBattleId));
          if (liveSnap.exists()) {
            const live = battleFromData(liveSnap.id, liveSnap.data());
            if (live.status === 'joining' && live.attackerAllianceId === attackerAllianceId) {
              return live;
            }
          }
        }

        if (existingCd && existingCd.cooldownUntil > Date.now()) {
          throw new Error('Bu ittifaqa son 3 saat ərzində hücum edilib');
        }

        const battleId = makeBattleId();
        const parent = battleRef(battleId);
        const eventDoc = doc(eventsCol(battleId));

        tx.set(parent, {
          createdBy: playerId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: 'joining',
          eventSeq: 1,
          participantIds: [playerId],
          schemaVersion: BATTLE_EVENT_SCHEMA_VERSION,
          kind: 'alliance_map',
          attackerAllianceId,
          defenderAllianceId,
          attackerAllianceName: String(attacker.name || 'Hücum'),
          defenderAllianceName: String(defender.name || 'Müdafiə'),
          attackerPlayerIds: [playerId],
          defenderPlayerIds: [],
          attackerUids: [authUser.uid],
          defenderUids: [],
          joinDurationMs: ALLIANCE_BATTLE_JOIN_MS,
        });

        tx.set(eventDoc, {
          eventId: eventDoc.id,
          battleId,
          playerId,
          type: 'battle_created',
          seq: 1,
          createdAt: serverTimestamp(),
          schemaVersion: BATTLE_EVENT_SCHEMA_VERSION,
          meta: { mode: 'alliance', maxPlayers: ALLIANCE_BATTLE_MAX_PER_SIDE * 2 },
        });
        tx.set(doc(db, 'battles', battleId, BATTLE_ENERGY_COLLECTION, playerId), initialBattleEnergyDoc(battleId, playerId));

        tx.set(cdRef, {
          lastBattleId: battleId,
          lastBattleAt: serverTimestamp(),
          cooldownUntil: new Date(Date.now() + ALLIANCE_BATTLE_COOLDOWN_MS),
          attackerAllianceId,
          updatedAt: serverTimestamp(),
        });

        return {
          id: battleId,
          createdBy: playerId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          status: 'joining' as const,
          eventSeq: 1,
          participantIds: [playerId],
          schemaVersion: BATTLE_EVENT_SCHEMA_VERSION,
          kind: 'alliance_map' as const,
          attackerAllianceId,
          defenderAllianceId,
          attackerAllianceName: String(attacker.name || 'Hücum'),
          defenderAllianceName: String(defender.name || 'Müdafiə'),
          attackerPlayerIds: [playerId],
          defenderPlayerIds: [],
          attackerUids: [authUser.uid],
          defenderUids: [],
          joinEndsAt: Date.now() + ALLIANCE_BATTLE_JOIN_MS,
          joinDurationMs: ALLIANCE_BATTLE_JOIN_MS,
        };
      }),
      WRITE_MS,
      'Hücum sorğusu vaxtı bitdi.'
    );
  } finally {
    startLocks.delete(lockKey);
  }
}

export async function joinAllianceMapBattle(input: {
  battleId: string;
  playerId: string;
}): Promise<BattleRecord> {
  const authUser = await requireFirebaseAuth();
  const playerId = sanitizePlayerId(input.playerId);
  const battleId = String(input.battleId || '').trim();

  return withTimeout(
    runTransaction(db, async (tx) => {
      const parentRef = battleRef(battleId);
      const parentSnap = await tx.get(parentRef);
      if (!parentSnap.exists()) throw new Error('Battle tapılmadı');
      const battle = battleFromData(parentSnap.id, parentSnap.data());
      if (battle.kind !== 'alliance_map') throw new Error('Bu battle xəritə döyüşü deyil');
      if (battle.status !== 'joining') throw new Error('Qoşulma mərhələsi bağlıdır');
      if ((battle.joinEndsAt ?? 0) > 0 && Date.now() >= (battle.joinEndsAt ?? 0)) {
        throw new Error('Qoşulma müddəti bitib');
      }

      const attackers = battle.attackerPlayerIds ?? [];
      const defenders = battle.defenderPlayerIds ?? [];
      if (attackers.includes(playerId) || defenders.includes(playerId)) return battle;

      const energyRef = doc(db, 'battles', battleId, BATTLE_ENERGY_COLLECTION, playerId);
      const energySnap = await tx.get(energyRef);
      const playerSnap = await tx.get(playerRef(playerId));
      if (!playerSnap.exists()) throw new Error('Oyunçu tapılmadı');
      const allianceId = String(playerSnap.data().allianceId || '');

      let side: BattleSide;
      if (allianceId && allianceId === battle.attackerAllianceId) side = 'attacker';
      else if (allianceId && allianceId === battle.defenderAllianceId) side = 'defender';
      else throw new Error('Yalnız döyüşən ittifaqların üzvləri qoşula bilər');

      const attackerSnap = await tx.get(allianceRef(battle.attackerAllianceId || ''));
      const defenderSnap = await tx.get(allianceRef(battle.defenderAllianceId || ''));
      const home = side === 'attacker' ? attackerSnap.data() : defenderSnap.data();
      const members: string[] = Array.isArray(home?.members) ? home.members.map(String) : [];
      if (!members.includes(playerId) && home?.leaderId !== playerId) {
        throw new Error('İttifaq üzvü deyilsən');
      }

      const nextAttackers = side === 'attacker' ? [...attackers, playerId] : attackers;
      const nextDefenders = side === 'defender' ? [...defenders, playerId] : defenders;
      const nextAtkUids =
        side === 'attacker' ? [...(battle.attackerUids ?? []), authUser.uid] : battle.attackerUids ?? [];
      const nextDefUids =
        side === 'defender' ? [...(battle.defenderUids ?? []), authUser.uid] : battle.defenderUids ?? [];
      if (nextAttackers.length > ALLIANCE_BATTLE_MAX_PER_SIDE) throw new Error('Hücum tərəfi doludur (5/5)');
      if (nextDefenders.length > ALLIANCE_BATTLE_MAX_PER_SIDE) throw new Error('Müdafiə tərəfi doludur (5/5)');

      const seq = battle.eventSeq + 1;
      const eventDoc = doc(eventsCol(battleId));
      tx.update(parentRef, {
        eventSeq: seq,
        updatedAt: serverTimestamp(),
        status: 'joining',
        participantIds: [...nextAttackers, ...nextDefenders],
        attackerPlayerIds: nextAttackers,
        defenderPlayerIds: nextDefenders,
        attackerUids: nextAtkUids,
        defenderUids: nextDefUids,
      });
      tx.set(eventDoc, {
        eventId: eventDoc.id,
        battleId,
        playerId,
        type: 'player_joined',
        seq,
        createdAt: serverTimestamp(),
        schemaVersion: BATTLE_EVENT_SCHEMA_VERSION,
        meta: { side },
      });
      if (!energySnap.exists()) {
        tx.set(energyRef, initialBattleEnergyDoc(battleId, playerId));
      }

      return {
        ...battle,
        eventSeq: seq,
        updatedAt: Date.now(),
        participantIds: [...nextAttackers, ...nextDefenders],
        attackerPlayerIds: nextAttackers,
        defenderPlayerIds: nextDefenders,
        attackerUids: nextAtkUids,
        defenderUids: nextDefUids,
      };
    }),
    WRITE_MS,
    'Qoşulma vaxtı bitdi.'
  );
}

export async function lockAllianceMapBattle(battleId: string, actorId: string): Promise<BattleRecord> {
  await requireFirebaseAuth();
  const playerId = sanitizePlayerId(actorId);
  const id = String(battleId || '').trim();

  return withTimeout(
    runTransaction(db, async (tx) => {
      const parentRef = battleRef(id);
      const parentSnap = await tx.get(parentRef);
      if (!parentSnap.exists()) throw new Error('Battle tapılmadı');
      const battle = battleFromData(parentSnap.id, parentSnap.data());
      if (battle.status === 'locked' || battle.status === 'finished' || battle.status === 'active') {
        return battle;
      }
      if (battle.status !== 'joining') throw new Error('Battle qoşulma mərhələsində deyil');

      const attackers = battle.attackerPlayerIds ?? [];
      const defenders = battle.defenderPlayerIds ?? [];
      const ok =
        attackers.length >= ALLIANCE_BATTLE_MIN_PER_SIDE &&
        defenders.length >= ALLIANCE_BATTLE_MIN_PER_SIDE;
      const seq = battle.eventSeq + 1;
      const eventDoc = doc(eventsCol(id));
      const status = ok ? 'locked' : 'finished';

      tx.update(parentRef, {
        eventSeq: seq,
        updatedAt: serverTimestamp(),
        status,
      });
      tx.set(eventDoc, {
        eventId: eventDoc.id,
        battleId: id,
        playerId,
        type: ok ? 'loadout_locked' : 'battle_finished',
        seq,
        createdAt: serverTimestamp(),
        schemaVersion: BATTLE_EVENT_SCHEMA_VERSION,
        meta: ok
          ? { slotCount: attackers.length + defenders.length }
          : { reason: 'join_failed' },
      });

      return { ...battle, eventSeq: seq, updatedAt: Date.now(), status };
    }),
    WRITE_MS,
    'Lock yazılması vaxtı bitdi.'
  );
}

export async function activateAllianceBattle(battleId: string, actorId: string): Promise<BattleRecord> {
  await requireFirebaseAuth();
  const playerId = sanitizePlayerId(actorId);
  const id = String(battleId || '').trim();

  return withTimeout(
    runTransaction(db, async (tx) => {
      const parentRef = battleRef(id);
      const parentSnap = await tx.get(parentRef);
      if (!parentSnap.exists()) throw new Error('Battle tapılmadı');
      const battle = battleFromData(parentSnap.id, parentSnap.data());
      if (battle.status === 'active') return battle;
      if (battle.status === 'finished') throw new Error('Battle bitib');
      if (battle.status !== 'locked') throw new Error('Battle hələ kilitlənməyib');

      const attackers = battle.attackerPlayerIds ?? [];
      const defenders = battle.defenderPlayerIds ?? [];
      if (attackers.length < ALLIANCE_BATTLE_MIN_PER_SIDE || defenders.length < ALLIANCE_BATTLE_MIN_PER_SIDE) {
        throw new Error('Hər tərəfdə ən az 1 oyunçu olmalıdır');
      }

      const turn = initialTurnState(battle);
      if (!turn.turnPlayerId) throw new Error('Növbə təyin olunmadı');

      const seq = battle.eventSeq + 1;
      const eventDoc = doc(eventsCol(id));
      tx.update(parentRef, {
        eventSeq: seq,
        updatedAt: serverTimestamp(),
        status: 'active',
        turn: turn.turn,
        turnSide: turn.turnSide,
        turnPlayerId: turn.turnPlayerId,
        stateVersion: turn.stateVersion,
      });
      tx.set(eventDoc, {
        eventId: eventDoc.id,
        battleId: id,
        playerId,
        type: 'turn_started',
        seq,
        createdAt: serverTimestamp(),
        schemaVersion: BATTLE_EVENT_SCHEMA_VERSION,
        meta: { turn: turn.turn, side: turn.turnSide },
      });

      return {
        ...battle,
        eventSeq: seq,
        updatedAt: Date.now(),
        status: 'active' as const,
        turn: turn.turn,
        turnSide: turn.turnSide,
        turnPlayerId: turn.turnPlayerId,
        stateVersion: turn.stateVersion,
      };
    }),
    WRITE_MS,
    'Battle aktivləşdirilmədi.'
  );
}

export function listenAllianceMapBattle(
  battleId: string,
  onChange: (view: AllianceBattleView | null) => void
): Unsubscribe {
  return onSnapshot(battleRef(battleId), (snap) => {
    if (!snap.exists()) {
      onChange(null);
      return;
    }
    onChange(viewAllianceBattle(battleFromData(snap.id, snap.data())));
  });
}

export function listenMyJoiningBattle(
  allianceId: string,
  onChange: (battleId: string | null) => void
): Unsubscribe {
  return onSnapshot(cooldownRef(allianceId), async (snap) => {
    if (!snap.exists()) {
      onChange(null);
      return;
    }
    const cd = cooldownFromData(allianceId, snap.data() as Record<string, unknown>);
    if (!cd.lastBattleId) {
      onChange(null);
      return;
    }
    const battleSnap = await getDoc(battleRef(cd.lastBattleId));
    if (!battleSnap.exists()) {
      onChange(null);
      return;
    }
    const battle = battleFromData(battleSnap.id, battleSnap.data());
    onChange(
      battle.status === 'joining' || battle.status === 'locked' || battle.status === 'active'
        ? battle.id
        : null
    );
  });
}
