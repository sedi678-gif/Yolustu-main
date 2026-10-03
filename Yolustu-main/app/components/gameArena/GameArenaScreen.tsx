"use client";

import { useEffect, useMemo, useState } from 'react';
import { getLocalProfileDisplayName } from '@/app/lib/userId';
import BottomActionBar from './BottomActionBar';
import CardHand from './CardHand';
import PlayedCardsArea from './PlayedCardsArea';
import PlayerSeat from './PlayerSeat';
import { DEMO_OPPONENTS, catalogArenaCard, leaderSelectedHand, type ArenaCardData } from './gameArenaTypes';

const STATUS_ICONS = ['⇄', '🤝', '▣', '▶'];

export default function GameArenaScreen() {
  const [playerName, setPlayerName] = useState('Sedi N...');
  const [hand, setHand] = useState<ArenaCardData[]>(() => leaderSelectedHand());
  const [played, setPlayed] = useState<ArenaCardData[]>(() => {
    const seven = catalogArenaCard('qutb');
    const eight = catalogArenaCard('felaket');
    return [seven, eight].filter(Boolean) as ArenaCardData[];
  });
  const [balance] = useState(100);
  const opponents = useMemo(() => DEMO_OPPONENTS, []);

  useEffect(() => {
    const name = getLocalProfileDisplayName();
    if (name && name !== 'İstifadəçi') setPlayerName(name);
  }, []);

  const playCard = (cardId: string) => {
    const card = hand.find((item) => item.id === cardId);
    if (!card) return;
    setHand((prev) => prev.filter((item) => item.id !== cardId));
    setPlayed((prev) => [...prev.slice(-1), card]);
  };

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col overflow-hidden text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundColor: '#3b678c',
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.12), transparent 55%),
            repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 18px),
            repeating-linear-gradient(90deg, rgba(0,0,0,0.06) 0 1px, transparent 1px 18px)
          `,
        }}
      />

      <header className="relative z-10 flex items-start justify-between px-3 pt-[max(10px,env(safe-area-inset-top))]">
        <div className="w-16" />
        <div className="flex items-center gap-3 rounded-full bg-black/20 px-3 py-1.5 text-lg">
          {STATUS_ICONS.map((icon) => (
            <span key={icon} className="opacity-90 drop-shadow">
              {icon}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 pt-1 text-[18px] font-black drop-shadow">
          <span>{balance}</span>
          <span className="text-[20px]" aria-hidden>
            💵
          </span>
        </div>
      </header>

      <section className="relative z-10 mt-2 flex items-end justify-between px-3">
        <PlayerSeat player={opponents[0]} align="left" />
        <PlayerSeat player={opponents[1]} align="center" />
        <PlayerSeat player={opponents[2]} align="right" />
      </section>

      <main className="relative z-10 flex flex-1 items-center">
        <PlayedCardsArea cards={played} />
      </main>

      <div className="relative z-10 pb-1">
        <CardHand cards={hand} onPlay={playCard} />
      </div>

      <div className="relative z-20">
        <BottomActionBar name={playerName} />
      </div>
    </div>
  );
}
