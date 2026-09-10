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
import { ClickRaidMapEngine, type ClickRaidMapSlot } from './ClickRaidMapEngine';
import { ClickRaidThreeGltfEngine } from './ClickRaidThreeGltfEngine';
import type { IClickRaidMapEngine } from './clickRaidMapEngineTypes';
import { preloadAllClickRaidAssets } from './clickRaidAssetLoader';
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

/** Hədəf qala koordinatının ətrafında dairəvi offset — yol boyunca hərəkət yoxdur */
function computeDefenderAnchorPos(
  map: LeafletMap,
  attack: AllianceAttack,
  indexAtDefender: number,
  totalAtDefender: number
): { x: number; y: number; rotationY: number } | null {
  const defLat = attack.defenderLat;
  const defLng = attack.defenderLng;
  if (typeof defLat !== 'number' || typeof defLng !== 'number') return null;

  const center = map.latLngToContainerPoint([defLat, defLng]);
  const angle = (2 * Math.PI * indexAtDefender) / Math.max(1, totalAtDefender);
  const radius = 44 + Math.min(24, totalAtDefender * 4);
  const offsetX = Math.cos(angle) * radius;
  const offsetY = Math.sin(angle) * radius * 0.5;

  return {
    x: center.x + offsetX,
    y: center.y + offsetY,
    rotationY: angle + Math.PI,
  };
}

function groupRaidsByDefender(raids: AllianceAttack[]): Map<string, AllianceAttack[]> {
  const groups = new Map<string, AllianceAttack[]>();
  for (const raid of raids) {
    const list = groups.get(raid.defenderAllianceId) ?? [];
    list.push(raid);
    groups.set(raid.defenderAllianceId, list);
  }
  return groups;
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
  const [phases, setPhases] = useState<Record<string, RaidPhase>>({});
  const [scoreFlashes, setScoreFlashes] = useState<Record<string, number>>({});
  const [frame, setFrame] = useState(0);

  const enrichedAttacks = useMemo(
    () => enrichAttacksWithCoords(attacks, alliances),
    [attacks, alliances]
  );

  const activeRaids = useMemo(
    () => getActiveClickRaids(enrichedAttacks),
    [enrichedAttacks]
  );

  const visibleRaids = useMemo(() => {
    return activeRaids.filter((a) => (phases[a.id] ?? 'run') !== 'done');
  }, [activeRaids, phases]);

  useEffect(() => {
    void preloadAllClickRaidAssets();
  }, []);

  useEffect(() => {
    if (!mapReady || !canvasRef.current || !map) return;

    const canvas = canvasRef.current;
    const parent = canvas.parentElement;
    if (!parent) return;

    let activeEngine: IClickRaidMapEngine | null = null;
    let cancelled = false;

    void (async () => {
      const pixiEngine = new ClickRaidMapEngine(canvas);
      let ok = await pixiEngine.init();
      if (cancelled) {
        pixiEngine.stop();
        return;
      }
      if (ok) {
        activeEngine = pixiEngine;
      } else {
        pixiEngine.stop();
        const threeEngine = new ClickRaidThreeGltfEngine(canvas);
        ok = await threeEngine.init();
        if (cancelled) {
          threeEngine.stop();
          return;
        }
        if (ok) {
          activeEngine = threeEngine;
          console.info('[ClickRaidMap] Three.js glTF engine (Pixi3D ehtiyat)');
        } else {
          threeEngine.stop();
          console.warn('[ClickRaidMap] 3D yüklənmədi — public/models/*.gltf');
          return;
        }
      }
      engineRef.current = activeEngine;
      activeEngine.resize(parent.clientWidth, parent.clientHeight);
      activeEngine.start();
      setEngineReady(true);
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
    const timer = window.setInterval(() => setFrame((n) => n + 1), 100);
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

    const defenderGroups = groupRaidsByDefender(visibleRaids);
    const slots: ClickRaidMapSlot[] = [];

    for (const raids of defenderGroups.values()) {
      raids.forEach((attack, indexAtDefender) => {
        if (!isClickRaidCard(attack.cardId)) return;
        const pos = computeDefenderAnchorPos(
          map,
          attack,
          indexAtDefender,
          raids.length
        );
        if (!pos) return;

        const phase = phases[attack.id] ?? 'run';
        slots.push({
          attackId: attack.id,
          cardId: attack.cardId,
          screenX: pos.x,
          screenY: pos.y,
          rotationY: pos.rotationY,
          mode: phase === 'death' ? 'death' : phase === 'attack' ? 'attack' : 'run',
        });
      });
    }

    engine.syncRaids(slots);
  }, [map, visibleRaids, phases, frame, engineReady]);

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
    }, defeated ? 1200 : 1800);
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

      if (clicksLeft <= 0 && status === 'active') {
        void resolveRaid(attack, true);
        continue;
      }
      if (Date.now() >= endsAt && status === 'active') {
        void resolveRaid(attack, false);
      }
    }
  }, [activeRaids, alliances, resolveRaid, frame]);

  useEffect(() => {
    for (const attack of enrichedAttacks) {
      const status = readRaidStatus(attack);
      if (status === 'killed') setPhases((p) => ({ ...p, [attack.id]: 'death' }));
      if (status === 'hit') {
        setPhases((p) => ({ ...p, [attack.id]: 'attack' }));
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
      if (!attack || readRaidStatus(attack) !== 'active') return;
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

  const defenderGroups = groupRaidsByDefender(visibleRaids);

  if (!mapReady) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        className={styles.clickRaidMapLayer}
        aria-hidden={visibleRaids.length === 0}
      />
      {map &&
        Array.from(defenderGroups.entries()).flatMap(([, raids]) =>
          raids.map((attack, indexAtDefender) => {
            if (!isClickRaidCard(attack.cardId)) return null;

            const pos = computeDefenderAnchorPos(
              map,
              attack,
              indexAtDefender,
              raids.length
            );
            if (!pos) return null;

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
            const phase = phases[attack.id] ?? 'run';
            const isDefender = myAllianceId === attack.defenderAllianceId;
            const flash = scoreFlashes[attack.id];

            return (
              <div
                key={attack.id}
                className={styles.clickRaidHud}
                style={{ left: pos.x, top: pos.y - 78 }}
              >
                <div className={styles.clickRaidHudTitle}>
                  {cfg.emoji} {timeLeft}s
                </div>
                <div className={styles.clickRaidHpTrack}>
                  <div className={styles.clickRaidHpFill} style={{ width: `${hpPct}%` }} />
                </div>
                <div className={styles.clickRaidHudMeta}>
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
                  <div className={styles.clickRaidClickHint}>3D modele kliklə!</div>
                )}
              </div>
            );
          })
        )}
    </>
  );
}
