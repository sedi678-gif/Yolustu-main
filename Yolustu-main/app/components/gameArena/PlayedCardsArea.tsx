"use client";

import ArenaCard from './ArenaCard';
import type { ArenaCardData } from './gameArenaTypes';

interface PlayedCardsAreaProps {
  cards: ArenaCardData[];
}

export default function PlayedCardsArea({ cards }: PlayedCardsAreaProps) {
  if (cards.length === 0) {
    return <div className="h-36 w-full" aria-hidden />;
  }

  return (
    <div className="relative flex h-40 w-full items-center justify-center">
      {cards.slice(0, 2).map((card, index) => (
        <ArenaCard
          key={`${card.id}-${index}`}
          card={card}
          className={`h-[148px] w-[104px] ${index === 0 ? '-rotate-[8deg] -translate-x-3' : 'absolute rotate-[7deg] translate-x-4 translate-y-2'}`}
        />
      ))}
    </div>
  );
}
