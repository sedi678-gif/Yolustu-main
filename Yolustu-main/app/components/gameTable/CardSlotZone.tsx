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
  selectedReady: boolean;
  landingIndex: number | null;
  onDropSlot: (index: number) => void;
  onHoverSlot: (index: number | null) => void;
  onReturnSlot: (index: number) => void;
}

export default function CardSlotZone({
  side,
  slots,
  revealCard,
  dropEnabled,
  hotSlot,
  selectedReady,
  landingIndex,
  onDropSlot,
  onHoverSlot,
  onReturnSlot,
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
          {filled}/{TABLE_SLOT_COUNT}
        </span>
      </div>
      <div className={styles.slots}>
        {slots.map((card, index) => {
          const empty = !card;
          return (
            <button
              key={`${side}-${index}`}
              type="button"
              data-table-slot={`${side}-${index}`}
              data-table-side={side}
              data-table-index={String(index)}
              data-drop={dropEnabled ? '1' : '0'}
              aria-label={empty ? `Boş yer ${index + 1}` : 'Kart yeri'}
              className={`${styles.slot} ${isAttacker ? styles.slotAttacker : styles.slotDefender} ${
                hotSlot === index ? styles.slotHot : ''
              } ${dropEnabled && empty ? styles.slotDroppable : ''} ${
                dropEnabled && selectedReady && empty ? styles.slotAwait : ''
              }`}
              onPointerEnter={() => {
                if (dropEnabled) onHoverSlot(index);
              }}
              onPointerLeave={() => onHoverSlot(null)}
              onClick={() => {
                if (!dropEnabled) return;
                if (empty || selectedReady) onDropSlot(index);
                else onReturnSlot(index);
              }}
            >
              {card ? (
                <div
                  className={`${styles.slotCard} ${landingIndex === index ? styles.slotCardSit : ''}`}
                >
                  <TableCard card={card} revealed={revealCard(card)} />
                </div>
              ) : (
                <span className={styles.slotWell} aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
