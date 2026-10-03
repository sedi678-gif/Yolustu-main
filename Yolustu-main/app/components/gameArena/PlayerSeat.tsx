"use client";

import ArenaCard from './ArenaCard';
import type { ArenaOpponent } from './gameArenaTypes';

interface PlayerSeatProps {
  player: ArenaOpponent;
  align?: 'left' | 'center' | 'right';
}

export default function PlayerSeat({ player, align = 'center' }: PlayerSeatProps) {
  const count = Math.min(player.cards, 8);
  const offsets = player.fan
    ? Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * 11)
    : Array.from({ length: Math.min(count, 4) }, (_, i) => i * 3);

  return (
    <div className={`flex w-[30%] max-w-[118px] flex-col ${align === 'left' ? 'items-start' : align === 'right' ? 'items-end' : 'items-center'}`}>
      <div className="relative h-[72px] w-[86px]">
        <div className="absolute inset-x-0 bottom-0 flex h-[54px] items-end justify-center">
          {player.fan
            ? offsets.map((deg, i) => (
                <ArenaCard
                  key={`${player.id}-fan-${i}`}
                  face="back"
                  rotate={deg}
                  shiftX={deg * 1.6}
                  className="absolute bottom-0 left-1/2 h-[52px] w-[36px] origin-bottom -ml-[18px]"
                />
              ))
            : offsets.map((shift, i) => (
                <ArenaCard
                  key={`${player.id}-stack-${i}`}
                  face="back"
                  className="absolute bottom-0 left-1/2 h-[50px] w-[34px] -ml-[17px]"
                  rotate={-8 + i}
                  shiftX={shift}
                />
              ))}
        </div>
        <div
          className="absolute left-1/2 top-0 z-10 h-11 w-11 -translate-x-1/2 overflow-hidden rounded-xl border-[3px] bg-slate-200 shadow-md"
          style={{ borderColor: player.frame }}
        >
          {player.avatarUrl ? (
            <img src={player.avatarUrl} alt={player.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-black text-white" style={{ background: player.frame }}>
              {player.initial ?? player.name.slice(0, 1)}
            </div>
          )}
        </div>
      </div>
      <p className="mt-0.5 max-w-full truncate text-center text-[11px] font-bold leading-tight text-white drop-shadow">
        {player.name}
      </p>
    </div>
  );
}
