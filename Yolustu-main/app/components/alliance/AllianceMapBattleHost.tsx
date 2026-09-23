"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AllianceMapSheet from './AllianceMapSheet';
import { useAllianceBrain } from './AllianceBrainContext';
import type { AllianceData, PlayerProfile } from './types';
import {
  ALLIANCE_BATTLE_MAX_PER_SIDE,
  identifyAlliance,
  joinAllianceMapBattle,
  listenAllianceBattleGate,
  listenAllianceMapBattle,
  listenMyJoiningBattle,
  activateAllianceBattle,
  lockAllianceMapBattle,
  officialJoinEndsAt,
  startAllianceMapBattle,
  viewAllianceBattleGate,
  viewAllianceBattle,
  type AllianceBattleGate,
  type AllianceBattleView,
} from '@/app/lib/allianceBattleMatchService';
import {
  listenBattleReconnect,
  rememberLiveBattleHint,
  clearLiveBattleHint,
  type BattleReconnectSnapshot,
} from '@/app/lib/battleReconnect';
import { finishBattle, officialFinishReason } from '@/app/lib/battleFinish';
import BattleLoadoutPicker from './BattleLoadoutPicker';
import BattleEnergyPanel from './BattleEnergyPanel';
import BattleScorePanel from './BattleScorePanel';
import BattleClickChallengePanel from './BattleClickChallengePanel';
import BattleEventLogPanel from './BattleEventLogPanel';
import BattleArenaScreen from './BattleArenaScreen';
import styles from './alliance.module.css';

function playerName(players: PlayerProfile[], id: string) {
  return players.find((item) => item.odId === id)?.displayName || `ID ${id}`;
}

