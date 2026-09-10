"use client";

import React from 'react';
import { AllianceData, PlayerProfile } from './types';
import AllianceRankTables, { AlliancePlayerRankTable } from './AllianceRankTables';
import GoogleAdButton from './GoogleAdButton';
import styles from './alliance.module.css';

interface AllianceCastleHudProps {
  alliances: AllianceData[];
  players: PlayerProfile[];
  currentUserId: string;
  currentUserName: string;
  activeAlliance: AllianceData | null;
  onAdReward?: () => void;
}

export default function AllianceCastleHud({
  alliances,
  players,
  currentUserId,
  currentUserName,
  activeAlliance,
  onAdReward,
}: AllianceCastleHudProps) {
  return (
    <div className={styles.castleHudLayer}>
      <div className={styles.castleHudLeft}>
        <h1 className={styles.castleBrandTitle}>YOLÜSTÜ</h1>
        <AllianceRankTables
          alliances={alliances}
          players={players}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          activeAlliance={activeAlliance}
          sections={['alliances']}
          stackClassName={styles.castleHudRankStack}
          defaultOpen
        />
      </div>

      <div className={styles.castleHudRight}>
        <AlliancePlayerRankTable
          players={players}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          defaultOpen
        />
        <GoogleAdButton onReward={onAdReward} />
      </div>
    </div>
  );
}
