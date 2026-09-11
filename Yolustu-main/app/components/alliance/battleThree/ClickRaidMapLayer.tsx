'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import type { AllianceAttack } from '@/app/lib/allianceBattleService';
import {
  enrichAttacksWithCoords,
  finalizeClickRaid,
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
import { ClickRaidThreeGltfEngine } from './ClickRaidThreeGltfEngine';
import type { ClickRaidMapSlot, IClickRaidMapEngine } from './clickRaidMapEngineTypes';
import {
  computeRaidHeroMotion,
  orbitSpeedForCard,
  raidUnitCount,
} from './clickRaidMapMotion';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<IClickRaidMapEngine | null>(null);
  const finalizedRef = useRef<Set<string>>(new Set());
  const [engineReady, setEngineReady] = useState(false);
  const [engineFailed, setEngineFailed] = useState(false);
  const [phases, setPhases] = useState<Record<string, RaidPhase>>({});
  const [scoreFlashes, setScoreFlashes] = useState<Record<string, number>>({});
  const [frame, setFrame] = useState(0);

  const enrichedAttacks = useMemo(
    () => enrichAttacksWithCoords(attacks, alliances),
    [attacks, alliances]
  );

  const activeRaids = useMemo(
    () => getActiveClickRaids(enrichedAttacks),
    [enrichedAttacks, frame]
  );

  const visibleRaids = useMemo(() => {
    const now = Date.now();
    return enrichedAttacks.filter((a) => {
      if (!isClickRaidCard(a.cardId)) return false;
      const phase = phases[a.id];
      if (phase === 'done') return false;
      if (phase === 'death' || phase === 'attack') {
        const endsAt = readRaidEndsAt(a);
        return now - Math.max(endsAt, a.createdAt) < 4000;
      }
      return getActiveClickRaids([a]).length > 0;
    });
  }, [enrichedAttacks, phases]);

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
        const engine = new ClickRaidThreeGltfEngine(canvas);
        const ok = await engine.init();
        if (cancelled) {
          engine.stop();
          return;
        }
        if (!ok) {
          engine.stop();
          setEngineFailed(true);
          return;
        }
        activeEngine = engine;
        engineRef.current = engine;
        engine.resize(parent.clientWidth, parent.clientHeight);
        engine.start();
        setEngineReady(true);
      } catch (err) {
        console.warn('[ClickRaidMap] 3D mühərrik açılmadı:', err);
        if (!cancelled) setEngineFailed(true);
      }
    })();

    const onResize = () =>
      engineRef.current?.resize(parent.clientWidth, parent.clientHeight);
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
    if (!mapReady) return;
    const timer = window.setInterval(() => setFrame((n) => n + 1), 80);
    return () => window.clearInterval(timer);
  }, [mapReady]);

  useEffect(() => {
    if (!map) return;
    const bump = () => setFrame((n) => n + 1);
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

    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (parent) engine.resize(parent.clientWidth, parent.clientHeight);

    const now = Date.now();
    const slots: ClickRaidMapSlot[] = [];

    for (const unit of heroUnits) {
      const castle = castlePoint(map, unit.attack);
      if (!castle) continue;
      if (!isClickRaidCard(unit.attack.cardId)) continue;

      const phase = phases[unit.attack.id] ?? 'run';
      const mode = phase === 'death' ? 'death' : phase === 'attack' ? 'attack' : 'run';
      const motion = computeRaidHeroMotion(
        castle.x,
        castle.y,
        unit.ringIndex,
        unit.ringTotal,
        unit.attack.createdAt,
        now,
        orbitSpeedForCard(unit.attack.cardId),
        mode
      );

      slots.push({
        slotId: unit.slotId,
        attackId: unit.attack.id,
        cardId: unit.attack.cardId,
        castleX: castle.x,
        castleY: castle.y,
        ringIndex: unit.ringIndex,
        ringTotal: unit.ringTotal,
        spawnedAt: unit.attack.createdAt,
        orbitSpeed: orbitSpeedForCard(unit.attack.cardId),
        mode,
        screenX: motion.x,
        screenY: motion.y,
        rotationY: motion.rotationY,
      });
    }

    engine.syncRaids(slots);
  }, [map, heroUnits, phases, frame, engineReady]);

  const resolveRaid = useCallback(async (attack: AllianceAttack, defeated: boolean) => {
    if (finalizedRef.current.has(attack.id)) return;
    finalizedRef.current.add(attack.id);

    const engine = engineRef.current;
    if (defeated) {
      engine?.playDeath(attack.id);
      setPhases((p) => ({ ...p, [attack.id]: 'death' }));
    } else {
      engine?.playAttack(attack.id);
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
    }, defeated ? 1400 : 2000);
  }, []);

  useEffect(() => {
    for (const attack of activeRaids) {
      const status = readRaidStatus(attack);
      if (status === 'killed' || status === 'hit') continue;

      const memberCount =
        alliances.find((a) => a.id === attack.defenderAllianceId)?.members?.length ??
        attack.defenderMemberCount ??
        1;
      const cardId = attack.cardId as ClickRaidCardId;
      const maxClicks =
        readRaidClicksRequired(attack) ?? computeClickRaidClicksRequired(cardId, memberCount);
      const clicksLeft = readRaidClicksRemaining(attack) ?? maxClicks;
      const endsAt = readRaidEndsAt(attack);

      if (clicksLeft <= 0) {
        void resolveRaid(attack, true);
        continue;
      }
      if (endsAt && Date.now() >= endsAt) {
        void resolveRaid(attack, false);
      }
    }
  }, [activeRaids, alliances, resolveRaid, frame]);

  useEffect(() => {
    const now = Date.now();
    for (const attack of enrichedAttacks) {
      const status = readRaidStatus(attack);
      const endsAt = readRaidEndsAt(attack);
      const justEnded = now - endsAt < 2500 && endsAt > 0;
      if (!justEnded) continue;
      if (status === 'killed') {
        setPhases((p) => (p[attack.id] === 'death' || p[attack.id] === 'done' ? p : { ...p, [attack.id]: 'death' }));
      }
      if (status === 'hit') {
        setPhases((p) => (p[attack.id] === 'attack' || p[attack.id] === 'done' ? p : { ...p, [attack.id]: 'attack' }));
        setScoreFlashes((f) => ({ ...f, [attack.id]: readRaidDamage(attack) }));
      }
    }
  }, [enrichedAttacks]);

  const tryRaidHitClick = useCallback(
    (clientX: number, clientY: number) => {
      const engine = engineRef.current;
      if (!engine || !userId) return;

      const attackId = engine.hitTest(clientX, clientY);
      if (!attackId) return;

      const attack = activeRaids.find((a) => a.id === attackId);
      if (!attack || readRaidStatus(attack) === 'killed' || readRaidStatus(attack) === 'hit') return;
      if (myAllianceId !== attack.defenderAllianceId) return;

      void registerClickRaidClick(attackId, userId).catch((err) =>
        console.warn('[ClickRaidMap] click:', err)
      );
    },
    [activeRaids, myAllianceId, userId]
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

  const now = Date.now();

  return (
    <>
      <canvas
        ref={canvasRef}
        className={styles.clickRaidMapLayer}
        aria-hidden={visibleRaids.length === 0}
      />
      {engineFailed &&
        map &&
        heroUnits.map((unit) => {
          const castle = castlePoint(map, unit.attack);
          if (!castle || !isClickRaidCard(unit.attack.cardId)) return null;
          const phase = phases[unit.attack.id] ?? 'run';
          const mode = phase === 'death' ? 'death' : phase === 'attack' ? 'attack' : 'run';
          const pos = computeRaidHeroMotion(
            castle.x,
            castle.y,
            unit.ringIndex,
            unit.ringTotal,
            unit.attack.createdAt,
            now,
            orbitSpeedForCard(unit.attack.cardId),
            mode
          );
          const cfg = getClickRaidConfig(unit.attack.cardId);
          return (
            <div
              key={unit.slotId}
              className={`${styles.clickRaidUnit} ${styles.clickRaidUnitRun}`}
              style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -90%)' }}
            >
              <div className={styles.clickRaidUnitSprite}>
                <span className={styles.clickRaidUnitEmoji}>{cfg.emoji}</span>
              </div>
            </div>
          );
        })}
      {map &&
        hudByAttack.map((unit) => {
          const attack = unit.attack;
          if (!isClickRaidCard(attack.cardId)) return null;
          const castle = castlePoint(map, attack);
          if (!castle) return null;

          const phase = phases[attack.id] ?? 'run';
          const mode = phase === 'death' ? 'death' : phase === 'attack' ? 'attack' : 'run';
          const pos = computeRaidHeroMotion(
            castle.x,
            castle.y,
            unit.ringIndex,
            unit.ringTotal,
            attack.createdAt,
            now,
            orbitSpeedForCard(attack.cardId),
            mode
          );

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
          const timeLeft = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
          const hpPct = maxClicks > 0 ? (clicksLeft / maxClicks) * 100 : 0;
          const isDefender = myAllianceId === attack.defenderAllianceId;
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
              {isDefender && phase === 'run' && (
                <div className={styles.clickRaidClickHint}>3D qəhrəmana kliklə!</div>
              )}
            </div>
          );
        })}
    </>
  );
}
