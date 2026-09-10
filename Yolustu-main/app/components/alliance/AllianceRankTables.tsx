"use client";

import React, { useMemo, useState } from 'react';
import { PlayerProfile, AllianceData } from './types';
import { EMPTY_BATTLE_CARDS } from './battleCardsConfig';
import AllianceMapRoundBtn from './AllianceMapRoundBtn';
import AllianceMapSheet from './AllianceMapSheet';
import styles from './alliance.module.css';

export interface RankRow {
  id: string;
  rank: number;
  name: string;
  score: number;
  subtitle?: string;
}

interface RankTableContentProps {
  rows: RankRow[];
  userRankRow: RankRow | null;
  userRankLabel: string;
  emptyMessage?: string;
  sheetMode?: boolean;
}

export function RankTableContent({
  rows,
  userRankRow,
  userRankLabel,
  emptyMessage = 'Hələ məlumat yoxdur.',
  sheetMode = false,
}: RankTableContentProps) {
  const top100 = rows.slice(0, 100);

  return (
    <div className={`${styles.rankTableContent} ${sheetMode ? styles.rankTableContentSheet : ''}`}>
      <div className={styles.rankTableScroll}>
        {top100.length === 0 ? (
          <p className={styles.rankTableEmpty}>{emptyMessage}</p>
        ) : (
          top100.map((row) => (
            <div
              key={`${row.id}-${row.rank}`}
              className={`${styles.rankTableRow} ${row.rank <= 3 ? styles.rankTableRowTop : ''} ${userRankRow?.id === row.id ? styles.rankTableRowMe : ''}`}
            >
              <span className={styles.rankTableRank}>#{row.rank}</span>
              <div className={styles.rankTableInfo}>
                <span className={styles.rankTableName}>{row.name}</span>
                {row.subtitle && <span className={styles.rankTableSub}>{row.subtitle}</span>}
              </div>
              <span className={styles.rankTableScore}>{row.score} xal</span>
            </div>
          ))
        )}
      </div>

      <div className={styles.rankTableFooter}>
        {userRankRow ? (
          <>
            <span className={styles.rankTableFooterLabel}>{userRankLabel}</span>
            <div className={`${styles.rankTableRow} ${styles.rankTableRowMe}`}>
              <span className={styles.rankTableRank}>#{userRankRow.rank}</span>
              <div className={styles.rankTableInfo}>
                <span className={styles.rankTableName}>{userRankRow.name}</span>
                {userRankRow.subtitle && (
                  <span className={styles.rankTableSub}>{userRankRow.subtitle}</span>
                )}
              </div>
              <span className={styles.rankTableScore}>{userRankRow.score} xal</span>
            </div>
          </>
        ) : (
          <p className={styles.rankTableFooterEmpty}>{userRankLabel}</p>
        )}
      </div>
    </div>
  );
}

interface CollapsibleRankTableProps {
  title: string;
  icon: string;
  shortLabel?: string;
  rows: RankRow[];
  userRankRow: RankRow | null;
  userRankLabel: string;
  emptyMessage?: string;
  defaultOpen?: boolean;
  variant?: 'inline' | 'sheet';
}

function CollapsibleRankTable({
  title,
  icon,
  shortLabel,
  rows,
  userRankRow,
  userRankLabel,
  emptyMessage = 'Hələ məlumat yoxdur.',
  defaultOpen = false,
  variant = 'inline',
}: CollapsibleRankTableProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (variant === 'sheet') {
    return (
      <>
        <AllianceMapRoundBtn
          icon={icon}
          label={shortLabel ?? title}
          onClick={() => setSheetOpen(true)}
          active={sheetOpen}
        />
        <AllianceMapSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title={title}
          icon={icon}
        >
          <RankTableContent
            rows={rows}
            userRankRow={userRankRow}
            userRankLabel={userRankLabel}
            emptyMessage={emptyMessage}
            sheetMode
          />
        </AllianceMapSheet>
      </>
    );
  }

  return (
    <div className={`${styles.rankTable} ${styles.glass} ${open ? styles.rankTableOpen : ''}`}>
      <button
        type="button"
        className={styles.rankTableToggle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{icon} {title}</span>
        <span className={styles.rankTableChevron}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <RankTableContent
          rows={rows}
          userRankRow={userRankRow}
          userRankLabel={userRankLabel}
          emptyMessage={emptyMessage}
        />
      )}
    </div>
  );
}

interface AllianceRankTablesProps {
  alliances: AllianceData[];
  players: PlayerProfile[];
  currentUserId: string;
  currentUserName: string;
  activeAlliance: AllianceData | null;
  sections?: ('leaders' | 'alliances')[];
  stackClassName?: string;
  defaultOpen?: boolean;
  allianceTitle?: string;
  variant?: 'inline' | 'sheet';
  allianceShortLabel?: string;
}

