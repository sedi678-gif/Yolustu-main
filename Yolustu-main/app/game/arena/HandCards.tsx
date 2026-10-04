"use client";

import CardPlaceholder from './CardPlaceholder';
import type { ArenaHandCardView } from './types';

interface HandCardsProps {
  cards: ArenaHandCardView[];
  onPlay?: (cardId: string) => void;
}

export default function HandCards({ cards, onPlay }: HandCardsProps) {
  const shown = cards.slice(0, 5);
  const empties = Math.max(0, 5 - shown.length);

  return (
    <section className="w-full min-w-0" aria-label="Kart əli">
      <div className="grid w-full grid-cols-5 gap-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
        {shown.map((card) => (
          <CardPlaceholder key={card.id} card={card} onPlay={onPlay} />
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
