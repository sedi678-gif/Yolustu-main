"use client";

export default function ArenaReactionPanel({
  cardTitle,
  modeLabel,
  remainingSeconds,
  currentClicks,
  requiredClicks,
  canClick,
  onClick,
}: {
  cardTitle: string;
  modeLabel: string;
  remainingSeconds: number;
  currentClicks: number;
  requiredClicks: number;
  canClick: boolean;
  onClick: () => void;
}) {
  const pct = requiredClicks > 0 ? Math.min(100, Math.round((currentClicks / requiredClicks) * 100)) : 0;
  return (
    <section className="mx-2 rounded-lg border border-cyan-300/30 bg-cyan-500/10 p-2">
      <p className="text-[11px] font-black text-cyan-50">{cardTitle}</p>
      <p className="text-[10px] text-cyan-100/80">{modeLabel}</p>
      <p className="mt-1 text-[11px] font-bold text-white">
        {currentClicks} / {requiredClicks} · {remainingSeconds}s
      </p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/40">
        <div className="h-full bg-cyan-300" style={{ width: `${pct}%` }} />
      </div>
      <button
        type="button"
        disabled={!canClick}
        className="mt-2 w-full rounded-md border border-cyan-200/40 bg-black/30 py-1.5 text-[11px] font-bold text-white disabled:opacity-40"
        onClick={onClick}
      >
        Klik
      </button>
    </section>
  );
}
