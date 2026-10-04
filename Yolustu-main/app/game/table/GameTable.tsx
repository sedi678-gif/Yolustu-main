"use client";

import ArenaScreen from '../arena/ArenaScreen';
import type { GameTableProps } from './types';
import styles from './gameTable.module.css';

export default function GameTable({ open, onClose, matchId, playerId }: GameTableProps) {
  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm ${styles.overlay}`}
      role="dialog"
      aria-modal="true"
      aria-label="Oyun masası"
    >
      <div className={styles.panel}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Bağla">
          X
        </button>
        <ArenaScreen onClose={onClose} matchId={matchId} playerId={playerId} />
      </div>
    </div>
  );
}
