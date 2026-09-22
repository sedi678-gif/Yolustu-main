"use client";

import { useEffect, useState } from 'react';
import {
  BATTLE_CHALLENGE_DURATION_MS,
  expireBattleChallenge,
  listenBattleChallenges,
  submitChallengeClick,
  type BattleChallenge,
} from '@/app/lib/battleClick';
import { listenServerClock } from '@/app/lib/battlePlay';
import { BATTLE_LOADOUT_TITLES } from '@/app/lib/battleLoadout/battleLoadoutConfig';
import styles from './alliance.module.css';

export default function BattleClickChallengePanel({
  battleId,
  playerId,
}: {
  battleId: string;
  playerId: string;
}) {
  const [challenges, setChallenges] = useState<BattleChallenge[]>([]);
  const [serverNow, setServerNow] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => listenServerClock(setServerNow), []);
  useEffect(() => listenBattleChallenges(battleId, setChallenges), [battleId]);

  useEffect(() => {
    const due = challenges.filter(
      (item) => item.status === 'active' && serverNow > 0 && item.expiresAt > 0 && serverNow >= item.expiresAt
    );
    if (due.length === 0) return;
    due.forEach((item) => {
      void expireBattleChallenge({ battleId, challengeId: item.challengeId, playerId }).catch(() => {});
    });
  }, [battleId, challenges, playerId, serverNow]);

  const live = challenges.filter((item) => item.status === 'active');
  if (live.length === 0 && !error) return null;

  return (
    <section className={styles.clickBox} aria-label="Click challenge">
      <div className={styles.clickHead}>
        <strong>Klik challenge</strong>
        <span>required server hesablayır</span>
      </div>
      {live.map((item) => {
        const remain = serverNow > 0 && item.expiresAt > 0 ? Math.max(0, item.expiresAt - serverNow) : 0;
        const expired = serverNow > 0 && item.expiresAt > 0 && serverNow >= item.expiresAt;
        return (
          <div key={item.challengeId} className={styles.clickCard}>
            <p>
              {BATTLE_LOADOUT_TITLES[item.cardId] ?? item.cardId} · {item.currentClicks}/{item.requiredClicks}
            </p>
            <p className={styles.clickHint}>
              {expired
                ? 'Vaxt bitdi'
                : serverNow <= 0
                  ? 'Server saatı gözlənilir…'
                  : `${Math.ceil(remain / 1000)} / ${BATTLE_CHALLENGE_DURATION_MS / 1000} san`}
            </p>
            <button
              type="button"
              className={styles.energyPlayBtn}
              disabled={Boolean(busyId) || expired || item.status !== 'active'}
              onClick={() => {
                setBusyId(item.challengeId);
                setError(null);
                void submitChallengeClick({
                  battleId,
                  challengeId: item.challengeId,
                  playerId,
                })
                  .catch((err) => setError(err instanceof Error ? err.message : 'Klik olmadı'))
                  .finally(() => setBusyId(null));
              }}
            >
              {busyId === item.challengeId ? 'Göndərilir…' : 'Klik et'}
            </button>
          </div>
        );
      })}
      {error ? <p className={styles.battleJoinWarn}>{error}</p> : null}
    </section>
  );
}
