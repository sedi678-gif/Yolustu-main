'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import type { AllianceAttack } from '@/app/lib/allianceBattleService';
import {
  enrichAttacksWithCoords,
  finalizeClickRaid,
  mergeAttackLists,
  registerClickRaidClick,
} from '@/app/lib/allianceBattleService';
import {
  computeClickRaidClicksRequired,
  computeClickRaidDamage,
  getActiveClickRaids,
  getClickRaidConfig,
  isClickRaidCard,
  readRaidClicksRemaining,
  readRaidClicksRequired,
  readRaidDamage,
  readRaidEndsAt,
  readRaidStatus,
  type ClickRaidCardId,
} from '@/app/lib/clickRaidLogic';
import { useAllianceBrain } from '../AllianceBrainContext';
import { MixamoFbxRaidEngine } from './MixamoFbxRaidEngine';
import type { ClickRaidMapSlot, IClickRaidMapEngine } from './clickRaidMapEngineTypes';
import { computeRaidHeroMotion, raidUnitCount } from './clickRaidMapMotion';
import styles from '../alliance.module.css';

interface ClickRaidMapLayerProps {
  map: LeafletMap | null;
  mapReady: boolean;
  attacks: AllianceAttack[];
  alliances: {
    id: string;
    members?: string[];
    name?: string;
    score?: number;
    lat?: number;
    lng?: number;
    region?: string;
  }[];
  userId?: string;
  myAllianceId?: string | null;
}

type RaidPhase = 'run' | 'death' | 'attack' | 'done';

interface LiveHeroUnit {
  slotId: string;
  attack: AllianceAttack;
  unitIndex: number;
  ringIndex: number;
  ringTotal: number;
}

function castlePoint(map: LeafletMap, attack: AllianceAttack) {
  const defLat = attack.defenderLat;
  const defLng = attack.defenderLng;
  if (typeof defLat !== 'number' || typeof defLng !== 'number') return null;
  return map.latLngToContainerPoint([defLat, defLng]);
}

function collectHeroUnits(raids: AllianceAttack[]): LiveHeroUnit[] {
  const byCastle = new Map<string, AllianceAttack[]>();
  for (const raid of raids) {
    const key = raid.defenderAllianceId || raid.id;
    const list = byCastle.get(key) ?? [];
    list.push(raid);
    byCastle.set(key, list);
  }

  const units: LiveHeroUnit[] = [];
  for (const group of byCastle.values()) {
    const expanded: { attack: AllianceAttack; unitIndex: number }[] = [];
    for (const attack of group) {
      const count = raidUnitCount(attack.cardCount);
      for (let i = 0; i < count; i++) {
        expanded.push({ attack, unitIndex: i });
      }
    }
    expanded.forEach((item, ringIndex) => {
      units.push({
        slotId: `${item.attack.id}#${item.unitIndex}`,
        attack: item.attack,
        unitIndex: item.unitIndex,
        ringIndex,
        ringTotal: expanded.length,
      });
    });
  }
  return units;
}

