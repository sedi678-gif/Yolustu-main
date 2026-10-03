"use client";

import { ARENA_ROLE_LABEL, type ArenaSlotPlayer } from './types';
import { slotRoleAt } from './slotLayout';

interface PlayerSlotProps {
  player: ArenaSlotPlayer | null;
  index: number;
}

export default function PlayerSlot({ player, index }: PlayerSlotProps) {
  const role = player?.role ?? slotRoleAt(index);
  const empty = !player;

  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <div
        className={`relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border ${
          empty ? 'border-dashed border-white/25 bg-slate-950/40' : 'border-cyan-300/40 bg-slate-800'
        }`}
      >
        {player?.avatarUrl ? (
          <img src={player.avatarUrl} alt={player.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-[11px] font-black text-slate-300">{empty ? '—' : player.name.slice(0, 1)}</span>
        )}
        {!empty ? (
          <span
            className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border border-slate-950 ${
              player.online ? 'bg-emerald-400' : 'bg-slate-500'
            }`}
            aria-label={player.online ? 'Onlayn' : 'Oflayn'}
          />
        ) : null}
      </div>
      <p className="w-full truncate text-center text-[9px] font-bold leading-tight text-white">
        {empty ? 'Boş' : player.name}
      </p>
      <p className="w-full truncate text-center text-[8px] font-semibold uppercase tracking-wide text-cyan-200/80">
        {ARENA_ROLE_LABEL[role]}
      </p>
      <div className="h-7 w-5 rounded-sm border border-white/15 bg-[linear-gradient(145deg,#102033,#0b1220)]" aria-hidden />
    </div>
  );
}
