"use client";

import { TABLE_SLOT_COUNT, type TableCardInstance, type TableSide } from './gameTableTypes';
import TableCard from './TableCard';
import styles from './gameTable.module.css';

interface CardSlotZoneProps {
  side: TableSide;
  slots: Array<TableCardInstance | null>;
  revealCard: (card: TableCardInstance) => boolean;
  dropEnabled: boolean;
  hotSlot: number | null;
  onDropSlot: (index: number) => void;
  onHoverSlot: (index: number | null) => void;
}

export default function CardSlotZone({
  side,
  slots,
  revealCard,
  dropEnabled,
  hotSlot,
  onDropSlot,
  onHoverSlot,
}: CardSlotZoneProps) {
  const isAttacker = side === 'attacker';
  const filled = slots.filter(Boolean).length;

  return (
    <section
      className={isAttacker ? styles.zoneAttacker : styles.zoneDefender}
      aria-label={isAttacker ? 'Hücum kart zonası' : 'Müdafiə kart zonası'}
    >
      <div className={styles.zoneLabel} style={{ color: isAttacker ? '#fb7185' : '#67e8f9' }}>
        <span>{isAttacker ? '⚔ Hücum edən ittifaq' : '🛡 Müdafiə olunan ittifaq'}</span>
        <span className={styles.zoneCount}>
          {filled}/{TABLE_SLOT_COUNT} kart
        </span>
      </div>
      <div className={styles.slots}>
        {slots.map((card, index) => (
          <div
            key={`${side}-${index}`}
            className={`${styles.slot} ${isAttacker ? styles.slotAttacker : styles.slotDefender} ${
              hotSlot === index ? styles.slotHot : ''
            } ${dropEnabled && !card ? styles.slotDroppable : ''}`}
            onDragOver={(e) => {
              if (!dropEnabled || card) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
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
              <TableCard card={card} revealed={revealCard(card)} />
            ) : (
              <span className={styles.slotEmpty}>Slot {index + 1}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
