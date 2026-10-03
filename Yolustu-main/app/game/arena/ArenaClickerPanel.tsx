"use client";

import { shareArenaClickEvent } from './match/matchService';

export default function ArenaClickerPanel({
  matchId,
  playerId,
  cardTitle,
  shareable,
  chatText,
}: {
  matchId: string;
  playerId: string;
  cardTitle: string;
  shareable: boolean;
  chatText?: string;
}) {
  return (
    <section className="mx-2 rounded-lg border border-amber-300/30 bg-amber-500/10 p-2">
      <p className="text-[11px] font-black text-amber-100">Klik event: {cardTitle}</p>
      <p className="text-[10px] text-amber-50/80">Kliker kart oynamır — yalnız event görür və klikdə iştirak edə bilər.</p>
      {chatText ? <p className="mt-1 text-[10px] text-amber-50/90">{chatText}</p> : null}
      <button
        type="button"
        disabled={!shareable}
        className="mt-2 w-full rounded-md border border-amber-200/40 bg-black/30 py-1.5 text-[11px] font-bold text-white disabled:opacity-40"
        onClick={() => {
          void shareArenaClickEvent({ matchId, playerId }).catch(() => {});
        }}
      >
        İttifaq çatına göndər
      </button>
    </section>
  );
}
