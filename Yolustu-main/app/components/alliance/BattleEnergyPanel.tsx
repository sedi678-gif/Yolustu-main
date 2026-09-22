"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BattleRecord } from '@/app/lib/battleEventLog/battleEventTypes';
import {
  BATTLE_ENERGY_MAX,
  listenBattleEnergy,
  makeEnergyRequestId,
  officialCardEnergyCost,
  playBattleCard,
  type BattleEnergy,
} from '@/app/lib/battleEnergy';
import { BATTLE_CARD_MAX_USES, canPlayOnTurn, cardUsageCount } from '@/app/lib/battlePlay';
import { BATTLE_LOADOUT_CARD_METAS, listenOwnLoadout } from '@/app/lib/battleLoadout';
import styles from './alliance.module.css';

export default function BattleEnergyPanel({
  battle,
  playerId,
}: {
  battle: BattleRecord;
  playerId: string;
}) {
  const battleId = battle.id;
  const [energy, setEnergy] = useState<BattleEnergy | null>(null);
  const [hand, setHand] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastPlay, setLastPlay] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const requestRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return listenBattleEnergy(battleId, playerId, setEnergy);
  }, [battleId, playerId]);

  useEffect(() => {
    return listenOwnLoadout(battleId, playerId, (loadout) => {
      setHand(loadout?.cardIds ?? []);
    });
  }, [battleId, playerId]);

  const myTurn = canPlayOnTurn(battle, playerId);
  const playable = battle.status === 'active' && myTurn && energy != null;

  const onPlay = useCallback(
    async (cardId: string) => {
      if (!playable || busyId || !energy) return;
      setBusyId(cardId);
      setError(null);
      const requestId = requestRef.current ?? makeEnergyRequestId();
      requestRef.current = requestId;
      try {
        const result = await playBattleCard({
          battleId,
          playerId,
          cardId,
          requestId,
          expectedStateVersion: battle.stateVersion ?? 0,
          expectedEventSeq: battle.eventSeq,
        });
        requestRef.current = null;
        setLastPlay(
          result.duplicate
            ? 'Eyni request təkrarlandı — energy yenidən çıxılmadı'
            : `${cardId} oynandı. −${result.cost} energy · ${result.usage}/${result.usageMax}`
        );
      } catch (err) {
        requestRef.current = null;
        setError(err instanceof Error ? err.message : 'Kart oynanılmadı');
      } finally {
        setBusyId(null);
      }
    },
    [battle.eventSeq, battle.stateVersion, battleId, busyId, energy, playable, playerId]
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
        {!energy
          ? 'Energy serverdən gözlənilir…'
          : battle.status !== 'active'
            ? 'Battle aktiv olanda kart oynana bilər.'
            : myTurn
              ? 'Sənin növbəndir. Cost, usage və cooldown serverdə yoxlanır.'
              : `Növbə: ${battle.turnPlayerId ?? '—'}`}
      </p>

      {battle.status === 'active' && hand.length > 0 ? (
        <div className={styles.energyHand}>
          {hand.map((cardId) => {
            const meta = BATTLE_LOADOUT_CARD_METAS.find((item) => item.id === cardId);
            const cost = officialCardEnergyCost(cardId);
            const used = cardUsageCount(energy?.cardUsage ?? {}, cardId);
            const readyAt = energy?.cardCooldownUntil[cardId] ?? 0;
            const cooling = readyAt > now;
            const lacking = energy != null && energy.energy < cost;
            const maxed = used >= BATTLE_CARD_MAX_USES;
            const blocked = !playable || maxed || cooling || lacking || Boolean(busyId);
            return (
              <button
                key={cardId}
                type="button"
                className={styles.energyPlayBtn}
                disabled={blocked}
                onClick={() => void onPlay(cardId)}
              >
                <span>{meta?.title ?? cardId}</span>
                <span>
                  ⚡ {cost} · {used}/{BATTLE_CARD_MAX_USES}
                  {cooling ? ` · ${Math.ceil((readyAt - now) / 1000)}s` : ''}
                </span>
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
