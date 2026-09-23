"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BattleRecord } from '@/app/lib/battleEventLog/battleEventTypes';
import { listenBattleEvents } from '@/app/lib/battleEventLog';
import type { BattleEvent } from '@/app/lib/battleEventLog/battleEventTypes';
import {
  BATTLE_ENERGY_MAX,
  listenBattleEnergy,
  makeEnergyRequestId,
  officialCardEnergyCost,
  playBattleCard,
  type BattleEnergy,
} from '@/app/lib/battleEnergy';
import {
  BATTLE_CARD_MAX_USES,
  BATTLE_TURN_DURATION_MS,
  canPlayOnTurn,
  cardUsageCount,
  listenServerClock,
  timeoutBattleTurn,
  viewTurnTimer,
} from '@/app/lib/battlePlay';
import { BATTLE_LOADOUT_CARD_METAS, listenOwnLoadout } from '@/app/lib/battleLoadout';
import { viewCardEffectLabel } from '@/app/lib/battleEffects';
import {
  clearPendingBattleRequest,
  readPendingBattleRequest,
  rememberPendingBattleRequest,
} from '@/app/lib/battleReconnect';
import { ALLIANCE_BATTLE_MAX_PER_SIDE } from '@/app/lib/allianceBattleMatchService';
import type { BattleChallenge } from '@/app/lib/battleClick';
import type { PlayerProfile } from './types';
import BattleScorePanel from './BattleScorePanel';
import BattleClickChallengePanel from './BattleClickChallengePanel';
import BattleLoadoutPicker from './BattleLoadoutPicker';
import styles from './battleArena.module.css';

function isTransientPlayError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return /vaxtı|timeout|network|offline|unavailable|oynanılmadı|Failed to|internet/i.test(msg);
}

function padSlots(ids: string[], size = ALLIANCE_BATTLE_MAX_PER_SIDE): (string | null)[] {
  const next = ids.slice(0, size);
  while (next.length < size) next.push('');
  return next.map((id) => (id ? id : null));
}

function cardMeta(cardId: string) {
  return BATTLE_LOADOUT_CARD_METAS.find((item) => item.id === cardId);
}

function eventMeta(event: BattleEvent): Record<string, unknown> {
  return (event.meta ?? {}) as Record<string, unknown>;
}

function playerName(players: PlayerProfile[], id: string) {
  return players.find((item) => item.odId === id)?.displayName || `ID ${id}`;
}

function statusLabel(battle: BattleRecord, myTurn: boolean, joinRemainingMs = 0) {
  if (battle.status === 'finished') return 'Döyüş bitdi';
  if (battle.status === 'locked') return 'Kilitləndi — döyüş açılır';
  if (battle.status === 'joining') {
    const sec = Math.max(0, Math.ceil(joinRemainingMs / 1000));
    return sec > 0 ? `Qoşulma · ${sec} san` : 'Qoşulma bağlanır';
  }
  if (battle.status !== 'active') return battle.status;
  return myTurn ? 'Sənin növbən' : `Növbə: ${battle.turnPlayerId ?? '—'}`;
}

