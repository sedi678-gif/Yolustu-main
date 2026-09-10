"use client";

import AppBottomNav from '@/app/components/AppBottomNav';
import { useAllianceBrain } from './AllianceBrainContext';
import AzerbaijanAllianceMap from './AzerbaijanAllianceMap';
import AllianceMapSidebar from './AllianceMapSidebar';
import AllianceMapRightPanel from './AllianceMapRightPanel';
import styles from './alliance.module.css';

function AlliancePageInner() {
  const { alliances, activeAlliance } = useAllianceBrain();

  return (
    <div className={`${styles.world} ${styles.worldAllianceMap}`}>
      <div className={styles.allianceMapLayout}>
        <AllianceMapSidebar />
        <AzerbaijanAllianceMap alliances={alliances} activeAlliance={activeAlliance} />
        <AllianceMapRightPanel />
      </div>
      <AppBottomNav activeTab="alliance" />
    </div>
  );
}

export default function AlliancePage() {
  return <AlliancePageInner />;
}
