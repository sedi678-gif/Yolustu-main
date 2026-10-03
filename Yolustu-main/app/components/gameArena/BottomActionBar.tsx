"use client";

import AppLink from '@/app/components/AppLink';

interface BottomActionBarProps {
  name: string;
  avatarUrl?: string;
  coins?: string;
  score?: string;
}

function Chip({ icon, count }: { icon: string; count: string }) {
  return (
    <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/95 shadow">
      <span className="text-lg" aria-hidden>
        {icon}
      </span>
      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
        {count}
      </span>
    </div>
  );
}

export default function BottomActionBar({
  name,
  avatarUrl,
  coins = '0',
  score = '1.24K',
}: BottomActionBarProps) {
  const shortName = name.length > 8 ? `${name.slice(0, 6)}...` : name;

  return (
    <div className="grid h-[76px] grid-cols-[72px_1fr_auto] items-center gap-2 border-t border-white/20 bg-white px-2 pb-[env(safe-area-inset-bottom,0px)] pt-1">
      <AppLink href="/alliance" className="text-center text-[28px] font-black leading-none text-red-600" aria-label="Çıx">
        Bat
      </AppLink>

      <div className="flex flex-col items-center">
        <div className="relative h-12 w-12 overflow-hidden rounded-full border-[3px] border-red-500 bg-slate-300 shadow">
          {avatarUrl ? (
            <img src={avatarUrl} alt={shortName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-500 text-lg font-black text-white">
              {name.slice(0, 1)}
            </div>
          )}
        </div>
        <span className="mt-0.5 max-w-[88px] truncate text-[11px] font-bold text-slate-700">{shortName}</span>
      </div>

      <div className="flex flex-col items-end gap-1 pr-1">
        <div className="flex items-center gap-2">
          <Chip icon="🃏" count="1" />
          <Chip icon="👁" count="3" />
          <Chip icon="🔍" count="2" />
        </div>
        <div className="flex items-center gap-3 pr-1 text-[11px] font-extrabold text-slate-500">
          <span>{coins}</span>
          <span>{score}</span>
        </div>
      </div>
    </div>
  );
}
