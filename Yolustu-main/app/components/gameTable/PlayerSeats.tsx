"use client";

import { seatsForMode, type MatchMode, type TableSide } from './gameTableTypes';
import styles from './gameTable.module.css';

const NAMES: Record<TableSide, string[]> = {
  attacker: ['A1 Lider', 'A2 Klik', 'A3 Koord', 'A4 Yardımçı'],
  defender: ['D1 Lider', 'D2 Klik', 'D3 Koord', 'D4 Yardımçı'],
};

interface PlayerSeatsProps {
  mode: MatchMode;
  viewerSide: TableSide;
}

export default function PlayerSeats({ mode, viewerSide }: PlayerSeatsProps) {
  const seats = seatsForMode(mode);
  return (
    <>
      <div className={`${styles.seatRow} ${styles.seatRowTop}`}>
        {NAMES.defender.slice(0, seats.defender).map((name, i) => (
          <span
            key={`d-${i}`}
            className={`${styles.seat} ${styles.seatDefender} ${
              viewerSide === 'defender' && i === 0 ? styles.seatYou : ''
            }`}
          >
            {name}
          </span>
        ))}
      </div>
      <div className={`${styles.seatRow} ${styles.seatRowBottom}`}>
        {NAMES.attacker.slice(0, seats.attacker).map((name, i) => (
          <span
            key={`a-${i}`}
            className={`${styles.seat} ${styles.seatAttacker} ${
              viewerSide === 'attacker' && i === 0 ? styles.seatYou : ''
            }`}
          >
            {name}
          </span>
        ))}
      </div>
    </>
  );
}
