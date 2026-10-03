"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { listenServerClock } from '@/app/lib/battlePlay/battleServerClock';
import ArenaHeader from './ArenaHeader';
import BattleTable from './BattleTable';
import ClickCardNotification from './ClickCardNotification';
import HandCards from './HandCards';
import PlayerRow from './PlayerRow';
import ArenaClickerPanel from './ArenaClickerPanel';
import ArenaLoadoutPicker from './ArenaLoadoutPicker';
import {
  heartbeatArenaPresence,
  listenArenaMatch,
  listenArenaPresence,
  makeArenaActionId,
  playArenaCard,
  remainingTurnSeconds,
  timeoutArenaTurn,
  type ArenaMatchState,
  type ArenaPresenceState,
} from './match';
import { matchToArenaView } from './match/matchView';
import { createPlaceholderArenaView } from './placeholderView';
import { EMPTY_ARENA_VIEW, type ArenaViewModel } from './types';

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

  return (
    <div className="flex h-dvh min-h-0 w-full max-w-[430px] flex-col overflow-hidden bg-[#070b14] text-white">
      <ArenaHeader view={ui} onClose={onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex min-h-full flex-col gap-2 py-2">
          <PlayerRow
            label="Rəqib tərəfi"
            players={ui.players.away}
            currentPlayerId={ui.currentTurn?.playerId}
          />
          <BattleTable>
            <p className="px-4 text-center text-[11px] font-bold text-cyan-100/70">
              {ui.currentTurn?.label ?? 'Oyun masası'}
            </p>
            {ui.effectLabel ? (
              <p className="px-4 text-center text-[10px] font-semibold text-amber-100/90">{ui.effectLabel}</p>
            ) : null}
            {ui.doubleActive ? <p className="text-center text-[10px] font-bold text-cyan-200">2X aktivdir</p> : null}
          </BattleTable>
          <PlayerRow
            label="Öz tərəfi"
            players={ui.players.home}
            currentPlayerId={ui.currentTurn?.playerId}
          />
          <ClickCardNotification visible={ui.clickEvent.visible} cardTitle={ui.clickEvent.cardTitle} />
          {needsLoadout && matchId && playerId ? <ArenaLoadoutPicker matchId={matchId} playerId={playerId} /> : null}
          {waitingLoadout ? (
            <p className="px-3 text-center text-[11px] font-bold text-cyan-100/80">Kartların lock olundu. Döyüş gözlənilir.</p>
          ) : null}
          {ui.clickEvent.visible && matchId && playerId ? (
            <ArenaClickerPanel
              matchId={matchId}
              playerId={playerId}
              cardTitle={ui.clickEvent.cardTitle}
              shareable={Boolean(ui.clickEvent.shareable)}
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
          <HandCards
            cards={ui.cards.hand}
            onPlay={match?.phase === 'combat' && playerId === match.currentTurn ? onPlayCard : undefined}
          />
        </div>
      </div>
    </div>
  );
}
