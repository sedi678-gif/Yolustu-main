"use client";



import React, { useMemo, useState } from 'react';

import Link from 'next/link';

import { useUser } from '@/context/UserContext';

import { useAllianceBrain } from './AllianceBrainContext';

import ModelCardsGrid from './ModelCardsGrid';

import AllianceMapRoundBtn from './AllianceMapRoundBtn';

import AllianceMapSheet from './AllianceMapSheet';
import { IconMapCards } from './AllianceMapIcons';

import styles from './alliance.module.css';



interface AllianceMapOrduCardsProps {

  variant?: 'inline' | 'sheet';

}



export function AllianceMapOrduCardsContent({ sheetMode = false }: { sheetMode?: boolean }) {

  const { userId } = useUser();

  const { activeAlliance, players, battleCardTotal } = useAllianceBrain();

  const [tab, setTab] = useState<'ordu' | 'cards'>('cards');



  const orduMembers = useMemo(() => {

    if (!activeAlliance) return [];

    const memberIds = activeAlliance.members ?? [];

    return memberIds.map((id) => {

      const p = players.find((pl) => pl.odId === id);

      return {

        id,

        name: p?.displayName || id,

        score: p?.score ?? 0,

        isLeader: activeAlliance.leaderId === id,

        isMe: id === userId,

      };

    });

  }, [activeAlliance, players, userId]);



  const orduPower = orduMembers.reduce((s, m) => s + m.score, 0);



  if (!activeAlliance) {

    return <p className={styles.mapOrduCardsEmpty}>Ordu və kartlar üçün ittifaqda olmalısan.</p>;

  }



  return (

    <>

      <div className={styles.mapOrduCardsTabs}>

        <button

          type="button"

          className={`${styles.mapOrduCardsTab} ${tab === 'ordu' ? styles.mapOrduCardsTabActive : ''}`}

          onClick={() => setTab('ordu')}

        >

          ⚔️ Ordu ({orduMembers.length})

        </button>

        <button

          type="button"

          className={`${styles.mapOrduCardsTab} ${tab === 'cards' ? styles.mapOrduCardsTabActive : ''}`}

          onClick={() => setTab('cards')}

        >

          🎴 Kartlar ({battleCardTotal})

        </button>

      </div>



      {tab === 'ordu' ? (

        <div className={`${styles.mapOrduCardsBody} ${sheetMode ? styles.mapOrduCardsBodySheet : ''}`}>

          <div className={styles.mapOrduStatsRow}>

            <span>👥 {orduMembers.length}</span>

            <span>⚡ {orduPower}</span>

            <span>🏆 {activeAlliance.score}</span>

          </div>

          <div className={styles.mapOrduMemberList}>

            {orduMembers.length === 0 ? (

              <p className={styles.mapOrduCardsEmpty}>Ordu boşdur.</p>

            ) : (

              orduMembers.map((m) => (

                <div key={m.id} className={styles.mapOrduMemberRow}>

                  <div>

                    <strong>

                      {m.isMe ? 'Sən' : m.name}

                      {m.isLeader ? ' 👑' : ''}

                    </strong>

                  </div>

                  <span className={styles.mapOrduMemberScore}>{m.score}</span>

                </div>

              ))

            )}

          </div>

        </div>

      ) : (

        <div className={`${styles.mapOrduCardsBody} ${sheetMode ? styles.mapOrduCardsBodySheet : ''}`}>

          <ModelCardsGrid />

          {battleCardTotal === 0 && (

            <Link href="/shop" className={styles.mapCardsShopLink}>

              🛒 Mağazadan kart al

            </Link>

          )}

        </div>

      )}

    </>

  );

}



export default function AllianceMapOrduCards({ variant = 'inline' }: AllianceMapOrduCardsProps) {

  const { activeAlliance } = useAllianceBrain();

  const [sheetOpen, setSheetOpen] = useState(false);



  if (variant === 'sheet') {

    return (

      <>

        <AllianceMapRoundBtn

          icon={<IconMapCards />}

          label="Kartlar"

          onClick={() => setSheetOpen(true)}

          disabled={!activeAlliance}

          title={!activeAlliance ? 'Kartlar üçün ittifaqda olmalısan' : 'Kartlar'}

          active={sheetOpen}

        />

        <AllianceMapSheet

          open={sheetOpen}

          onClose={() => setSheetOpen(false)}

          title="Kartlar"

          icon={<IconMapCards />}

        >

          <AllianceMapOrduCardsContent sheetMode />

        </AllianceMapSheet>

      </>

    );

  }



  if (!activeAlliance) {

    return (

      <div className={`${styles.mapOrduCardsPanel} ${styles.glass}`}>

        <p className={styles.mapOrduCardsEmpty}>Ordu və kartlar üçün ittifaqda olmalısan.</p>

      </div>

    );

  }



  return (

    <div className={`${styles.mapOrduCardsPanel} ${styles.glass}`}>

      <AllianceMapOrduCardsContent />

    </div>

  );

}

