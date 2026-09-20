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
import AppLink from '@/app/components/AppLink';
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

        <AppLink
          href="/table"
          className="absolute left-3 z-20 rounded-full border border-amber-300/40 bg-black/55 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-100"
          style={{ bottom: 'max(86px, calc(env(safe-area-inset-bottom, 0px) + 72px))' }}
        >
          ⚔ Oyun masası
        </AppLink>

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
