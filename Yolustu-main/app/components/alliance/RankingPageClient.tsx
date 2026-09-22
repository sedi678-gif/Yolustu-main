"use client";

import { useEffect } from 'react';
import { AllianceRankingBoard } from '@/app/components/alliance/AllianceRankTables';
import { requireLeaderboardPeriod } from '@/app/lib/leaderboard';
import styles from '@/app/components/alliance/alliance.module.css';

export default function RankingPageClient() {
  useEffect(() => {
    void requireLeaderboardPeriod().catch(() => {});
    const onVisible = () => {
      if (document.visibilityState === 'visible') void requireLeaderboardPeriod().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  return (
    <div className={styles.rankingPage}>
      <header className={styles.rankingPageHead}>
        <p className={styles.rankingPageEyebrow}>Yol Üstü</p>
        <h1 className={styles.rankingPageTitle}>Reytinq</h1>
      </header>
      <AllianceRankingBoard />
    </div>
  );
}
