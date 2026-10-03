"use client";

import ArenaCard from './ArenaCard';
import type { ArenaCardData } from './gameArenaTypes';

interface CardHandProps {
  cards: ArenaCardData[];
  onPlay?: (cardId: string) => void;
}

export default function CardHand({ cards, onPlay }: CardHandProps) {
  const n = cards.length || 1;

  return (
    <div className="relative mx-auto flex h-[168px] w-full max-w-[430px] items-end justify-center px-1">
      {cards.map((card, index) => {
        const mid = (n - 1) / 2;
        const rotate = (index - mid) * 8;
        const lift = Math.abs(index - mid) * 6;
        return (
          <ArenaCard
            key={card.id}
            card={card}
            rotate={rotate}
            onClick={onPlay ? () => onPlay(card.id) : undefined}
            lift={lift}
            className="h-[150px] w-[102px] shrink-0 origin-bottom -ml-7 first:ml-0 shadow-lg"
          />
        );
      })}
    </div>
  );
}
