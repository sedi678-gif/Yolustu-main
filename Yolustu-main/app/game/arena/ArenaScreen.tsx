"use client";

import ArenaHeader from './ArenaHeader';
import BattleTable from './BattleTable';
import ClickCardNotification from './ClickCardNotification';
import HandCards from './HandCards';
import PlayerRow from './PlayerRow';
import { createPlaceholderArenaView } from './placeholderView';
import type { ArenaViewModel } from './types';

interface ArenaScreenProps {
  onClose: () => void;
  view?: ArenaViewModel;
}

export default function ArenaScreen({ onClose, view }: ArenaScreenProps) {
  const ui = view ?? createPlaceholderArenaView();

  return (
    <div className="flex h-dvh min-h-0 w-full max-w-[430px] flex-col overflow-hidden bg-[#070b14] text-white">
      <ArenaHeader view={ui} onClose={onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex min-h-full flex-col gap-2 py-2">
          <PlayerRow label="Rəqib tərəfi" players={ui.players.away} />
          <BattleTable>
            <p className="px-4 text-center text-[11px] font-bold text-cyan-100/70">Oyun masası</p>
          </BattleTable>
          <PlayerRow label="Öz tərəfi" players={ui.players.home} />
          <ClickCardNotification visible={ui.clickEvent.visible} cardTitle={ui.clickEvent.cardTitle} />
          <HandCards cards={ui.cards.hand} />
        </div>
      </div>
    </div>
  );
}