export default function ClickRaidMapLayer({
  map,
  mapReady,
  attacks,
  alliances,
  userId,
  myAllianceId,
}: ClickRaidMapLayerProps) {
  const brain = useAllianceBrain();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<IClickRaidMapEngine | null>(null);
  const finalizedRef = useRef<Set<string>>(new Set());
  const [engineReady, setEngineReady] = useState(false);
  const [phases, setPhases] = useState<Record<string, RaidPhase>>({});
  const [scoreFlashes, setScoreFlashes] = useState<Record<string, number>>({});
  const [nowMs, setNowMs] = useState(0);

  const mergedAttacks = useMemo(
    () => mergeAttackLists(attacks, brain.liveBattleAttacks),
    [attacks, brain.liveBattleAttacks]
  );

  const enrichedAttacks = useMemo(
    () => enrichAttacksWithCoords(mergedAttacks, alliances),
    [mergedAttacks, alliances]
  );

  const uid = userId ?? brain.userId;
  const myId = myAllianceId ?? brain.activeAlliance?.id ?? null;

  const activeRaids = useMemo(
    () => getActiveClickRaids(enrichedAttacks),
    [enrichedAttacks, nowMs]
  );

  const visibleRaids = useMemo(() => {
    return enrichedAttacks.filter((a) => {
      if (!isClickRaidCard(a.cardId)) return false;
      const phase = phases[a.id];
      if (phase === 'done') return false;
      if (phase === 'death') {
        const endsAt = readRaidEndsAt(a);
        return nowMs - Math.max(endsAt, a.createdAt) < 4000;
      }
      return getActiveClickRaids([a]).length > 0 || phase === 'attack';
    });
  }, [enrichedAttacks, phases, nowMs]);

  const heroUnits = useMemo(() => collectHeroUnits(visibleRaids), [visibleRaids]);

  useEffect(() => {
    if (!mapReady || !canvasRef.current || !map) return;
    const canvas = canvasRef.current;
    const parent = canvas.parentElement;
    if (!parent) return;

    let activeEngine: IClickRaidMapEngine | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const engine = new MixamoFbxRaidEngine(canvas);
        const ok = await engine.init();
        if (cancelled) {
          engine.stop();
          return;
        }
        if (!ok) {
          engine.stop();
          return;
        }
        activeEngine = engine;
        engineRef.current = engine;
        engine.resize(parent.clientWidth, parent.clientHeight);
        engine.start();
        setEngineReady(true);
      } catch (err) {
        console.error('[ClickRaid] FBX mühərrik açılmadı.', err);
      }
    })();

    const onResize = () => engineRef.current?.resize(parent.clientWidth, parent.clientHeight);
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
      activeEngine?.stop();
      engineRef.current = null;
      setEngineReady(false);
    };
  }, [map, mapReady]);

  useEffect(() => {
    if (!map) return;
    const bump = () => setNowMs(Date.now());
    map.on('move zoom resize viewreset', bump);
    window.addEventListener('resize', bump);
    return () => {
      map.off('move zoom resize viewreset', bump);
      window.removeEventListener('resize', bump);
    };
  }, [map]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!map || !engine || !engineReady) return;
    const parent = canvasRef.current?.parentElement;
    if (parent) engine.resize(parent.clientWidth, parent.clientHeight);

    const slots: ClickRaidMapSlot[] = [];
    for (const unit of heroUnits) {
      const castle = castlePoint(map, unit.attack);
      if (!castle || !isClickRaidCard(unit.attack.cardId)) continue;
      const phase = phases[unit.attack.id] ?? 'attack';
      if (phase === 'done') continue;
      const motion = computeRaidHeroMotion(castle.x, castle.y, unit.ringIndex, unit.ringTotal);
      slots.push({
        slotId: unit.slotId,
        attackId: unit.attack.id,
        cardId: unit.attack.cardId,
        castleX: castle.x,
        castleY: castle.y,
        ringIndex: unit.ringIndex,
        ringTotal: unit.ringTotal,
        spawnedAt: unit.attack.createdAt,
        mode: phase === 'death' ? 'death' : 'attack',
        screenX: motion.x,
        screenY: motion.y,
        rotationY: motion.rotationY,
      });
    }
    engine.syncRaids(slots);
  }, [map, heroUnits, phases, nowMs, engineReady]);

  const resolveRaid = useCallback(async (attack: AllianceAttack, defeated: boolean) => {
    if (finalizedRef.current.has(attack.id)) return;
    finalizedRef.current.add(attack.id);
    const engine = engineRef.current;
    if (defeated) {
      engine?.playDeath(attack.id);
      setPhases((p) => ({ ...p, [attack.id]: 'death' }));
    } else {
      setPhases((p) => ({ ...p, [attack.id]: 'attack' }));
      setScoreFlashes((f) => ({ ...f, [attack.id]: readRaidDamage(attack) }));
    }
    try {
      await finalizeClickRaid(attack.id, defeated);
    } catch (err) {
      console.warn('[ClickRaidMap] finalize:', err);
    }
    window.setTimeout(() => {
      setPhases((p) => ({ ...p, [attack.id]: 'done' }));
      setScoreFlashes((f) => {
        const next = { ...f };
        delete next[attack.id];
        return next;
      });
    }, defeated ? 1400 : 400);
  }, []);

  const tickStateRef = useRef({ activeRaids, enrichedAttacks, alliances, resolveRaid });
  tickStateRef.current = { activeRaids, enrichedAttacks, alliances, resolveRaid };

  useEffect(() => {
    if (!mapReady) return;
    const timer = window.setInterval(() => {
      const t = Date.now();
      setNowMs(t);
      const snap = tickStateRef.current;
      for (const attack of snap.activeRaids) {
        const status = readRaidStatus(attack);
        if (status === 'killed' || status === 'hit') continue;
        const memberCount =
          snap.alliances.find((a) => a.id === attack.defenderAllianceId)?.members?.length ??
          attack.defenderMemberCount ??
          1;
        const cardId = attack.cardId as ClickRaidCardId;
        const maxClicks =
          readRaidClicksRequired(attack) ?? computeClickRaidClicksRequired(cardId, memberCount);
        const clicksLeft = readRaidClicksRemaining(attack) ?? maxClicks;
        const endsAt = readRaidEndsAt(attack);
        if (clicksLeft <= 0) {
          void snap.resolveRaid(attack, true);
          continue;
        }
        if (endsAt && t >= endsAt) void snap.resolveRaid(attack, false);
      }
    }, 80);
    return () => window.clearInterval(timer);
  }, [mapReady]);

  const tryRaidHitClick = useCallback(
    (clientX: number, clientY: number) => {
      const engine = engineRef.current;
      if (!engine || !uid) return;
      const attackId = engine.hitTest(clientX, clientY);
      if (!attackId) return;
      const attack = activeRaids.find((a) => a.id === attackId);
      if (!attack || readRaidStatus(attack) === 'killed' || readRaidStatus(attack) === 'hit') return;
      if (myId !== attack.defenderAllianceId) return;
      void registerClickRaidClick(attackId, uid).catch((err) =>
        console.warn('[ClickRaidMap] click:', err)
      );
    },
    [activeRaids, myId, uid]
  );

  useEffect(() => {
    if (!map) return;
    const onMapClick = (ev: { originalEvent: MouseEvent }) => {
      tryRaidHitClick(ev.originalEvent.clientX, ev.originalEvent.clientY);
    };
    map.on('click', onMapClick);
    return () => {
      map.off('click', onMapClick);
    };
  }, [map, tryRaidHitClick]);

  const hudByAttack = useMemo(() => {
    const first = new Map<string, LiveHeroUnit>();
    for (const unit of heroUnits) {
      if (!first.has(unit.attack.id)) first.set(unit.attack.id, unit);
    }
    return [...first.values()];
  }, [heroUnits]);

  if (!mapReady) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        className={styles.clickRaidMapLayer}
        aria-hidden={visibleRaids.length === 0}
      />
      {map &&
        hudByAttack.map((unit) => {
          const attack = unit.attack;
          if (!isClickRaidCard(attack.cardId)) return null;
          const castle = castlePoint(map, attack);
          if (!castle) return null;
          const phase = phases[attack.id] ?? 'attack';
          const pos = computeRaidHeroMotion(castle.x, castle.y, unit.ringIndex, unit.ringTotal);
          const cfg = getClickRaidConfig(attack.cardId);
          const memberCount =
            alliances.find((a) => a.id === attack.defenderAllianceId)?.members?.length ??
            attack.defenderMemberCount ??
            1;
          const maxClicks =
            readRaidClicksRequired(attack) ??
            computeClickRaidClicksRequired(attack.cardId, memberCount);
          const clicksLeft = readRaidClicksRemaining(attack) ?? maxClicks;
          const raidAmount =
            readRaidDamage(attack) || computeClickRaidDamage(attack.cardId, memberCount);
          const endsAt = readRaidEndsAt(attack);
          const timeLeft = Math.max(0, Math.ceil((endsAt - nowMs) / 1000));
          const hpPct = maxClicks > 0 ? (clicksLeft / maxClicks) * 100 : 0;
          const isDefender = myId === attack.defenderAllianceId;
          const flash = scoreFlashes[attack.id];
          const units = raidUnitCount(attack.cardCount);

          return (
            <div
              key={attack.id}
              className={styles.clickRaidHud}
              style={{ left: pos.x, top: pos.y - 78 }}
            >
              <div className={styles.clickRaidHudTitle}>
                {cfg.emoji} {cfg.label} · {timeLeft}s
              </div>
              <div className={styles.clickRaidHpTrack}>
                <div className={styles.clickRaidHpFill} style={{ width: `${hpPct}%` }} />
              </div>
              <div className={styles.clickRaidHudMeta}>
                {units > 1 ? `${units} qəhrəman · ` : null}
                {isDefender ? (
                  <>
                    Klik: <strong>{clicksLeft}</strong>/{maxClicks}
                  </>
                ) : (
                  <span>{attack.defenderAllianceName}</span>
                )}
              </div>
              {flash !== undefined && phase === 'attack' && (
                <div className={styles.clickRaidFlash}>
                  {cfg.mode === 'steal' ? (
                    <>-{flash} → +{flash}</>
                  ) : (
                    <>-{flash} xal</>
                  )}
                </div>
              )}
              {!isDefender && (
                <div className={styles.clickRaidHudHint}>
                  {cfg.mode === 'steal' ? `Oğurluq: ${raidAmount}` : `Zərər: ${raidAmount}`}
                </div>
              )}
              {isDefender && phase !== 'death' && phase !== 'done' && (
                <div className={styles.clickRaidClickHint}>Hücum edən 3D modelə kliklə!</div>
              )}
            </div>
          );
        })}
    </>
  );
}
