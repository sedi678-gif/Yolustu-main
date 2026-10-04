"use client";

import type { ArenaViewModel } from './types';

interface ArenaHeaderProps {
  view: ArenaViewModel;
  onClose: () => void;
}

export default function ArenaHeader({ view, onClose }: ArenaHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-2 pr-12">
      <p className="min-w-0 truncate text-[11px] font-bold text-white">
        <span className="text-rose-200">{view.awayAllianceName}</span>
        <span className="px-1 text-amber-200">VS</span>
        <span className="text-cyan-200">{view.homeAllianceName}</span>
      </p>
      <div className="flex shrink-0 items-center gap-1">
        <div className="rounded-md border border-white/15 bg-black/35 px-2 py-1 text-[11px] font-black tabular-nums text-amber-100">
          {view.timer.label}
        </div>
      </div>
      <button type="button" onClick={onClose} className="sr-only">
        Bağla
      </button>
    </header>
  );
}
