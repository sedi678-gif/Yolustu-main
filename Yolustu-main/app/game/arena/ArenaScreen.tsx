"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { listenServerClock } from '@/app/lib/battlePlay/battleServerClock';
import ArenaHeader from './ArenaHeader';
import ClickCardNotification from './ClickCardNotification';
import HandCards from './HandCards';
import PlayerRow from './PlayerRow';
import ArenaClickerPanel from './ArenaClickerPanel';
import ArenaReactionPanel from './ArenaReactionPanel';
import ArenaLoadoutPicker from './ArenaLoadoutPicker';
import {
  expireArenaReaction,
  heartbeatArenaPresence,
  listenArenaMatch,
  listenArenaPresence,
  makeArenaActionId,
  playArenaCard,
  remainingTurnSeconds,
  submitArenaReactionClick,
  timeoutArenaTurn,
  type ArenaMatchState,
  type ArenaPresenceState,
} from './match';
import { matchToArenaView } from './match/matchView';
import { createPlaceholderArenaView } from './placeholderView';
import { EMPTY_ARENA_VIEW, type ArenaViewModel } from './types';
import styles from '../table/gameTable.module.css';

interface ArenaScreenProps {
  onClose: () => void;
  view?: ArenaViewModel;
  matchId?: string | null;
  playerId?: string | null;
}

