"use client";

import type { ReactNode } from 'react';

import AppLink from '@/app/components/AppLink';

interface BottomActionBarProps {
  name: string;
  avatarUrl?: string;
  coins?: string;
  score?: string;
}

function ActionChip({
  count,
  children,
  label,
}: {
  count: string;
  children: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm"
    >
      {children}
      <span className="absolute -right-0.5 -top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
        {count}
      </span>
    </button>
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
    <div className="grid h-[78px] grid-cols-[72px_1fr_auto] items-center gap-1 border-t border-slate-200 bg-white px-2 pb-[max(6px,env(safe-area-inset-bottom))] pt-1">
      <AppLink
        href="/alliance"
        className="text-center text-[30px] font-black leading-none text-red-600"
        aria-label="Çıx"
      >
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
        <span className="mt-0.5 max-w-[92px] truncate text-[11px] font-bold text-slate-700">{shortName}</span>
      </div>

      <div className="flex flex-col items-end gap-1 pr-1">
        <div className="flex items-center gap-2">
          <ActionChip count="1" label="Kart at">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2">
              <rect x="5" y="3" width="10" height="14" rx="1.5" />
              <path d="M15 7h4v14H9" />
            </svg>
          </ActionChip>
          <ActionChip count="3" label="Baxış">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2">
              <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </ActionChip>
          <ActionChip count="2" label="Böyüt">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </ActionChip>
        </div>
        <div className="flex items-center gap-4 pr-1 text-[11px] font-extrabold text-slate-400">
          <span>{coins}</span>
          <span>{score}</span>
        </div>
      </div>
    </div>
  );
}
