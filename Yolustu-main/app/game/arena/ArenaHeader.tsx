"use client";

import type { ArenaViewModel } from './types';

interface ArenaHeaderProps {
  view: ArenaViewModel;
  onClose: () => void;
}

export default function ArenaHeader({ view, onClose }: ArenaHeaderProps) {
  return (
    <header className="flex shrink-0 items-start justify-between gap-2 px-3 pt-[max(8px,env(safe-area-inset-top))]">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-bold text-rose-200">{view.awayAllianceName}</p>
        <p className="truncate text-[10px] font-bold text-cyan-200">{view.homeAllianceName}</p>
        <p className="mt-0.5 text-[11px] font-black uppercase tracking-wider text-white">{view.matchState.statusLabel}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="rounded-md border border-white/15 bg-black/35 px-2 py-1 text-[11px] font-black tabular-nums text-amber-100">
          {view.timer.label}
        </div>
        <div className="rounded-md border border-cyan-400/25 bg-black/35 px-2 py-1 text-[11px] font-black tabular-nums text-cyan-100">
          {view.energy.label}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-slate-950/80 text-white"
        aria-label="Bağla"
      >
        ✕
      </button>
    </header>
  );
}
