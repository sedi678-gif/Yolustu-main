"use client";

import ArenaCard from './ArenaCard';
import type { ArenaCardData } from './gameArenaTypes';

interface CardHandProps {
  cards: ArenaCardData[];
  onPlay?: (cardId: string) => void;
}

const ROTATES = [-16, -8, -1, 7, 14];
const LIFTS = [10, 4, 0, 5, 12];
const SHIFTS = [-8, -2, 0, 4, 10];

export default function CardHand({ cards, onPlay }: CardHandProps) {
  return (
    <div className="relative mx-auto flex h-[176px] w-full items-end justify-center px-2">
      {cards.map((card, index) => (
        <ArenaCard
          key={card.id}
          card={card}
          rotate={ROTATES[index] ?? (index - 2) * 8}
          lift={LIFTS[index] ?? 0}
          shiftX={SHIFTS[index] ?? 0}
          onClick={onPlay ? () => onPlay(card.id) : undefined}
          className="z-[1] h-[158px] w-[108px] shrink-0 origin-bottom -ml-8 first:ml-0 shadow-lg hover:z-20"
        />
      ))}
    </div>
  );
}
