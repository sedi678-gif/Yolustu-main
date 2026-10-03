"use client";

import type { ArenaHandCardView } from './types';

interface CardPlaceholderProps {
  card: ArenaHandCardView;
  onPlay?: (cardId: string) => void;
}

export default function CardPlaceholder({ card, onPlay }: CardPlaceholderProps) {
  const disabled = Boolean(card.disabled);

  return (
    <article
      className={`flex h-[min(118px,28vw)] min-h-[96px] w-full min-w-0 flex-col overflow-hidden rounded-lg border shadow-md ${
        disabled ? 'border-white/10 opacity-40' : card.selected ? 'border-cyan-300 ring-2 ring-cyan-400/60' : 'border-black/40'
      }`}
    >
      <button
        type="button"
        disabled={disabled || !onPlay}
        onClick={() => onPlay?.(card.id)}
        className="flex h-full min-h-0 w-full flex-col text-left disabled:cursor-not-allowed"
      >
        <div className="relative min-h-0 flex-1 bg-slate-800">
          {card.image ? (
            <img src={card.image} alt={card.title} className="h-full w-full object-cover" draggable={false} />
          ) : (
            <div className="flex h-full items-center justify-center text-xl">{card.emoji ?? '🃏'}</div>
          )}
        </div>
        <div className="bg-slate-950 px-1 py-1">
          <p className="truncate text-[9px] font-extrabold leading-tight text-white">{card.title}</p>
          <p className="text-[8px] font-bold text-amber-200">{card.energyCostLabel}</p>
          <p className="text-[8px] font-bold text-slate-400">{card.remainingUsesLabel}</p>
        </div>
      </button>
    </article>
  );
}
