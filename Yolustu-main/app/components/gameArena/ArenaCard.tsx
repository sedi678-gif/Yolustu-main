"use client";

import type { ArenaCardData } from './gameArenaTypes';

interface ArenaCardProps {
  card?: ArenaCardData;
  face?: 'front' | 'back';
  className?: string;
  rotate?: number;
  lift?: number;
  shiftX?: number;
  onClick?: () => void;
}

export default function ArenaCard({
  card,
  face = 'front',
  className = '',
  rotate = 0,
  lift = 0,
  shiftX = 0,
  onClick,
}: ArenaCardProps) {
  const sharedClass = `relative overflow-hidden rounded-lg shadow-md border border-black/20 bg-white ${className}`;
  const sharedStyle = {
    transform: `translate(${shiftX}px, ${lift}px) rotate(${rotate}deg)`,
  };

  const inner =
    face === 'back' || !card ? (
      <div
        className="h-full w-full"
        style={{
          background:
            'repeating-linear-gradient(45deg, #166534 0 6px, #22c55e 6px 12px), repeating-linear-gradient(-45deg, #14532d 0 8px, #16a34a 8px 16px)',
          backgroundBlendMode: 'multiply',
        }}
      >
        <div className="absolute inset-[3px] rounded-md border border-white/40" />
      </div>
    ) : card.image ? (
      <img src={card.image} alt={card.title} className="h-full w-full object-cover" draggable={false} />
    ) : (
      <div className="flex h-full w-full items-center justify-center text-2xl" style={{ background: card.accent }}>
        {card.emoji}
      </div>
    );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={sharedClass} style={sharedStyle} aria-label={card?.title}>
        {inner}
      </button>
    );
  }

  return (
    <div className={sharedClass} style={sharedStyle} aria-label={face === 'back' ? 'Kart destəsi' : card?.title}>
      {inner}
    </div>
  );
}
