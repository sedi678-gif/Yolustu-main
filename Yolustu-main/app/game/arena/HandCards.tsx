"use client";

import CardPlaceholder from './CardPlaceholder';
import type { ArenaHandCardView } from './types';

interface HandCardsProps {
  cards: ArenaHandCardView[];
}

export default function HandCards({ cards }: HandCardsProps) {
  const shown = cards.slice(0, 5);
  const empties = Math.max(0, 5 - shown.length);

  return (
    <section className="w-full min-w-0 px-2 pb-[max(8px,env(safe-area-inset-bottom))]" aria-label="Kart əli">
      <div className="grid grid-cols-5 gap-1">
        {shown.map((card) => (
          <CardPlaceholder key={card.id} card={card} />
        ))}
        {Array.from({ length: empties }, (_, index) => (
          <div
            key={`empty-hand-${index}`}
            className="h-[min(118px,28vw)] min-h-[96px] w-full rounded-lg border border-dashed border-white/20 bg-slate-950/30"
          />
        ))}
      </div>
    </section>
  );
}