function formatRemain(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}s ${m}dəq`;
  if (m > 0) return `${m}dəq ${s}san`;
  return `${s} san`;
}

function SideList({
  title,
  ids,
  players,
  you,
}: {
  title: string;
  ids: string[];
  players: PlayerProfile[];
  you: string;
}) {
  return (
    <div className={styles.battleJoinSide}>
      <div className={styles.battleJoinSideHead}>
        {title}{' '}
        <span>
          {ids.length}/{ALLIANCE_BATTLE_MAX_PER_SIDE}
        </span>
      </div>
      {ids.length === 0 ? (
        <p className={styles.battleJoinEmpty}>Hələ heç kim yoxdur</p>
      ) : (
        ids.map((id) => (
          <div key={id} className={styles.battleJoinRow}>
            {id === you ? 'Sən' : playerName(players, id)}
          </div>
        ))
      )}
    </div>
  );
}

export default function AllianceMapBattleHost({
  selectedAllianceId,
  onClearSelected,
}: {
  selectedAllianceId: string | null;
  onClearSelected: () => void;
}) {
  const { userId, activeAlliance, alliances, players } = useAllianceBrain();
  const [identified, setIdentified] = useState<AllianceData | null>(null);
  const [identifyError, setIdentifyError] = useState<string | null>(null);
  const [gate, setGate] = useState<AllianceBattleGate | null>(null);
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [view, setView] = useState<AllianceBattleView | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [reconnectSnap, setReconnectSnap] = useState<BattleReconnectSnapshot | null>(null);
  const attackLock = useRef(false);
  const autoJoinRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!userId) return;
    return listenBattleReconnect(userId, (snap) => {
      if (!snap) {
        setRestored(false);
        setReconnectSnap(null);
        return;
      }
      setReconnectSnap(snap);
      setLobbyId(snap.battle.id);
      setView(viewAllianceBattle(snap.battle, snap.serverNow || Date.now()));
      setRestored(true);
    });
  }, [userId]);

  useEffect(() => {
    if (!selectedAllianceId) return;
    let cancelled = false;
    void identifyAlliance(selectedAllianceId)
      .then((alliance) => {
        if (!cancelled) {
          setIdentified(alliance);
          setIdentifyError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setIdentified(null);
          setIdentifyError(err instanceof Error ? err.message : 'İttifaq tapılmadı');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAllianceId]);

  useEffect(() => {
    if (!selectedAllianceId) return;
    return listenAllianceBattleGate(selectedAllianceId, setGate);
  }, [selectedAllianceId]);

  useEffect(() => {
    if (!activeAlliance?.id) return;
    return listenMyJoiningBattle(activeAlliance.id, (id) => {
      if (id) setLobbyId(id);
    });
  }, [activeAlliance?.id]);

  useEffect(() => {
    if (!selectedAllianceId) return;
    return listenMyJoiningBattle(selectedAllianceId, (id) => {
      if (id) setLobbyId(id);
    });
  }, [selectedAllianceId]);

  useEffect(() => {
    if (!lobbyId) return;
    return listenAllianceMapBattle(lobbyId, setView);
  }, [lobbyId]);

  useEffect(() => {
    if (!view) return;
    if (view.battle.status !== 'joining') return;
    const endsAt = officialJoinEndsAt(view.battle, now);
    if (now < endsAt) return;
    void lockAllianceMapBattle(view.battle.id, userId).catch(() => {});
  }, [view, userId, now]);

  useEffect(() => {
    if (!view) return;
    if (view.battle.status !== 'locked') return;
    void activateAllianceBattle(view.battle.id, userId).catch(() => {});
  }, [view, userId]);

  useEffect(() => {
    if (!view || !userId) return;
    if (view.battle.status !== 'active') return;
    if (!officialFinishReason(view.battle)) return;
    void finishBattle({ battleId: view.battle.id, playerId: userId }).catch(() => {});
  }, [view, userId]);

  useEffect(() => {
    if (!userId || !view) return;
    const inBattle = [...(view.battle.attackerPlayerIds ?? []), ...(view.battle.defenderPlayerIds ?? [])].includes(
      userId
    );
    if (!inBattle) return;
    if (view.battle.status === 'finished') {
      clearLiveBattleHint(userId);
      return;
    }
    if (view.battle.status === 'joining' || view.battle.status === 'locked' || view.battle.status === 'active') {
      rememberLiveBattleHint(userId, view.battle.id);
    }
  }, [userId, view]);

  const resolvedIdentified = selectedAllianceId ? identified : null;
  const resolvedIdentifyError = selectedAllianceId ? identifyError : null;
  const resolvedGate = selectedAllianceId ? gate : null;

  const liveGate = useMemo(
    () => (selectedAllianceId ? viewAllianceBattleGate(selectedAllianceId, resolvedGate, now) : null),
    [selectedAllianceId, resolvedGate, now]
  );

  const liveView = useMemo(() => {
    if (!lobbyId || !view) return null;
    return viewAllianceBattle(view.battle, now);
  }, [lobbyId, view, now]);

  const ownTarget = Boolean(resolvedIdentified && activeAlliance && resolvedIdentified.id === activeAlliance.id);
  const showAttack = Boolean(liveGate?.canAttack && resolvedIdentified && !ownTarget && activeAlliance);
  const alreadyIn =
    liveView &&
    [...(liveView.battle.attackerPlayerIds ?? []), ...(liveView.battle.defenderPlayerIds ?? [])].includes(userId);
  const mySide =
    liveView && (liveView.battle.attackerPlayerIds ?? []).includes(userId)
      ? 'attacker'
      : liveView && (liveView.battle.defenderPlayerIds ?? []).includes(userId)
        ? 'defender'
        : null;

  const onAttack = useCallback(async () => {
    if (!resolvedIdentified || attackLock.current || busy) return;
    attackLock.current = true;
    setBusy(true);
    setError(null);
    try {
      const battle = await startAllianceMapBattle({
        playerId: userId,
        defenderAllianceId: resolvedIdentified.id,
      });
      rememberLiveBattleHint(userId, battle.id);
      setLobbyId(battle.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hücum başlamadı');
    } finally {
      setBusy(false);
      window.setTimeout(() => {
        attackLock.current = false;
      }, 800);
    }
  }, [resolvedIdentified, busy, userId]);

  const onJoin = useCallback(async () => {
    if (!liveView || busy) return;
    setBusy(true);
    setError(null);
    try {
      await joinAllianceMapBattle({ battleId: liveView.battle.id, playerId: userId });
      rememberLiveBattleHint(userId, liveView.battle.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Qoşulmaq olmadı');
    } finally {
      setBusy(false);
    }
  }, [liveView, busy, userId]);

  const localAlliance = resolvedIdentified || alliances.find((item) => item.id === selectedAllianceId) || null;
  const realFinish = Boolean(
    liveView &&
      liveView.battle.status === 'finished' &&
      liveView.battle.finishReason &&
      liveView.battle.finishReason !== 'join_failed'
  );
  const showInfo = Boolean(selectedAllianceId) && !lobbyId;
  const showArena = Boolean(
    alreadyIn &&
      liveView &&
      (liveView.battle.status === 'joining' ||
        liveView.battle.status === 'locked' ||
        liveView.battle.status === 'active' ||
        realFinish)
  );
  const showLobby = Boolean(lobbyId && liveView && !showArena);

  useEffect(() => {
    if (!liveView || !userId || !activeAlliance?.id || busy) return;
    if (liveView.battle.status !== 'joining' || !liveView.joinOpen) return;
    const inBattle = [...(liveView.battle.attackerPlayerIds ?? []), ...(liveView.battle.defenderPlayerIds ?? [])].includes(
      userId
    );
    if (inBattle) return;
    const myAlliance = activeAlliance.id;
    if (myAlliance !== liveView.battle.attackerAllianceId && myAlliance !== liveView.battle.defenderAllianceId) {
      return;
    }
    if (autoJoinRef.current === liveView.battle.id) return;
    autoJoinRef.current = liveView.battle.id;
    void onJoin();
  }, [activeAlliance?.id, busy, liveView, onJoin, userId]);

  return (
    <>
      <AllianceMapSheet
        open={showInfo}
        onClose={onClearSelected}
        title={localAlliance ? localAlliance.name : 'İttifaq'}
      >
        {resolvedIdentifyError ? <p className={styles.battleJoinWarn}>{resolvedIdentifyError}</p> : null}
        {localAlliance ? (
          <div className={styles.battleTargetInfo}>
            <p>📍 {localAlliance.region}</p>
            <p>👑 {localAlliance.leader}</p>
            <p>⭐ {localAlliance.score || 50} xal</p>
            <p>👥 {(localAlliance.members ?? []).length} üzv</p>
            <p>🏰 Qala Lv.{localAlliance.fortressLevel ?? 1}</p>
          </div>
        ) : (
          <p>İttifaq yoxlanır…</p>
        )}

        {ownTarget ? <p className={styles.battleJoinHint}>Bu sənin ittifaqındır.</p> : null}
        {!activeAlliance ? <p className={styles.battleJoinWarn}>Hücum üçün öz ittifaqın olmalıdır.</p> : null}
        {liveGate && !liveGate.canAttack ? (
          <p className={styles.battleJoinHint}>
            Bu ittifaqa son 3 saat ərzində hücum edilib. Yenidən:{' '}
            {formatRemain(liveGate.cooldownUntil - now)}
          </p>
        ) : null}

        {error ? <p className={styles.battleJoinWarn}>{error}</p> : null}

        {showAttack ? (
          <button
            type="button"
            className={styles.battleAttackBtn}
            disabled={busy}
            onClick={() => void onAttack()}
          >
            {busy ? 'Göndərilir…' : 'Hücum et'}
          </button>
        ) : null}
      </AllianceMapSheet>

      <AllianceMapSheet
        open={showLobby}
        onClose={() => {
          setLobbyId(null);
          onClearSelected();
        }}
        title={
          liveView
            ? `${liveView.battle.attackerAllianceName} vs ${liveView.battle.defenderAllianceName}`
            : 'Döyüş'
        }
      >
        {liveView ? (
          <>
            <div className={styles.battleJoinTimer} data-phase={liveView.phase}>
              {liveView.phase === 'joining'
                ? `Qoşulma: ${formatRemain(liveView.joinRemainingMs)}`
                : liveView.phase === 'locked'
                  ? 'Döyüş kilitləndi — yeni oyunçu qoşula bilməz'
                  : liveView.phase === 'active'
                    ? `Döyüş aktiv · növbə: ${liveView.battle.turnPlayerId ?? '—'}`
                    : liveView.phase === 'finished'
                    ? 'Döyüş bitdi / qoşulma alınmadı'
                    : liveView.phase}
            </div>
            <div className={styles.battleJoinGrid}>
              <SideList
                title={`⚔ ${liveView.battle.attackerAllianceName ?? 'Hücum'}`}
                ids={liveView.battle.attackerPlayerIds ?? []}
                players={players}
                you={userId}
              />
              <SideList
                title={`🛡 ${liveView.battle.defenderAllianceName ?? 'Müdafiə'}`}
                ids={liveView.battle.defenderPlayerIds ?? []}
                players={players}
                you={userId}
              />
            </div>
            {error ? <p className={styles.battleJoinWarn}>{error}</p> : null}
            {restored ? (
              <p className={styles.battleReconnectNote}>Döyüş server state-dən bərpa olundu.</p>
            ) : null}
            {liveView.joinOpen && !alreadyIn ? (
              <button type="button" className={styles.battleAttackBtn} disabled={busy} onClick={() => void onJoin()}>
                {busy ? 'Qoşulur…' : 'Döyüşə qoşul'}
              </button>
            ) : null}
            {alreadyIn && liveView.phase === 'joining' ? (
              <p className={styles.battleJoinHint}>Qoşuldun. Digər oyunçular gözlənilir. 5 kartını seç.</p>
            ) : null}
            {alreadyIn && mySide ? (
              <BattleLoadoutPicker
                battleId={liveView.battle.id}
                playerId={userId}
                side={mySide}
                battleStatus={liveView.battle.status}
                players={players}
              />
            ) : null}
            {alreadyIn ? (
              <BattleEnergyPanel
                battle={liveView.battle}
                playerId={userId}
                restoredEnergy={
                  reconnectSnap?.battle.id === liveView.battle.id ? reconnectSnap.energy : null
                }
              />
            ) : null}
            <BattleScorePanel battle={liveView.battle} playerId={userId} />
            {alreadyIn ? (
              <BattleClickChallengePanel
                key={liveView.battle.id}
                battleId={liveView.battle.id}
                playerId={userId}
                restoredChallenges={
                  reconnectSnap?.battle.id === liveView.battle.id ? reconnectSnap.challenges : undefined
                }
              />
            ) : null}
            <BattleEventLogPanel battleId={liveView.battle.id} />
            {liveView && !alreadyIn ? (
              <p className={styles.battleJoinHint}>Rəqib kart seçimi gizlidir.</p>
            ) : null}
          </>
        ) : (
          <p>Döyüş yüklənir…</p>
        )}
      </AllianceMapSheet>

      {showArena && liveView ? (
        <BattleArenaScreen
          battle={liveView.battle}
          playerId={userId}
          players={players}
          joinRemainingMs={liveView.joinRemainingMs}
          restoredEnergy={
            reconnectSnap?.battle.id === liveView.battle.id ? reconnectSnap.energy : null
          }
          restoredChallenges={
            reconnectSnap?.battle.id === liveView.battle.id ? reconnectSnap.challenges : undefined
          }
          onClose={() => {
            setLobbyId(null);
            onClearSelected();
          }}
        />
      ) : null}
    </>
  );
}
