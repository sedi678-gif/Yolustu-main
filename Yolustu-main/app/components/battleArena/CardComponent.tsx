"use client";

import { MODEL_CARD_DEFS, modelCardImageUrl } from '@/app/components/alliance/modelCardsCatalog';

export interface CardComponentProps {
  cardId?: string;
  face?: 'front' | 'back';
  size?: 'sm' | 'md' | 'lg';
  rotate?: number;
  revealed?: boolean;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}

const SIZE = {
  sm: 'h-[72px] w-[50px]',
  md: 'h-[118px] w-[82px]',
  lg: 'h-[156px] w-[108px]',
} as const;

export default function CardComponent({
  cardId,
  face = 'front',
  size = 'md',
  rotate = 0,
  revealed = true,
  selected = false,
  disabled = false,
  className = '',
  onClick,
}: CardComponentProps) {
  const def = MODEL_CARD_DEFS.find((item) => item.id === cardId);
  const showFront = face === 'front' && revealed && Boolean(def);
  const image = def ? modelCardImageUrl(def) : '';

  const body = (
    <div
      className={`${SIZE[size]} relative overflow-hidden rounded-lg border shadow-md transition ${
        selected ? 'border-cyan-300 ring-2 ring-cyan-400/70' : 'border-black/40'
      } ${disabled ? 'opacity-50' : ''} ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {showFront ? (
        image ? (
          <img src={image} alt={def?.title ?? 'Kart'} className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-slate-800 px-1">
            <span className="text-xl">{def?.emoji}</span>
            <span className="text-center text-[9px] font-extrabold leading-tight text-white">{def?.title}</span>
          </div>
        )
      ) : (
        <div className="h-full w-full bg-[#0b1220] p-[3px]">
          <div className="flex h-full w-full items-center justify-center rounded-md border border-cyan-500/30 bg-[linear-gradient(145deg,#102033,#1e293b_45%,#0f172a)]">
            <span className="text-[10px] font-black tracking-[0.18em] text-cyan-200/80">YOL</span>
          </div>
        </div>
      )}
    </div>
  );

  if (!onClick) return body;

  return (
    <button type="button" onClick={onClick} disabled={disabled} className="origin-bottom" aria-label={def?.title ?? 'Kart'}>
      {body}
    </button>
  );
}
