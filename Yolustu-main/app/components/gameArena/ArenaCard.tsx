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
  const sharedClass = `relative overflow-hidden rounded-lg border border-black/25 bg-white shadow-md ${className}`;
  const sharedStyle = {
    transform: `translate(${shiftX}px, ${-lift}px) rotate(${rotate}deg)`,
  };

  const inner =
    face === 'back' || !card ? (
      <div className="h-full w-full bg-[#15803d] p-[2px]">
        <div
          className="h-full w-full rounded-[4px]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #166534 0 5px, #22c55e 5px 10px), repeating-linear-gradient(-45deg, #14532d 0 6px, #16a34a 6px 12px)',
            backgroundBlendMode: 'multiply',
          }}
        />
      </div>
    ) : card.image ? (
      <img src={card.image} alt={card.title} className="h-full w-full object-cover" draggable={false} />
    ) : (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1" style={{ background: card.accent }}>
        <span className="text-2xl">{card.emoji}</span>
        <span className="px-1 text-center text-[9px] font-extrabold leading-tight text-white">{card.title}</span>
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
