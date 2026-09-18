"use client";

import { useEffect, useState } from 'react';
import AppBottomNav from '@/app/components/AppBottomNav';
import { useAllianceBrain } from './AllianceBrainContext';
import AllianceCastleHome from './AllianceCastleHome';
import AzerbaijanAllianceMap from './AzerbaijanAllianceMap';
import AllianceMapSidebar from './AllianceMapSidebar';
import AllianceMapRightPanel from './AllianceMapRightPanel';
import AllianceChatDock from './AllianceChatDock';
import GoogleAdButton from './GoogleAdButton';
import styles from './alliance.module.css';

function AlliancePageInner() {
  const { alliances, activeAlliance, liveBattleAttacks, handleAdXpReward } = useAllianceBrain();
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    const latest = liveBattleAttacks[0];
    if (!latest) return;
    if (Date.now() - latest.createdAt < 5000) setMapOpen(true);
  }, [liveBattleAttacks]);

  return (
    <div
      className={`${styles.world} ${styles.worldAllianceMap} ${styles.worldCastleHub} ${
        mapOpen ? styles.worldMapOpen : ''
      }`}
    >
      <div className={styles.allianceMapLayout}>
        <AllianceCastleHome />
        <AllianceMapSidebar />
        <AllianceMapRightPanel mapOpen={mapOpen} onToggleMap={() => setMapOpen((open) => !open)} />
        <AllianceChatDock />

        <div className={styles.allianceMapLaunchWrap}>
          <GoogleAdButton
            variant="xp"
            label="+500 XP"
            onReward={() => void handleAdXpReward()}
          />
        </div>

        <div
          className={`${styles.allianceMapOverlay} ${mapOpen ? styles.allianceMapOverlayOpen : ''}`}
          aria-hidden={!mapOpen}
        >
          <AzerbaijanAllianceMap
            alliances={alliances}
            activeAlliance={activeAlliance}
            active={mapOpen}
          />
        </div>
      </div>
      <AppBottomNav activeTab="alliance" />
    </div>
  );
}

export default function AlliancePage() {
  return <AlliancePageInner />;
}
