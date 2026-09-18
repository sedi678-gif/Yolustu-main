"use client";

import { AllianceRankingBoard } from '@/app/components/alliance/AllianceRankTables';
import styles from '@/app/components/alliance/alliance.module.css';

export default function RankingPageClient() {
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
