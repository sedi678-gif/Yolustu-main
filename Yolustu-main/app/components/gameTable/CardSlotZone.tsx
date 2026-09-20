"use client";

import type { TableCardInstance, TableSide } from './gameTableTypes';
import TableCard from './TableCard';
import styles from './gameTable.module.css';

interface CardSlotZoneProps {
  side: TableSide;
  slots: Array<TableCardInstance | null>;
  revealed: boolean;
  dropEnabled: boolean;
  hotSlot: number | null;
  onDropSlot: (index: number) => void;
  onHoverSlot: (index: number | null) => void;
}

export default function CardSlotZone({
  side,
  slots,
  revealed,
  dropEnabled,
  hotSlot,
  onDropSlot,
  onHoverSlot,
}: CardSlotZoneProps) {
  const isAttacker = side === 'attacker';

  return (
    <section aria-label={isAttacker ? 'Hücum kart zonası' : 'Müdafiə kart zonası'}>
      <div className={styles.zoneLabel} style={{ color: isAttacker ? '#fb7185' : '#67e8f9' }}>
        <span>{isAttacker ? '⚔ Hücum edən ittifaq' : '🛡 Müdafiə olunan ittifaq'}</span>
        <span className="tracking-normal text-slate-400">
          {slots.filter(Boolean).length}/5 kart
        </span>
      </div>
      <div className={styles.slots}>
        {slots.map((card, index) => (
          <div
            key={`${side}-${index}`}
            className={`${styles.slot} ${isAttacker ? styles.slotAttacker : styles.slotDefender} ${
              hotSlot === index ? styles.slotHot : ''
            }`}
            onDragOver={(e) => {
              if (!dropEnabled || card) return;
              e.preventDefault();
              onHoverSlot(index);
            }}
            onDragLeave={() => onHoverSlot(null)}
            onDrop={(e) => {
              e.preventDefault();
              onHoverSlot(null);
              if (dropEnabled && !card) onDropSlot(index);
            }}
            onClick={() => {
              if (dropEnabled && !card) onDropSlot(index);
            }}
          >
            {card ? (
              <TableCard card={card} revealed={revealed} />
            ) : (
              <span className="grid h-full place-items-center text-[10px] font-bold uppercase tracking-widest text-white/30">
                Slot {index + 1}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
