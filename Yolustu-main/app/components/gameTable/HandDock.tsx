"use client";

import { catalogCard, catalogImage, DRAG_CARD_MIME, type TableCardInstance } from './gameTableTypes';
import styles from './gameTable.module.css';

interface HandDockProps {
  cards: TableCardInstance[];
  selectedId: string | null;
  enabled: boolean;
  lockedReason?: string;
  onSelect: (id: string) => void;
  onDragStart: (id: string) => void;
}

export default function HandDock({
  cards,
  selectedId,
  enabled,
  lockedReason,
  onSelect,
  onDragStart,
}: HandDockProps) {
  if (!enabled) {
    return (
      <div className={`${styles.hand} ${styles.handLocked}`}>
        {lockedReason ?? 'Bu rol kart ata bilməz.'}
      </div>
    );
  }

  return (
    <div className={styles.hand} aria-label="Əlindəki kartlar">
      {cards.length === 0 ? (
        <span className={styles.handEmpty}>Əl boşdur — masada 5 slota qədər kart ata bilərsən.</span>
      ) : (
        cards.map((card) => {
          const def = catalogCard(card.cardId);
          const src = catalogImage(card.cardId);
          const selected = selectedId === card.instanceId;
          return (
            <button
              key={card.instanceId}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_CARD_MIME, card.instanceId);
                e.dataTransfer.setData('text/plain', card.instanceId);
                e.dataTransfer.effectAllowed = 'move';
                onDragStart(card.instanceId);
              }}
              onClick={() => onSelect(card.instanceId)}
              className={`${styles.handCard} ${selected ? styles.handCardSelected : ''}`}
              title={`${def?.title ?? 'Kart'} — sürüşdür və ya seçib slota kliklə`}
            >
              {src ? (
                <img src={src} alt={def?.title ?? 'Kart'} className={styles.cardImg} draggable={false} />
              ) : (
                <span className={styles.cardFallback}>{def?.emoji}</span>
              )}
            </button>
          );
        })
      )}
    </div>
  );
}
