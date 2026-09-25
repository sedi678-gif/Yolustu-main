"use client";

import React, { useState } from 'react';
import { useAllianceBrain } from './AllianceBrainContext';
import AllianceFlagPreview from './AllianceFlagPreview';
import AllianceFlagEditor from './AllianceFlagEditor';
import { AllianceCombinedRankButton } from './AllianceRankTables';
import AllianceMapOrduCards from './AllianceMapOrduCards';
import DefenseLoadoutPanel from './DefenseLoadoutPanel';
import AllianceMapSheet from './AllianceMapSheet';
import { IconMapFlag } from './AllianceMapIcons';
import styles from './alliance.module.css';

export default function AllianceMapSidebar() {
  const { activeAlliance, hubVisuals } = useAllianceBrain();
  const [flagOpen, setFlagOpen] = useState(false);
  const [defenseOpen, setDefenseOpen] = useState(false);

  return (
    <aside className={styles.allianceMapSidebar}>
      <div className={styles.allianceMapSidebarHead}>
        <button
          type="button"
          className={styles.allianceFlagHeadBtn}
          onClick={() => setFlagOpen(true)}
          disabled={!activeAlliance}
          title={activeAlliance ? 'Bayraq' : 'Bayraq üçün ittifaqda olmalısan'}
          aria-label="Bayraq"
        >
          <AllianceFlagPreview flag={hubVisuals.allianceFlag} size="hub" wave />
        </button>
        <div className={styles.allianceMapSidebarTitleBlock}>
          <h1 className={styles.allianceMapSidebarTitle}>{hubVisuals.allianceName}</h1>
          {activeAlliance ? (
            <>
              <p className={styles.allianceMapSidebarMeta}>Qala Lv.{hubVisuals.fortressLevel}</p>
              <p className={styles.allianceMapSidebarLoc}>{activeAlliance.region}</p>
            </>
          ) : (
            <p className={styles.allianceMapSidebarMeta}>İttifaq yoxdur</p>
          )}
        </div>
      </div>

      <div className={styles.mapRoundBtnRow}>
        <AllianceCombinedRankButton />
        <AllianceMapOrduCards variant="sheet" />
        <button type="button" className={styles.mapRoundBtn} onClick={() => setDefenseOpen(true)}>
          Müdafiə
        </button>
      </div>

      <AllianceMapSheet
        open={flagOpen}
        onClose={() => setFlagOpen(false)}
        title="Bayraq redaktoru"
        icon={<IconMapFlag />}
      >
        <AllianceFlagEditor />
      </AllianceMapSheet>
      <AllianceMapSheet open={defenseOpen} onClose={() => setDefenseOpen(false)} title="Müdafiə kartları">
        <DefenseLoadoutPanel />
      </AllianceMapSheet>
    </aside>
  );
}
