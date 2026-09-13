"use client";

import React, { useState } from 'react';
import { useUser } from '@/context/UserContext';
import { getLocalProfileDisplayName } from '@/app/lib/userId';
import { useAllianceBrain } from './AllianceBrainContext';
import { AlliancePlayerRankTable } from './AllianceRankTables';
import GoogleAdButton from './GoogleAdButton';
import AllianceAttackModal from './AllianceAttackModal';
import AllianceMapRoundBtn from './AllianceMapRoundBtn';
import { IconMapAttack } from './AllianceMapIcons';
import { EMPTY_BATTLE_CARDS } from './battleCardsConfig';
import styles from './alliance.module.css';

export default function AllianceMapRightPanel() {
  const { userId, user } = useUser();
  const userName = user?.displayName || user?.email || getLocalProfileDisplayName();
  const [attackOpen, setAttackOpen] = useState(false);

  const {
    alliances,
    players,
    activeAlliance,
    myProfile,
    handleAdXpReward,
    setAttackTargetId,
    setFocusAllianceId,
  } = useAllianceBrain();

  return (
    <aside className={styles.allianceMapRight}>
      <div className={styles.mapRoundBtnRow}>
        <GoogleAdButton
          variant="xp"
          label="+500 XP"
          onReward={() => void handleAdXpReward()}
        />

        <AlliancePlayerRankTable
          players={players}
          currentUserId={userId}
          currentUserName={userName}
          variant="sheet"
        />

        <AllianceMapRoundBtn
          icon={<IconMapAttack />}
          label="Hücum"
          onClick={() => setAttackOpen(true)}
          disabled={!activeAlliance}
          title={!activeAlliance ? 'Hücum üçün ittifaqda olmalısan' : 'İttifaq hücumu başlat'}
          active={attackOpen}
        />
      </div>

      {activeAlliance && (
        <AllianceAttackModal
          open={attackOpen}
          onClose={() => {
            setAttackOpen(false);
            setAttackTargetId(null);
          }}
          alliances={alliances}
          myAlliance={activeAlliance}
          userId={userId}
          userName={userName}
          battleCards={myProfile?.battleCards ?? EMPTY_BATTLE_CARDS}
          onTargetChange={setAttackTargetId}
          onSuccess={(msg, target) => {
            if (target) setFocusAllianceId(target.id);
            setAttackTargetId(null);
          }}
        />
      )}
    </aside>
  );
}
