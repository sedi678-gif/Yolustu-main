"use client";

import ArenaCard from './ArenaCard';
import type { ArenaCardData } from './gameArenaTypes';

interface PlayedCardsAreaProps {
  cards: ArenaCardData[];
}

export default function PlayedCardsArea({ cards }: PlayedCardsAreaProps) {
  const pair = cards.slice(-2);

  if (pair.length === 0) {
    return <div className="h-40 w-full" aria-hidden />;
  }

  return (
    <div className="relative flex h-[190px] w-full items-center justify-center">
      {pair.map((card, index) => (
        <ArenaCard
          key={`${card.id}-${index}`}
          card={card}
          rotate={index === 0 ? -11 : 8}
          shiftX={index === 0 ? -18 : 22}
          lift={index === 0 ? 6 : -4}
          className={`h-[158px] w-[110px] ${index === 1 ? 'absolute z-10' : 'z-[1]'}`}
        />
      ))}
    </div>
  );
}