export default function ArenaScreen({ onClose, view, matchId, playerId }: ArenaScreenProps) {
  const [match, setMatch] = useState<ArenaMatchState | null>(null);
  const [presence, setPresence] = useState<Record<string, ArenaPresenceState>>({});
  const [serverNow, setServerNow] = useState(0);
  const [pendingModeCard, setPendingModeCard] = useState<string | null>(null);
  const timeoutLock = useRef(false);
  const reactionLock = useRef(false);

  useEffect(() => {
    if (view || !matchId) return undefined;
    return listenArenaMatch(matchId, setMatch);
  }, [matchId, view]);

  useEffect(() => {
    if (view || !matchId) return undefined;
    return listenArenaPresence(matchId, setPresence);
  }, [matchId, view]);

  useEffect(() => {
    if (view || !matchId) return undefined;
    return listenServerClock((now) => setServerNow(now));
  }, [matchId, view]);

  useEffect(() => {
    if (view || !matchId || !playerId) return undefined;
    void heartbeatArenaPresence({ matchId, playerId, online: true }).catch(() => {});
    const timer = window.setInterval(() => {
      void heartbeatArenaPresence({ matchId, playerId, online: true }).catch(() => {});
    }, 8_000);
    return () => {
      window.clearInterval(timer);
      void heartbeatArenaPresence({ matchId, playerId, online: false }).catch(() => {});
    };
  }, [matchId, playerId, view]);

  useEffect(() => {
    if (view || !match || !matchId || serverNow <= 0) return;
    if (match.phase !== 'combat') return;
    if (remainingTurnSeconds(match.turnExpiresAt, serverNow) > 0) return;
    if (timeoutLock.current) return;
    timeoutLock.current = true;
    void timeoutArenaTurn({ matchId })
      .catch(() => {})
      .finally(() => {
        window.setTimeout(() => {
          timeoutLock.current = false;
        }, 750);
      });
  }, [match, matchId, serverNow, view]);

  useEffect(() => {
    if (view || !match || !matchId || serverNow <= 0) return;
    const reaction = match.reaction;
    if (!reaction || reaction.status !== 'ACTIVE') return;
    if (remainingTurnSeconds(reaction.expiresAt, serverNow) > 0) return;
    if (reactionLock.current) return;
    reactionLock.current = true;
    void expireArenaReaction({ matchId })
      .catch(() => {})
      .finally(() => {
        window.setTimeout(() => {
          reactionLock.current = false;
        }, 750);
      });
  }, [match, matchId, serverNow, view]);

  const liveView = useMemo(() => {
    if (!match || !playerId) return null;
    return matchToArenaView({
      match,
      viewerPlayerId: playerId,
      serverNow,
      presence,
    });
  }, [match, playerId, presence, serverNow]);

  const ui = view ?? liveView ?? (matchId ? EMPTY_ARENA_VIEW : createPlaceholderArenaView());
  const needsLoadout = Boolean(match && playerId && match.phase === 'loadout' && !match.loadouts[playerId]);
  const waitingLoadout = Boolean(match && playerId && match.phase === 'loadout' && match.loadouts[playerId]);

  async function onPlayCard(cardId: string, mode?: 'earthquake' | 'tsunami' | 'fire' | 'ice') {
    if (!matchId || !playerId || match?.phase !== 'combat') return;
    if ((cardId === 'felaket' || cardId === 'qutb') && !mode) {
      setPendingModeCard(cardId);
      return;
    }
    setPendingModeCard(null);
    try {
      await playArenaCard({
        matchId,
        playerId,
        cardId,
        actionId: makeArenaActionId(),
        mode,
      });
    } catch {
      /* server REJECT */
    }
  }

  async function onReactionClick() {
    if (!matchId || !playerId || !ui.clickEvent.reactionId) return;
    try {
      await submitArenaReactionClick({
        matchId,
        playerId,
        reactionId: ui.clickEvent.reactionId,
        actionId: makeArenaActionId(),
      });
    } catch {
      /* server REJECT */
    }
  }

  const energyMax = ui.energy.max || (ui.gameMode === '1v1' ? 35 : 30);
  const energyCurrent = Math.max(0, Math.min(energyMax, ui.energy.current ?? 0));
  const energyPct = energyMax > 0 ? Math.round((energyCurrent / energyMax) * 100) : 0;
  const handPlay =
    match?.phase === 'combat' && playerId === match.currentTurn && match.players[playerId]?.role !== 'CLICKER'
      ? onPlayCard
      : undefined;

  return (
    <div className={styles.body}>
      <ArenaHeader view={ui} onClose={onClose} />
      <PlayerRow
        label="Rəqib ittifaqı"
        players={ui.players.away}
        currentPlayerId={ui.currentTurn?.playerId}
        gameMode={ui.gameMode}
      />
      <div className={styles.table}>
        <HandCards cards={ui.cards.hand} onPlay={handPlay} />
        <p className={styles.vs}>VS</p>
        <div className={styles.energyWrap}>
          <p className={styles.energyLabel}>{`⚡ ${energyCurrent}/${energyMax}`}</p>
          <div className={styles.energyTrack}>
            <div className={styles.energyFill} style={{ width: `${energyPct}%` }} />
          </div>
        </div>
        {ui.currentTurn?.label ? (
          <p className="px-2 text-center text-[10px] font-bold text-cyan-100/80">{ui.currentTurn.label}</p>
        ) : null}
        {ui.effectLabel ? (
          <p className="px-2 text-center text-[10px] font-semibold text-amber-100/90">{ui.effectLabel}</p>
        ) : null}
        {ui.doubleActive ? <p className="text-center text-[10px] font-bold text-cyan-200">2X aktivdir</p> : null}
      </div>
      <PlayerRow
        label="Öz ittifaqı"
        players={ui.players.home}
        currentPlayerId={ui.currentTurn?.playerId}
        gameMode={ui.gameMode}
      />
      <ClickCardNotification visible={ui.clickEvent.visible} cardTitle={ui.clickEvent.cardTitle} />
      {needsLoadout && matchId && playerId ? <ArenaLoadoutPicker matchId={matchId} playerId={playerId} /> : null}
      {waitingLoadout ? (
        <p className="px-3 text-center text-[11px] font-bold text-cyan-100/80">Kartların lock olundu. Döyüş gözlənilir.</p>
      ) : null}
      {ui.clickEvent.visible && matchId && playerId ? (
        <ArenaReactionPanel
          cardTitle={ui.clickEvent.cardTitle}
          modeLabel={ui.clickEvent.modeLabel ?? ''}
          remainingSeconds={ui.clickEvent.remainingSeconds ?? 0}
          currentClicks={ui.clickEvent.currentClicks ?? 0}
          requiredClicks={ui.clickEvent.requiredClicks ?? 0}
          canClick={Boolean(ui.clickEvent.canClick)}
          onClick={() => void onReactionClick()}
        />
      ) : null}
      {ui.clickEvent.visible && matchId && playerId && match?.players[playerId]?.role === 'CLICKER' ? (
        <ArenaClickerPanel
          matchId={matchId}
          playerId={playerId}
          cardTitle={ui.clickEvent.cardTitle}
          shareable={Boolean(ui.clickEvent.shareable)}
          chatText={ui.clickEvent.chatText}
        />
      ) : null}
      {pendingModeCard === 'felaket' ? (
        <div className="mx-2 flex gap-2">
          <button type="button" className="flex-1 rounded-md border border-white/20 py-1 text-[11px]" onClick={() => void onPlayCard('felaket', 'earthquake')}>
            Zəlzələ
          </button>
          <button type="button" className="flex-1 rounded-md border border-white/20 py-1 text-[11px]" onClick={() => void onPlayCard('felaket', 'tsunami')}>
            Tsunami
          </button>
        </div>
      ) : null}
      {pendingModeCard === 'qutb' ? (
        <div className="mx-2 flex gap-2">
          <button type="button" className="flex-1 rounded-md border border-white/20 py-1 text-[11px]" onClick={() => void onPlayCard('qutb', 'fire')}>
            Yanğın
          </button>
          <button type="button" className="flex-1 rounded-md border border-white/20 py-1 text-[11px]" onClick={() => void onPlayCard('qutb', 'ice')}>
            Buz
          </button>
        </div>
      ) : null}
    </div>
  );
}
