"use client";

import { PING_KINDS, type PingKind, type TablePing } from './gameTableTypes';
import styles from './gameTable.module.css';

interface CoordinatorToolbarProps {
  visible: boolean;
  pingKind: PingKind;
  onKind: (kind: PingKind) => void;
  onClear: () => void;
}

export function CoordinatorToolbar({ visible, pingKind, onKind, onClear }: CoordinatorToolbarProps) {
  if (!visible) return null;
  return (
    <div className={styles.coordBar}>
      {PING_KINDS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onKind(item.id)}
          className={`${styles.coordChip} ${pingKind === item.id ? styles.coordChipOn : ''}`}
          style={{
            borderColor: pingKind === item.id ? item.color : undefined,
            color: pingKind === item.id ? item.color : undefined,
          }}
        >
          {item.label}
        </button>
      ))}
      <button type="button" onClick={onClear} className={styles.coordChip}>
        Pingləri sil
      </button>
      <span className={styles.coordHint}>Masaya kliklə — hədəf nişanla</span>
    </div>
  );
}

interface CoordinatorOverlayProps {
  pings: TablePing[];
}

export default function CoordinatorOverlay({ pings }: CoordinatorOverlayProps) {
  return (
    <div className={styles.pingLayer} aria-hidden>
      {pings.map((ping) => {
        const color = PING_KINDS.find((item) => item.id === ping.kind)?.color ?? '#fbbf24';
        return (
          <div key={ping.id} className={styles.ping} style={{ left: `${ping.x}%`, top: `${ping.y}%`, color }}>
            <span className={styles.pingRing} />
            <span className={styles.pingLabel}>{ping.label}</span>
          </div>
        );
      })}
    </div>
  );
}