export default function BattleArenaScreen({
  battle,
  playerId,
  players,
  restoredEnergy,
  restoredChallenges,
  joinRemainingMs = 0,
  onClose,
}: {
  battle: BattleRecord;
  playerId: string;
  players: PlayerProfile[];
  restoredEnergy?: BattleEnergy | null;
  restoredChallenges?: BattleChallenge[];
  joinRemainingMs?: number;
  onClose: () => void;
}) {
  const battleId = battle.id;
  const mySide = (battle.attackerPlayerIds ?? []).includes(playerId) ? 'attacker' : 'defender';
  const oppIds = mySide === 'attacker' ? battle.defenderPlayerIds ?? [] : battle.attackerPlayerIds ?? [];
  const oppAlliance =
    mySide === 'attacker' ? battle.defenderAllianceName ?? 'Müdafiə' : battle.attackerAllianceName ?? 'Hücum';

  const [energy, setEnergy] = useState<BattleEnergy | null>(null);
  const [hand, setHand] = useState<string[]>([]);
  const [events, setEvents] = useState<BattleEvent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [serverNow, setServerNow] = useState(0);
  const requestRef = useRef<string | null>(null);
  const timeoutSent = useRef<number | null>(null);
  const replayed = useRef(false);

  useEffect(() => listenServerClock(setServerNow), []);
  useEffect(() => listenBattleEnergy(battleId, playerId, setEnergy), [battleId, playerId]);
  useEffect(() => listenBattleEvents(battleId, setEvents), [battleId]);
  useEffect(
    () =>
      listenOwnLoadout(battleId, playerId, (loadout) => {
        setHand(loadout?.cardIds ?? []);
      }),
    [battleId, playerId]
  );

  const shownEnergy = energy ?? (restoredEnergy?.battleId === battleId ? restoredEnergy : null);
  const myTurn = canPlayOnTurn(battle, playerId);
  const timer = viewTurnTimer(battle, serverNow);
  const waitingServer = battle.status === 'active' && (!shownEnergy || !timer.ready);

  useEffect(() => {
    if (!timer.ready || !timer.expired) return;
    if (timeoutSent.current === battle.stateVersion) return;
    timeoutSent.current = battle.stateVersion ?? 0;
    void timeoutBattleTurn({
      battleId,
      playerId,
      expectedStateVersion: battle.stateVersion ?? 0,
    }).catch(() => {
      timeoutSent.current = null;
    });
  }, [battle.stateVersion, battleId, playerId, timer.expired, timer.ready]);

  const tableCards = useMemo(() => {
    const played = events
      .filter((item) => item.type === 'card_played')
      .sort((a, b) => a.seq - b.seq)
      .map((item) => String(eventMeta(item).cardId || ''))
      .filter(Boolean);
    return padSlots(played.slice(-ALLIANCE_BATTLE_MAX_PER_SIDE));
  }, [events]);

  const effectChips = useMemo(() => {
    const last = [...events].reverse().find((item) => item.type === 'card_played');
    const chips: string[] = [];
    if (last && eventMeta(last).cardId) {
      const cardId = String(eventMeta(last).cardId);
      const label = viewCardEffectLabel(cardId);
      chips.push(label || cardId);
    }
    const dmg = [...events].reverse().find((item) => item.type === 'damage_applied');
    if (dmg && eventMeta(dmg).amount != null) chips.push(`zərər ${eventMeta(dmg).amount}`);
    return chips.slice(0, 4);
  }, [events]);

  const finishPlay = useCallback(
    (cardId: string, result: { duplicate: boolean; cost: number; damage: number; playerDelta: number; effects: string[] }) => {
      requestRef.current = null;
      clearPendingBattleRequest(playerId, 'play');
      setSelected(null);
      setConfirm(
        result.duplicate
          ? 'Server təsdiqlədi · eyni request təkrarlandı, energy yenidən çıxılmadı'
          : `Server təsdiqlədi · ${cardMeta(cardId)?.title ?? cardId} · −${result.cost} energy · zərər ${result.damage} · xal +${result.playerDelta}`
      );
    },
    [playerId]
  );

  const onPlay = useCallback(async () => {
    if (!selected || busyId) return;
    setBusyId(selected);
    setError(null);
    setConfirm(null);
    const requestId = requestRef.current ?? makeEnergyRequestId();
    requestRef.current = requestId;
    rememberPendingBattleRequest(playerId, {
      kind: 'play',
      battleId,
      playerId,
      cardId: selected,
      requestId,
      expectedStateVersion: battle.stateVersion ?? 0,
      expectedEventSeq: battle.eventSeq,
    });
    try {
      const result = await playBattleCard({
        battleId,
        playerId,
        cardId: selected,
        requestId,
        expectedStateVersion: battle.stateVersion ?? 0,
        expectedEventSeq: battle.eventSeq,
      });
      finishPlay(selected, result);
    } catch (err) {
      if (!isTransientPlayError(err)) {
        requestRef.current = null;
        clearPendingBattleRequest(playerId, 'play');
      }
      setError(err instanceof Error ? `Server rədd etdi: ${err.message}` : 'Server rədd etdi: kart oynanılmadı');
    } finally {
      setBusyId(null);
    }
  }, [battle.eventSeq, battle.stateVersion, battleId, busyId, finishPlay, playerId, selected]);

  useEffect(() => {
    if (replayed.current) return;
    const pending = readPendingBattleRequest(playerId, 'play');
    if (!pending || pending.kind !== 'play') return;
    if (pending.battleId !== battleId) return;
    replayed.current = true;
    requestRef.current = pending.requestId;
    setBusyId(pending.cardId);
    void playBattleCard({
      battleId: pending.battleId,
      playerId: pending.playerId,
      cardId: pending.cardId,
      requestId: pending.requestId,
      expectedStateVersion: pending.expectedStateVersion,
      expectedEventSeq: pending.expectedEventSeq,
    })
      .then((result) => finishPlay(pending.cardId, result))
      .catch((err) => {
        if (!isTransientPlayError(err)) {
          requestRef.current = null;
          clearPendingBattleRequest(playerId, 'play');
        }
        const msg = err instanceof Error ? err.message : 'Kart oynanılmadı';
        if (!/dəyişib|növbən deyil/i.test(msg)) setError(`Server rədd etdi: ${msg}`);
      })
      .finally(() => setBusyId(null));
  }, [battleId, finishPlay, playerId]);

  const energyValue = shownEnergy?.energy ?? 0;
  const energyMax = shownEnergy?.maxEnergy ?? BATTLE_ENERGY_MAX;
  const playLabel = busyId
    ? 'Server gözlənilir…'
    : waitingServer
      ? 'Server state gözlənilir…'
      : battle.status !== 'active'
        ? 'Battle aktiv deyil'
        : !myTurn
          ? 'Növbə gözlənilir'
          : !selected
            ? 'Kart seç'
            : 'Oyna';

  return (
    <div className={styles.arena} role="dialog" aria-label="Battle">
      <header className={styles.top}>
        <div className={styles.topRow}>
          <div className={styles.oppAlliance}>
            <small>Rəqib ittifaq</small>
            <strong>{oppAlliance}</strong>
          </div>
          <div className={styles.status} data-phase={battle.status}>
            <small>Status</small>
            <strong>{statusLabel(battle, myTurn, joinRemainingMs)}</strong>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Bağla">
            ✕
          </button>
        </div>
        <div className={styles.oppSlots} aria-label="Rəqib oyunçular">
          {padSlots(oppIds).map((id, index) => (
            <div key={`opp-${index}`} className={styles.slot} data-filled={id ? '1' : '0'}>
              <span className={styles.slotMark}>{id ? '🛡' : '·'}</span>
              <span className={styles.slotName}>{id ? playerName(players, id) : 'boş'}</span>
            </div>
          ))}
        </div>
      </header>

      <main className={styles.table}>
        <div className={styles.felt}>
          <div className={styles.feltTitle}>Battle masası</div>
          <div className={styles.tableSlots} aria-label="5 player slot">
            {tableCards.map((cardId, index) => {
              const meta = cardId ? cardMeta(cardId) : null;
              return (
                <div key={`slot-${index}`} className={styles.tableSlot} data-filled={cardId ? '1' : '0'}>
                  {meta?.image ? (
                    <img className={styles.tableCard} src={meta.image} alt={meta.title} />
                  ) : (
                    <span className={styles.tableCardEmoji}>{meta?.emoji ?? '—'}</span>
                  )}
                  <span className={styles.slotName}>{meta?.title ?? `slot ${index + 1}`}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.effects} aria-live="polite">
          {effectChips.length === 0 ? (
            <span className={styles.effectChip}>Aktiv effekt yoxdur</span>
          ) : (
            effectChips.map((chip) => (
              <span key={chip} className={styles.effectChip}>
                {chip}
              </span>
            ))
          )}
        </div>

        {battle.status === 'active' ? (
          <div className={styles.timer} data-expired={timer.expired ? '1' : '0'}>
            <div className={styles.timerHead}>
              <span>Timer</span>
              <span>
                {!timer.ready
                  ? 'Server saatı…'
                  : timer.expired
                    ? 'Vaxt bitdi'
                    : `${Math.ceil(timer.remainingMs / 1000)} / ${BATTLE_TURN_DURATION_MS / 1000} san`}
              </span>
            </div>
            <div className={styles.timerTrack}>
              <div
                className={styles.timerFill}
                style={{
                  width: timer.ready ? `${Math.min(100, (timer.remainingMs / BATTLE_TURN_DURATION_MS) * 100)}%` : '0%',
                }}
              />
            </div>
          </div>
        ) : null}

        {battle.status === 'joining' || battle.status === 'locked' ? (
          <div className={styles.scoreWrap}>
            <BattleLoadoutPicker
              battleId={battleId}
              playerId={playerId}
              side={mySide}
              battleStatus={battle.status}
              players={players}
            />
          </div>
        ) : null}

        <div className={styles.scoreWrap}>
          <BattleScorePanel battle={battle} playerId={playerId} />
        </div>
        <div className={styles.clickWrap}>
          <BattleClickChallengePanel
            key={battleId}
            battleId={battleId}
            playerId={playerId}
            restoredChallenges={restoredChallenges}
          />
        </div>
      </main>

      <footer className={styles.dock}>
        <div className={styles.energyRow}>
          <span>Energy</span>
          <div className={styles.energyTrack} aria-hidden>
            <div
              className={styles.energyFill}
              style={{ width: `${shownEnergy ? (energyValue / energyMax) * 100 : 0}%` }}
            />
          </div>
          <span>{shownEnergy ? `${energyValue}/${energyMax}` : '…/30'}</span>
        </div>

        <div className={styles.hand} aria-label="Sənin 5 kartın">
          {padSlots(hand).map((cardId, index) => {
            if (!cardId) {
              return (
                <div key={`empty-${index}`} className={styles.handCard} data-selected="0">
                  <span className={styles.handEmoji}>+</span>
                  <span className={styles.handTitle}>boş</span>
                </div>
              );
            }
            const meta = cardMeta(cardId);
            const used = cardUsageCount(shownEnergy?.cardUsage ?? {}, cardId);
            const cost = officialCardEnergyCost(cardId);
            return (
              <button
                key={cardId}
                type="button"
                className={styles.handCard}
                data-selected={selected === cardId ? '1' : '0'}
                data-busy={busyId === cardId ? '1' : '0'}
                disabled={Boolean(busyId) || battle.status !== 'active'}
                onClick={() => setSelected(cardId)}
              >
                {meta?.image ? (
                  <img className={styles.handArt} src={meta.image} alt={meta.title} />
                ) : (
                  <span className={styles.handEmoji}>{meta?.emoji ?? '🃏'}</span>
                )}
                <span className={styles.handTitle}>{meta?.title ?? cardId}</span>
                <span className={styles.usage} aria-label={`${used}/${BATTLE_CARD_MAX_USES}`}>
                  {Array.from({ length: BATTLE_CARD_MAX_USES }, (_, pip) => (
                    <i key={pip} className={styles.usagePip} data-on={pip < used ? '1' : '0'} />
                  ))}
                </span>
                <span className={styles.handTitle}>⚡{cost}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className={styles.playBtn}
          disabled={!selected || Boolean(busyId) || battle.status !== 'active'}
          onClick={() => void onPlay()}
        >
          {playLabel}
        </button>

        {busyId ? <p className={`${styles.banner} ${styles.bannerWait}`}>Kart serverə göndərilir…</p> : null}
        {confirm ? <p className={`${styles.banner} ${styles.bannerOk}`}>{confirm}</p> : null}
        {error ? <p className={`${styles.banner} ${styles.bannerErr}`}>{error}</p> : null}
      </footer>
    </div>
  );
}
