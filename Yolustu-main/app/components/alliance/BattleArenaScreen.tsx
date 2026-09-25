"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BattleRecord } from '@/app/lib/battleEventLog/battleEventTypes';
import { listenBattleEvents } from '@/app/lib/battleEventLog';
import type { BattleEvent, BattleEventType } from '@/app/lib/battleEventLog/battleEventTypes';
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
import {
  BATTLE_LOADOUT_CARD_METAS,
  BATTLE_LOADOUT_SIZE,
  listenOwnLoadout,
} from '@/app/lib/battleLoadout';
import { officialBattleLeader } from '@/app/lib/battleScore';
import { listenBattleResult, type BattleFinishResult } from '@/app/lib/battleFinish';
import {
  clearPendingBattleRequest,
  readPendingBattleRequest,
  rememberPendingBattleRequest,
} from '@/app/lib/battleReconnect';
import { ALLIANCE_BATTLE_MAX_PER_SIDE } from '@/app/lib/allianceBattleMatchService';
import type { BattleChallenge } from '@/app/lib/battleClick';
import type { PlayerProfile } from './types';
import BattleClickChallengePanel from './BattleClickChallengePanel';
import BattleLoadoutPicker from './BattleLoadoutPicker';
import styles from './battleArena.module.css';

const EVENT_LABELS: Record<BattleEventType, string> = {
  battle_created: 'Döyüş yaradıldı',
  player_joined: 'Oyunçu qoşuldu',
  player_left: 'Oyunçu çıxdı',
  loadout_locked: 'Kart seçimi tamamlandı',
  card_played: 'Kart oynandı',
  energy_changed: 'Enerji dəyişdi',
  card_blocked: 'Kart bloklandı',
  card_countered: 'Kart əks olundu',
  click_started: 'Klik başladı',
  click_completed: 'Klik bitdi',
  damage_applied: 'Zərər tətbiq olundu',
  score_changed: 'Xal dəyişdi',
  turn_started: 'Növbə başladı',
  turn_timeout: 'Növbə vaxtı bitdi',
  battle_finished: 'Döyüş bitdi',
};

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

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatLogTime(ms: number) {
  if (!ms) return '—';
  return new Date(ms).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function actorLabel(event: BattleEvent, playerId: string, players: PlayerProfile[]) {
  if (!event.playerId || event.playerId === 'system') return 'Sistem';
  if (event.playerId === playerId) return 'Sən';
  return playerName(players, event.playerId);
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
  const myAlliance =
    mySide === 'attacker' ? battle.attackerAllianceName ?? 'Hücum' : battle.defenderAllianceName ?? 'Müdafiə';
  const oppAlliance =
    mySide === 'attacker' ? battle.defenderAllianceName ?? 'Müdafiə' : battle.attackerAllianceName ?? 'Hücum';
  const oppIds = mySide === 'attacker' ? battle.defenderPlayerIds ?? [] : battle.attackerPlayerIds ?? [];
  const oppId = oppIds.find(Boolean) || null;

  const [energy, setEnergy] = useState<BattleEnergy | null>(null);
  const [hand, setHand] = useState<string[]>([]);
  const [events, setEvents] = useState<BattleEvent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [serverNow, setServerNow] = useState(0);
  const [result, setResult] = useState<BattleFinishResult | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const requestRef = useRef<string | null>(null);
  const timeoutSent = useRef<number | null>(null);
  const replayed = useRef(false);

  useEffect(() => listenServerClock(setServerNow), []);
  useEffect(() => listenBattleEnergy(battleId, playerId, setEnergy), [battleId, playerId]);
  useEffect(() => listenBattleEvents(battleId, setEvents), [battleId]);
  useEffect(() => listenBattleResult(battleId, setResult), [battleId]);
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
  const lead = officialBattleLeader(battle);
  const myScore = mySide === 'attacker' ? lead.attackerScore : lead.defenderScore;
  const oppScore = mySide === 'attacker' ? lead.defenderScore : lead.attackerScore;

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

  const finishPlay = useCallback(
    (cardId: string, playResult: { duplicate: boolean; cost: number; damage: number; playerDelta: number; effects: string[] }) => {
      requestRef.current = null;
      clearPendingBattleRequest(playerId, 'play');
      setSelected(null);
      setConfirm(
        playResult.duplicate
          ? 'Server təsdiqlədi · eyni request təkrarlandı, energy yenidən çıxılmadı'
          : `Server təsdiqlədi · ${cardMeta(cardId)?.title ?? cardId} · −${playResult.cost} energy · zərər ${playResult.damage} · xal +${playResult.playerDelta}`
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
      const playResult = await playBattleCard({
        battleId,
        playerId,
        cardId: selected,
        requestId,
        expectedStateVersion: battle.stateVersion ?? 0,
        expectedEventSeq: battle.eventSeq,
      });
      finishPlay(selected, playResult);
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
    const replayId = pending.cardId;
    const timer = window.setTimeout(() => setBusyId(replayId), 0);
    void playBattleCard({
      battleId: pending.battleId,
      playerId: pending.playerId,
      cardId: pending.cardId,
      requestId: pending.requestId,
      expectedStateVersion: pending.expectedStateVersion,
      expectedEventSeq: pending.expectedEventSeq,
    })
      .then((playResult) => finishPlay(pending.cardId, playResult))
      .catch((err) => {
        if (!isTransientPlayError(err)) {
          requestRef.current = null;
          clearPendingBattleRequest(playerId, 'play');
        }
        const msg = err instanceof Error ? err.message : 'Kart oynanılmadı';
        if (!/dəyişib|növbən deyil/i.test(msg)) setError(`Server rədd etdi: ${msg}`);
      })
      .finally(() => setBusyId(null));
    return () => window.clearTimeout(timer);
  }, [battleId, finishPlay, playerId]);

  const energyValue = shownEnergy?.energy ?? 0;
  const energyMax = shownEnergy?.maxEnergy ?? BATTLE_ENERGY_MAX;
  const canPressPlay = Boolean(selected) && !busyId && battle.status === 'active';
  const playLabel = busyId
    ? 'Gözlənilir…'
    : waitingServer
      ? 'Server…'
      : battle.status !== 'active'
        ? battle.status === 'joining'
          ? 'Qoşulma'
          : battle.status === 'finished'
            ? 'Bitdi'
            : 'Gözlə'
        : !myTurn
          ? 'Növbə'
          : !selected
            ? 'Kart seç'
            : 'Kartı Oyna';

  const myName = playerName(players, playerId);
  const oppName = oppId ? playerName(players, oppId) : 'Gözlənilir';
  const myPicks = padSlots(hand, BATTLE_LOADOUT_SIZE);
  const recentEvents = useMemo(() => [...events].sort((a, b) => b.seq - a.seq).slice(0, 3), [events]);
  const showLoadout =
    battle.status === 'joining' || battle.status === 'locked' || (battle.status === 'active' && hand.length === 0);

  const timerText = !timer.ready
    ? '--:--'
    : timer.expired
      ? '00:00'
      : formatClock(timer.remainingMs);
  const turnLine =
    battle.status === 'joining'
      ? joinRemainingMs > 0
        ? `Qoşulma · ${Math.ceil(joinRemainingMs / 1000)} san`
        : 'Qoşulma bağlanır'
      : battle.status === 'finished'
        ? 'Döyüş bitdi'
        : `Növbə ${battle.turn ?? 1}`;

  return (
    <div className={styles.arena} role="dialog" aria-label="Arena">
      <div className={styles.sky} aria-hidden />

      <header className={styles.hud}>
        <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Geri">
          ←
        </button>
        <div className={styles.hudTitle}>
          <strong>Arena</strong>
          <small>İttifaq döyüşü</small>
        </div>
        <div className={styles.timerPill} data-expired={timer.expired ? '1' : '0'}>
          <button
            type="button"
            className={styles.infoBtn}
            onClick={() => setHintOpen((v) => !v)}
            aria-label="Vaxt məlumatı"
          >
            i
          </button>
          <div>
            <b>{timerText}</b>
            <span>{turnLine}</span>
          </div>
        </div>
        <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Bağla">
          ✕
        </button>
      </header>

      {hintOpen ? (
        <p className={styles.hint}>Hər növbəyə ayrılan vaxt: {BATTLE_TURN_DURATION_MS / 1000} saniyə. Server saatı ilə ölçülür.</p>
      ) : null}

      <section className={styles.versus} aria-label="Oyunçular">
        <div className={styles.fighter} data-side="you">
          <div className={styles.avatar} data-you="1" aria-hidden>
            {initials(myName)}
          </div>
          <div className={styles.fighterMeta}>
            <strong>Sən</strong>
            <small>{mySide === 'attacker' ? 'Hücum' : 'Müdafiə'}</small>
            <div className={styles.hp} data-you="1">
              <i style={{ width: `${Math.min(100, (myScore / Math.max(myScore + oppScore, 1)) * 100)}%` }} />
            </div>
            <em>{myScore}</em>
            <span className={styles.clan}>{myAlliance}</span>
          </div>
        </div>
        <div className={styles.vs} aria-hidden>
          VS
        </div>
        <div className={styles.fighter} data-side="opp">
          <div className={styles.fighterMeta} data-align="end">
            <strong>{oppId ? 'Rəqib' : 'Boş'}</strong>
            <small>{mySide === 'attacker' ? 'Müdafiə' : 'Hücum'}</small>
            <div className={styles.hp} data-you="0">
              <i style={{ width: `${Math.min(100, (oppScore / Math.max(myScore + oppScore, 1)) * 100)}%` }} />
            </div>
            <em>{oppScore}</em>
            <span className={styles.clan}>{oppAlliance}</span>
          </div>
          <div className={styles.avatar} data-you="0" aria-hidden>
            {oppId ? initials(oppName) : '؟'}
          </div>
        </div>
      </section>

      <main className={styles.stage}>
        <div className={styles.picks}>
          <div>
            <p>Sənin seçdiyin kartlar</p>
            <div className={styles.pickRow}>
              {myPicks.map((cardId, index) => {
                const meta = cardId ? cardMeta(cardId) : null;
                return (
                  <div key={`mine-${index}`} className={styles.pick} data-filled={meta ? '1' : '0'}>
                    {meta?.image ? <img src={meta.image} alt="" /> : <span>{meta?.emoji ?? '?'}</span>}
                  </div>
                );
              })}
            </div>
          </div>
          <div data-align="end">
            <p>Rəqibin seçdiyi kartlar</p>
            <div className={styles.pickRow}>
              {Array.from({ length: BATTLE_LOADOUT_SIZE }, (_, index) => (
                <div key={`opp-${index}`} className={styles.pick} data-secret="1">
                  <span>?</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showLoadout ? (
          <div className={styles.loadoutSheet}>
            <BattleLoadoutPicker
              battleId={battleId}
              playerId={playerId}
              side={mySide}
              battleStatus={battle.status}
              players={players}
            />
          </div>
        ) : null}
      </main>

      <div className={styles.actionRow}>
        <div className={styles.energyBox}>
          <span>
            ⚡ {shownEnergy ? `${energyValue}/${energyMax}` : `…/${energyMax}`}
          </span>
          <div className={styles.energyTrack} aria-hidden>
            <div
              className={styles.energyFill}
              style={{ width: shownEnergy ? `${Math.min(100, (energyValue / energyMax) * 100)}%` : '0%' }}
            />
          </div>
        </div>
        <button
          type="button"
          className={styles.playBtn}
          disabled={!canPressPlay}
          onClick={() => void onPlay()}
        >
          <span aria-hidden>⚔</span>
          {playLabel}
        </button>
      </div>

      <div className={styles.hand} aria-label="Sənin 5 kartın">
        {myPicks.map((cardId, index) => {
          if (!cardId) {
            return (
              <div key={`empty-${index}`} className={styles.handCard} data-empty="1">
                <span className={styles.handCost}>+</span>
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
              <span className={styles.handCost}>{cost}</span>
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
            </button>
          );
        })}
      </div>

      <section className={styles.log} aria-label="Son hadisələr">
        <div className={styles.logHead}>
          <strong>Son hadisələr</strong>
          <span data-live={battle.status === 'active' ? '1' : '0'}>Canlı</span>
        </div>
        {recentEvents.length === 0 ? (
          <p className={styles.logEmpty}>Hələ hadisə yoxdur</p>
        ) : (
          <ol>
            {recentEvents.map((event) => (
              <li key={event.eventId}>
                <time>{formatLogTime(event.createdAt)}</time>
                <b>{actorLabel(event, playerId, players)}</b>
                <span>
                  {event.type === 'card_played' && eventMeta(event).cardId
                    ? `${cardMeta(String(eventMeta(event).cardId))?.title ?? eventMeta(event).cardId} oynandı`
                    : EVENT_LABELS[event.type]}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className={styles.clickWrap}>
        <BattleClickChallengePanel
          key={battleId}
          battleId={battleId}
          playerId={playerId}
          restoredChallenges={restoredChallenges}
        />
      </div>

      {battle.status === 'finished' || result ? (
        <p className={styles.bannerOk}>
          {result?.reason === 'join_failed'
            ? 'Döyüş başlamadı. Qalib yoxdur.'
            : `${lead.attackerScore}–${lead.defenderScore} · ${
                lead.reason === 'draw' ? 'bərabər' : lead.leaderSide === 'attacker' ? 'hücum irəlidə' : 'müdafiə irəlidə'
              }`}
        </p>
      ) : null}
      {busyId ? <p className={styles.bannerWait}>Kart serverə göndərilir…</p> : null}
      {confirm ? <p className={styles.bannerOk}>{confirm}</p> : null}
      {error ? <p className={styles.bannerErr}>{error}</p> : null}
    </div>
  );
}
