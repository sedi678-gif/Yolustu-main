"use client";

import { useEffect, useState } from 'react';
import type { BattleRecord } from '@/app/lib/battleEventLog/battleEventTypes';
import { listenPlayerBattleScore, officialBattleLeader } from '@/app/lib/battleScore';
import styles from './alliance.module.css';

export default function BattleScorePanel({
  battle,
  playerId,
}: {
  battle: BattleRecord;
  playerId: string;
}) {
  const [mine, setMine] = useState<number | null>(null);

  useEffect(() => {
    return listenPlayerBattleScore(battle.id, playerId, (score) => {
      setMine(score?.score ?? 0);
    });
  }, [battle.id, playerId]);

  const lead = officialBattleLeader(battle);

  return (
    <section className={styles.scoreBox} aria-label="Battle score">
      <div className={styles.scoreHead}>
        <strong>Xal</strong>
        <span>
          {lead.reason === 'draw'
            ? 'bərabər'
            : lead.leaderSide === 'attacker'
              ? 'hücum irəlidə'
              : 'müdafiə irəlidə'}
        </span>
      </div>
      <div className={styles.scoreGrid}>
        <div>
          <small>⚔ {battle.attackerAllianceName ?? 'Hücum'}</small>
          <strong>{lead.attackerScore}</strong>
        </div>
        <div>
          <small>🛡 {battle.defenderAllianceName ?? 'Müdafiə'}</small>
          <strong>{lead.defenderScore}</strong>
        </div>
      </div>
      <p className={styles.scoreHint}>
        Sənin xalın: {mine ?? '…'} · damage, xal və qalib yalnız serverdə hesablanır.
      </p>
    </section>
  );
}
