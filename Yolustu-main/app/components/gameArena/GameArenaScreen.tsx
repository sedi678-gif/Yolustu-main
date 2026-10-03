"use client";

import { useEffect, useMemo, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { getLocalProfileDisplayName } from '@/app/lib/userId';
import BottomActionBar from './BottomActionBar';
import CardHand from './CardHand';
import PlayedCardsArea from './PlayedCardsArea';
import PlayerSeat from './PlayerSeat';
import { DEMO_OPPONENTS, catalogArenaCard, leaderSelectedHand, type ArenaCardData } from './gameArenaTypes';

function StatusIcons() {
  return (
    <div className="flex items-center gap-3 rounded-full bg-black/15 px-3 py-1.5 text-white/90">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
        <path d="M7 7h10v4M17 17H7v-4" />
        <path d="M17 7l3 2-3 2M7 17l-3-2 3-2" />
      </svg>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
        <path d="M8 12h8" />
        <path d="M8 12l3-3M16 12l-3 3" />
      </svg>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
        <path d="M8 14c-2 0-4-1.4-4-3.2C4 8.6 6.2 7 8.5 8.2 9.4 6 11 5 12.8 5 15 5 17 6.7 17 9c2 .2 4 1.6 4 3.8 0 2-1.8 3.2-4 3.2H8z" />
      </svg>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
        <rect x="5" y="4" width="9" height="13" rx="1.4" />
        <path d="M14 8h4v12H8" />
      </svg>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M8 5v14l11-7z" />
      </svg>
    </div>
  );
}

export default function GameArenaScreen() {
  const { playerProfile } = useUser();
  const [playerName, setPlayerName] = useState('Sedi N...');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [hand, setHand] = useState<ArenaCardData[]>(() => leaderSelectedHand());
  const [played, setPlayed] = useState<ArenaCardData[]>(() => {
    const attack = catalogArenaCard('qutb');
    const beat = catalogArenaCard('felaket');
    return [attack, beat].filter(Boolean) as ArenaCardData[];
  });
  const opponents = useMemo(() => DEMO_OPPONENTS, []);

  useEffect(() => {
    const name = playerProfile?.displayName || getLocalProfileDisplayName();
    if (name && name !== 'İstifadəçi') setPlayerName(name);
    try {
      const raw = localStorage.getItem('app_current_user_v6');
      if (!raw) return;
      const parsed = JSON.parse(raw) as { avatar?: string };
      if (parsed.avatar) setAvatarUrl(parsed.avatar);
    } catch {
      /* ignore */
    }
  }, [playerProfile?.displayName]);

  const playCard = (cardId: string) => {
    const card = hand.find((item) => item.id === cardId);
    if (!card) return;
    setHand((prev) => prev.filter((item) => item.id !== cardId));
    setPlayed((prev) => [...prev.slice(-1), card]);
  };

  return (
    <div className="relative min-h-dvh w-full overflow-hidden text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundColor: '#3b678c',
          backgroundImage: `
            radial-gradient(ellipse 90% 55% at 50% -10%, rgba(255,255,255,0.16), transparent 58%),
            radial-gradient(ellipse 70% 40% at 50% 100%, rgba(0,0,0,0.22), transparent 60%),
            repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 14px),
            repeating-linear-gradient(90deg, rgba(0,20,40,0.07) 0 1px, transparent 1px 16px)
          `,
        }}
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col">
        <header className="relative z-10 flex items-start justify-between px-3 pt-[max(8px,env(safe-area-inset-top))]">
          <div className="w-14" />
          <StatusIcons />
          <div className="flex items-center gap-1 pt-0.5 text-[20px] font-black drop-shadow">
            <span>100</span>
            <span className="text-[18px] text-emerald-300" aria-hidden>
              💵
            </span>
          </div>
        </header>

        <section className="relative z-10 mt-1 h-[150px]">
          <div className="absolute left-[2%] top-[34px]">
            <PlayerSeat player={opponents[0]} align="left" />
          </div>
          <div className="absolute left-1/2 top-0 -translate-x-1/2">
            <PlayerSeat player={opponents[1]} align="center" />
          </div>
          <div className="absolute right-[2%] top-[34px]">
            <PlayerSeat player={opponents[2]} align="right" />
          </div>
        </section>

        <main className="relative z-10 flex flex-1 items-center">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[22px] font-black text-white/80 drop-shadow">
            12
          </span>
          <PlayedCardsArea cards={played} />
        </main>

        <div className="relative z-20 -mb-5">
          <CardHand cards={hand} onPlay={playCard} />
        </div>

        <div className="relative z-10">
          <BottomActionBar name={playerName} avatarUrl={avatarUrl} />
        </div>
      </div>
    </div>
  );
}
