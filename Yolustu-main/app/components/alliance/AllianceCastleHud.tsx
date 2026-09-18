"use client";

import React from 'react';
import { AllianceData, PlayerProfile } from './types';
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

export default function AllianceCastleHud({ onAdReward }: AllianceCastleHudProps) {
  return (
    <div className={styles.castleHudLayer}>
      <div className={styles.castleHudLeft}>
        <h1 className={styles.castleBrandTitle}>YOLÜSTÜ</h1>
      </div>

      <div className={styles.castleHudRight}>
        <GoogleAdButton onReward={onAdReward} />
      </div>
    </div>
  );
}
