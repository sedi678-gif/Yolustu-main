"use client";

import type { GameTableProps } from './types';

export default function GameTable({ open, onClose }: GameTableProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[280] flex items-center justify-center bg-black/70 p-3" role="dialog" aria-modal="true" aria-label="Oyun masası">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-[max(12px,env(safe-area-inset-top))] z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-slate-950/80 text-lg text-white"
        aria-label="Bağla"
      >
        ✕
      </button>

      <div className="relative h-[min(78dvh,560px)] w-full max-w-[430px] rounded-[28px] p-[14px] shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
        <div className="pointer-events-none absolute inset-0 rounded-[28px] border-[10px] border-[#8b6914] bg-[linear-gradient(145deg,#c4a35a,#8b6914_40%,#5c4308)]" />
        <div className="pointer-events-none absolute inset-[10px] rounded-[18px] border border-[#d4af37]/50" />
        <div
          className="relative h-full w-full overflow-hidden rounded-[16px]"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(56,189,248,0.12), transparent 55%), linear-gradient(180deg, #12324a 0%, #0b1c2c 100%)',
          }}
        />
      </div>
    </div>
  );
}