export default function AllianceRankTables({
  alliances,
  players,
  currentUserId,
  currentUserName,
  activeAlliance,
  sections = ['leaders', 'alliances'],
  stackClassName,
  defaultOpen = false,
  allianceTitle = 'İttifaqlar cədvəli',
  variant = 'inline',
  allianceShortLabel = 'Reytinq',
}: AllianceRankTablesProps) {
  const { leaderRows, allianceRows, userLeaderRank, userAllianceRank } = useMemo(() => {
    const sortedAlliances = [...alliances].sort((a, b) => (b.score || 0) - (a.score || 0));

    const allianceRows: RankRow[] = sortedAlliances.map((item, index) => ({
      id: item.id,
      rank: index + 1,
      name: item.name,
      score: item.score || 50,
      subtitle: `📍 ${item.region} · ${item.members?.length || 0} üzv`,
    }));

    // Liderlər: Firebase players kolleksiyasından (mərkəzi beyin)
    let leaderSource: PlayerProfile[] = players
      .filter((p) => p.isLeader && p.score > 0)
      .sort((a, b) => b.score - a.score);

    if (leaderSource.length === 0) {
      leaderSource = sortedAlliances.map((item) => ({
        odId: item.leaderId,
        displayName: item.leader,
        allianceId: item.id,
        allianceName: item.name,
        isLeader: true,
        score: item.score || 50,
        manat: 0,
        battleCards: { ...EMPTY_BATTLE_CARDS },
        activeShields: [],
        updatedAt: 0,
      }));
    }

    const leaderRows: RankRow[] = leaderSource.slice(0, 100).map((p, index) => ({
      id: p.odId,
      rank: index + 1,
      name: p.displayName,
      score: p.score,
      subtitle: p.allianceName ? `🛡️ ${p.allianceName}` : undefined,
    }));

    let userAllianceRank: RankRow | null = null;
    if (activeAlliance) {
      userAllianceRank = allianceRows.find((r) => r.id === activeAlliance.id) ?? null;
    }

    let userLeaderRank: RankRow | null = null;
    userLeaderRank = leaderRows.find((r) => r.id === currentUserId) ?? null;

    return { leaderRows, allianceRows, userLeaderRank, userAllianceRank };
  }, [alliances, players, activeAlliance, currentUserId]);

  if (variant === 'sheet') {
    return (
      <>
        {sections.includes('leaders') && (
          <CollapsibleRankTable
            title="Liderlər cədvəli"
            icon="👑"
            shortLabel="Lider"
            rows={leaderRows}
            userRankRow={userLeaderRank}
            userRankLabel={
              userLeaderRank
                ? 'Sizin lider sıranız'
                : `${currentUserName} — hələ lider sırasında deyilsiniz`
            }
            emptyMessage="Hələ heç bir lider yoxdur."
            defaultOpen={defaultOpen}
            variant={variant}
          />
        )}
        {sections.includes('alliances') && (
          <CollapsibleRankTable
            title={allianceTitle}
            icon="🛡️"
            shortLabel={allianceShortLabel}
            rows={allianceRows}
            userRankRow={userAllianceRank}
            userRankLabel={
              userAllianceRank
                ? 'Sizin ittifaq sıranız'
                : 'Hələ heç bir ittifaqda deyilsiniz'
            }
            emptyMessage="Hələ heç bir ittifaq yoxdur."
            defaultOpen={defaultOpen}
            variant={variant}
          />
        )}
      </>
    );
  }

  const stackClass = stackClassName ?? styles.leftRankStack;

  return (
    <div className={stackClass}>
      {sections.includes('leaders') && (
        <CollapsibleRankTable
          title="Liderlər cədvəli"
          icon="👑"
          shortLabel="Lider"
          rows={leaderRows}
          userRankRow={userLeaderRank}
          userRankLabel={
            userLeaderRank
              ? 'Sizin lider sıranız'
              : `${currentUserName} — hələ lider sırasında deyilsiniz`
          }
          emptyMessage="Hələ heç bir lider yoxdur."
          defaultOpen={defaultOpen}
          variant={variant}
        />
      )}
      {sections.includes('alliances') && (
        <CollapsibleRankTable
          title={allianceTitle}
          icon="🛡️"
          shortLabel={allianceShortLabel}
          rows={allianceRows}
          userRankRow={userAllianceRank}
          userRankLabel={
            userAllianceRank
              ? 'Sizin ittifaq sıranız'
              : 'Hələ heç bir ittifaqda deyilsiniz'
          }
          emptyMessage="Hələ heç bir ittifaq yoxdur."
          defaultOpen={defaultOpen}
          variant={variant}
        />
      )}
    </div>
  );
}

interface AlliancePlayerRankTableProps {
  players: PlayerProfile[];
  currentUserId: string;
  currentUserName: string;
  defaultOpen?: boolean;
  variant?: 'inline' | 'sheet';
}

export function AlliancePlayerRankTable({
  players,
  currentUserId,
  currentUserName,
  defaultOpen = false,
  variant = 'inline',
}: AlliancePlayerRankTableProps) {
  const { playerRows, userPlayerRank } = useMemo(() => {
    const sorted = [...players]
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score);

    const playerRows: RankRow[] = sorted.slice(0, 100).map((p, index) => ({
      id: p.odId,
      rank: index + 1,
      name: p.displayName,
      score: p.score,
      subtitle: p.allianceName ? `🛡️ ${p.allianceName}` : undefined,
    }));

    const userPlayerRank = playerRows.find((r) => r.id === currentUserId) ?? null;

    return { playerRows, userPlayerRank };
  }, [players, currentUserId]);

  return (
    <CollapsibleRankTable
      title="İstifadəçilər reytinqi"
      icon="⭐"
      shortLabel="Oyunçu"
      rows={playerRows}
      userRankRow={userPlayerRank}
      userRankLabel={
        userPlayerRank
          ? 'Sizin oyunçu sıranız'
          : `${currentUserName} — hələ reytinq cədvəlində deyilsiniz`
      }
      emptyMessage="Hələ heç bir oyunçu yoxdur."
      defaultOpen={defaultOpen}
      variant={variant}
    />
  );
}
