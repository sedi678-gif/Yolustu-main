"use client";

import { useEffect, useState } from 'react';
import AppBottomNav from '@/app/components/AppBottomNav';
import { useAllianceBrain } from './AllianceBrainContext';
import AllianceCastleHome from './AllianceCastleHome';
import AzerbaijanAllianceMap from './AzerbaijanAllianceMap';
import AllianceMapSidebar from './AllianceMapSidebar';
import AllianceMapRightPanel from './AllianceMapRightPanel';
import AllianceChatDock from './AllianceChatDock';
import styles from './alliance.module.css';

const CASTLE_THUMB = '/images/alliance-castle-live.png';
const MAP_THUMB = '/images/alliance-map-bg.svg';

function AlliancePageInner() {
  const { alliances, activeAlliance, liveBattleAttacks } = useAllianceBrain();
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
        <AllianceMapRightPanel />
        <AllianceChatDock />

        <button
          type="button"
          className={styles.allianceMapLaunchBtn}
          onClick={() => setMapOpen((open) => !open)}
          aria-pressed={mapOpen}
          aria-label={mapOpen ? 'Qalaya qayıt' : 'Xəritəni aç'}
          title={mapOpen ? 'Qala' : 'Xəritə'}
        >
          <img src={mapOpen ? CASTLE_THUMB : MAP_THUMB} alt="" draggable={false} />
          <span>{mapOpen ? 'Qala' : 'Xəritə'}</span>
        </button>

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
