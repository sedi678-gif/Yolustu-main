"use client";

import { emitAllianceHubEvent } from '@/app/components/alliance/allianceSocket';
import { shareArenaClickEvent } from './match/matchService';

export default function ArenaClickerPanel({
  matchId,
  playerId,
  cardTitle,
  shareable,
}: {
  matchId: string;
  playerId: string;
  cardTitle: string;
  shareable: boolean;
}) {
  return (
    <section className="mx-2 rounded-lg border border-amber-300/30 bg-amber-500/10 p-2">
      <p className="text-[11px] font-black text-amber-100">Klik event: {cardTitle}</p>
      <p className="text-[10px] text-amber-50/80">Kliker kart oynamır — yalnız event görür.</p>
      <button
        type="button"
        disabled={!shareable}
        className="mt-2 w-full rounded-md border border-amber-200/40 bg-black/30 py-1.5 text-[11px] font-bold text-white disabled:opacity-40"
        onClick={() => {
          emitAllianceHubEvent('chat_message', { matchId, playerId, text: `Klik kartı: ${cardTitle}` });
          void shareArenaClickEvent({ matchId, playerId }).catch(() => {});
        }}
      >
        İttifaq çatına göndər
      </button>
    </section>
  );
}
