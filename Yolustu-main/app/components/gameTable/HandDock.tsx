"use client";

import { catalogCard, catalogImage, type TableCardInstance } from './gameTableTypes';
import styles from './gameTable.module.css';

interface HandDockProps {
  cards: TableCardInstance[];
  selectedId: string | null;
  enabled: boolean;
  draggingId: string | null;
  unlimited: boolean;
  lockedReason?: string;
  onSelect: (id: string) => void;
  onPointerDown: (id: string, event: React.PointerEvent<HTMLButtonElement>) => void;
}

export default function HandDock({
  cards,
  selectedId,
  enabled,
  draggingId,
  unlimited,
  lockedReason,
  onSelect,
  onPointerDown,
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
        <span className={styles.handEmpty}>Əl boşdur — masadakı kartına klikləyib geri götür.</span>
      ) : (
        cards.map((card) => {
          const def = catalogCard(card.cardId);
          const src = catalogImage(card.cardId);
          const selected = selectedId === card.instanceId;
          const lifting = draggingId === card.instanceId;
          return (
            <button
              key={card.instanceId}
              type="button"
              draggable={false}
              onPointerDown={(event) => onPointerDown(card.instanceId, event)}
              onClick={() => onSelect(card.instanceId)}
              onDragStart={(event) => event.preventDefault()}
              className={`${styles.handCard} ${selected ? styles.handCardSelected : ''} ${
                lifting ? styles.handCardLifting : ''
              }`}
              title={`${def?.title ?? 'Kart'} — tutub slota at və ya seçib slota kliklə`}
            >
              {src ? (
                <img src={src} alt={def?.title ?? 'Kart'} className={styles.cardImg} draggable={false} />
              ) : (
                <span className={styles.cardFallback}>{def?.emoji}</span>
              )}
              {unlimited ? <span className={styles.handUnlimited}>∞</span> : null}
            </button>
          );
        })
      )}
    </div>
  );
}
