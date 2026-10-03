"use client";

import ArenaCard from './ArenaCard';
import type { ArenaOpponent } from './gameArenaTypes';

interface PlayerSeatProps {
  player: ArenaOpponent;
  align?: 'left' | 'center' | 'right';
}

export default function PlayerSeat({ player, align = 'center' }: PlayerSeatProps) {
  const fanCount = Math.min(Math.max(player.cards, 3), 7);
  const stackCount = Math.min(player.cards, 5);

  return (
    <div
      className={`flex w-[104px] flex-col ${
        align === 'left' ? 'items-start' : align === 'right' ? 'items-end' : 'items-center'
      }`}
    >
      <div className="relative h-[88px] w-[96px]">
        <div className="absolute inset-x-0 bottom-0 flex h-[62px] items-end justify-center">
          {player.fan
            ? Array.from({ length: fanCount }, (_, i) => {
                const deg = (i - (fanCount - 1) / 2) * 12;
                return (
                  <ArenaCard
                    key={`${player.id}-fan-${i}`}
                    face="back"
                    rotate={deg}
                    shiftX={deg * 1.55}
                    className="absolute bottom-0 left-1/2 h-[58px] w-[40px] origin-bottom -translate-x-1/2"
                  />
                );
              })
            : Array.from({ length: stackCount }, (_, i) => (
                <ArenaCard
                  key={`${player.id}-stack-${i}`}
                  face="back"
                  rotate={-10 + i * 2}
                  shiftX={i * 2.5}
                  className="absolute bottom-0 left-1/2 h-[56px] w-[38px] -translate-x-1/2"
                />
              ))}
        </div>

        <div
          className="absolute left-1/2 top-0 z-10 h-12 w-12 -translate-x-1/2 overflow-hidden rounded-[10px] border-[3px] bg-slate-200 shadow-md"
          style={{ borderColor: player.frame }}
        >
          {player.avatarUrl ? (
            <img src={player.avatarUrl} alt={player.name} className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-xl font-black text-white"
              style={{ background: player.frame }}
            >
              {player.initial ?? player.name.slice(0, 1)}
            </div>
          )}
        </div>
      </div>
      <p className="mt-0.5 w-full truncate text-center text-[11px] font-bold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        {player.name}
      </p>
    </div>
  );
}
