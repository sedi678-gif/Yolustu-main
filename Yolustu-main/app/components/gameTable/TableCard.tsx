"use client";

import { catalogCard, catalogImage, type TableCardInstance } from './gameTableTypes';
import styles from './gameTable.module.css';

interface TableCardProps {
  card: TableCardInstance;
  revealed: boolean;
  compact?: boolean;
}

export default function TableCard({ card, revealed, compact = false }: TableCardProps) {
  const def = catalogCard(card.cardId);
  const src = catalogImage(card.cardId);

  if (!revealed) {
    return (
      <div className={styles.cardBack} title="Üzüaşağı kart" aria-label="Gizli kart">
        <span className={styles.cardBackMark} aria-hidden>
          🂠
        </span>
      </div>
    );
  }

  return (
    <div className={styles.cardFace} title={def?.title ?? 'Kart'}>
      {src ? (
        <img src={src} alt={def?.title ?? 'Kart'} className={styles.cardImg} draggable={false} />
      ) : (
        <div className={styles.cardFallback}>{def?.emoji ?? '?'}</div>
      )}
      {!compact && (
        <div className={styles.cardCaption}>{def?.title ?? card.cardId}</div>
      )}
    </div>
  );
}
