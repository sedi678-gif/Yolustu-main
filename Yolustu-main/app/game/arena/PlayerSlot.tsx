"use client";

import type { ArenaSlotPlayer } from './types';
import styles from '../table/gameTable.module.css';

interface PlayerSlotProps {
  player: ArenaSlotPlayer | null;
  index: number;
  current?: boolean;
}

export default function PlayerSlot({ player, current }: PlayerSlotProps) {
  const empty = !player;

  return (
    <div className={styles.slot}>
      <div
        className={styles.avatar}
        style={
          current
            ? { boxShadow: '0 0 0 2px #fcd34d' }
            : empty
              ? { borderStyle: 'dashed', opacity: 0.45 }
              : undefined
        }
      >
        {player?.avatarUrl ? (
          <img src={player.avatarUrl} alt={player.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-[11px] font-black text-slate-300">{empty ? '—' : player.name.slice(0, 1)}</span>
        )}
      </div>
      <p className={styles.name}>{empty ? 'Boş' : player.name}</p>
    </div>
  );
}
