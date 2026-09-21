"use client";

import { useState } from 'react';
import styles from './gameTable.module.css';

interface CastleCoreProps {
  hit: boolean;
  modeLabel: string;
  clickable?: boolean;
  onCastleClick?: () => void;
}

export default function CastleCore({ hit, modeLabel, clickable, onCastleClick }: CastleCoreProps) {
  return (
    <div className={styles.castleWrap}>
      <button
        type="button"
        className={`${styles.castle} ${hit ? styles.castleHit : ''}`}
        aria-label="Qala"
        disabled={!clickable}
        onClick={() => {
          if (clickable) onCastleClick?.();
        }}
      >
        <span className={styles.castleRing} />
        <span className={styles.castleCore}>
          <span className={styles.castleIcon} aria-hidden>
            🏰
          </span>
          <span className={styles.castleTitle}>Qala</span>
          <span className={styles.castleMode}>{modeLabel}</span>
        </span>
      </button>
    </div>
  );
}

export function useCastleHit() {
  const [hit, setHit] = useState(false);
  const pulse = () => {
    setHit(true);
    window.setTimeout(() => setHit(false), 450);
  };
  return { hit, pulse };
}
