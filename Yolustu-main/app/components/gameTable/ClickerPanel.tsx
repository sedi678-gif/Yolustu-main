"use client";

import styles from './gameTable.module.css';

interface ClickerPanelProps {
  visible: boolean;
  clicks: number;
  needed: number;
  onClickRaid: () => void;
}

export default function ClickerPanel({ visible, clicks, needed, onClickRaid }: ClickerPanelProps) {
  if (!visible) return null;

  const pct = Math.min(100, Math.round((clicks / needed) * 100));
  const done = clicks >= needed;

  return (
    <div className={styles.clickerBar}>
      <button type="button" onClick={onClickRaid} className={styles.clickerBtn} disabled={done}>
        {done ? 'Raid tamamlandı' : 'Hücum / Klik'}
      </button>
      <div className={styles.clickerMeter}>
        <div className={styles.clickerMeterHead}>
          <span>Raid klik</span>
          <span>
            {Math.min(clicks, needed)}/{needed}
          </span>
        </div>
        <div className={styles.clickerTrack}>
          <div className={styles.clickerFill} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
