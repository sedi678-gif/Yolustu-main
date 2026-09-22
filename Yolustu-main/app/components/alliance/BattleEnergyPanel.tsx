"use client";

import { useCallback, useEffect, useState } from 'react';
import type { BattleRecord } from '@/app/lib/battleEventLog/battleEventTypes';
import {
  BATTLE_ENERGY_MAX,
  listenBattleEnergy,
  energyRequestIdForCard,
  officialCardEnergyCost,
  playBattleCard,
  type BattleEnergy,
} from '@/app/lib/battleEnergy';
import { BATTLE_LOADOUT_CARD_METAS, listenOwnLoadout } from '@/app/lib/battleLoadout';
import styles from './alliance.module.css';

export default function BattleEnergyPanel({
  battleId,
  playerId,
  battleStatus,
}: {
  battleId: string;
  playerId: string;
  battleStatus: BattleRecord['status'];
}) {
  const [energy, setEnergy] = useState<BattleEnergy | null>(null);
  const [hand, setHand] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastPlay, setLastPlay] = useState<string | null>(null);

  useEffect(() => {
    return listenBattleEnergy(battleId, playerId, setEnergy);
  }, [battleId, playerId]);

  useEffect(() => {
    return listenOwnLoadout(battleId, playerId, (loadout) => {
      setHand(loadout?.cardIds ?? []);
    });
  }, [battleId, playerId]);

  const canPlay = battleStatus === 'locked' || battleStatus === 'active';
  const serverEnergy = energy?.energy;
  const used = energy?.usedCardIds ?? [];

  const onPlay = useCallback(
    async (cardId: string) => {
      if (!canPlay || busyId || !energy) return;
      setBusyId(cardId);
      setError(null);
      const requestId = energyRequestIdForCard(battleId, playerId, cardId);
      try {
        const result = await playBattleCard({
          battleId,
          playerId,
          cardId,
          requestId,
        });
        setLastPlay(
          result.duplicate
            ? 'Eyni request təkrarlandı — energy yenidən çıxılmadı'
            : `${cardId} oynandı. −${result.cost} energy`
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Kart oynanılmadı');
      } finally {
        setBusyId(null);
      }
    },
    [battleId, busyId, canPlay, energy, playerId]
  );

  return (
    <div className={styles.energyBox}>
      <div className={styles.energyHead}>
        <strong>Energy</strong>
        <span>{energy ? `${energy.energy}/${energy.maxEnergy}` : '…'}</span>
      </div>
      <div className={styles.energyTrack} aria-hidden={energy == null}>
        <div
          className={styles.energyFill}
          style={{ width: `${energy ? (energy.energy / BATTLE_ENERGY_MAX) * 100 : 0}%` }}
        />
      </div>
      <p className={styles.energyHint}>
        {energy
          ? canPlay
            ? 'Cost serverdən gəlir. Client rəqəmi qəbul edilmir.'
            : 'Battle başlamazdan əvvəl energy 30-dur. Kart hələ oynana bilməz.'
          : 'Energy serverdən gözlənilir…'}
      </p>

      {canPlay && hand.length > 0 ? (
        <div className={styles.energyHand}>
          {hand.map((cardId) => {
            const meta = BATTLE_LOADOUT_CARD_METAS.find((item) => item.id === cardId);
            const cost = officialCardEnergyCost(cardId);
            const spent = used.includes(cardId);
            const lacking = serverEnergy != null && serverEnergy < cost;
            const blocked = !energy || spent || lacking || Boolean(busyId);
            return (
              <button
                key={cardId}
                type="button"
                className={styles.energyPlayBtn}
                disabled={blocked}
                onClick={() => void onPlay(cardId)}
              >
                <span>{meta?.title ?? cardId}</span>
                <span>⚡ {cost}</span>
                {spent ? <span>oynanıb</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {lastPlay ? <p className={styles.battleJoinHint}>{lastPlay}</p> : null}
      {error ? <p className={styles.battleJoinWarn}>{error}</p> : null}
    </div>
  );
}
