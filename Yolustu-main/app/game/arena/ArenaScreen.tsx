"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { listenServerClock } from '@/app/lib/battlePlay/battleServerClock';
import ArenaHeader from './ArenaHeader';
import BattleTable from './BattleTable';
import ClickCardNotification from './ClickCardNotification';
import HandCards from './HandCards';
import PlayerRow from './PlayerRow';
import {
  heartbeatArenaPresence,
  listenArenaMatch,
  listenArenaPresence,
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
          </BattleTable>
          <PlayerRow
            label="Öz tərəfi"
            players={ui.players.home}
            currentPlayerId={ui.currentTurn?.playerId}
          />
          <ClickCardNotification visible={ui.clickEvent.visible} cardTitle={ui.clickEvent.cardTitle} />
          <HandCards cards={ui.cards.hand} />
        </div>
      </div>
    </div>
  );
}
