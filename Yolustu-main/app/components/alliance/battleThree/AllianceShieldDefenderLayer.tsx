'use client';

import React, { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import type { AllianceAttack } from '@/app/lib/allianceBattleService';
import { BATTLE_VISUAL_MS } from '@/app/lib/allianceBattleService';
import { computeDefenderGuardCount } from '@/app/lib/battleDefenderLogic';
import { ShieldDefenderEngine } from './ShieldDefenderEngine';
import styles from '../alliance.module.css';

interface AllianceShieldDefenderLayerProps {
  map: LeafletMap | null;
  mapReady: boolean;
  alliances: { id: string; lat?: number; lng?: number; members?: string[] }[];
  attacks: AllianceAttack[];
}

export default function AllianceShieldDefenderLayer({
  map,
  mapReady,
  alliances,
  attacks,
}: AllianceShieldDefenderLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ShieldDefenderEngine | null>(null);
  const triggeredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!mapReady || !canvasRef.current || !map) return;

    const canvas = canvasRef.current;
    const parent = canvas.parentElement;
    if (!parent) return;

    const engine = new ShieldDefenderEngine(canvas);
    engineRef.current = engine;

    void engine.init().then(() => {
      engine.resize(parent.clientWidth, parent.clientHeight);
      engine.start();
    });

    const syncPositions = () => {
      const slots = alliances
        .filter((a) => typeof a.lat === 'number' && typeof a.lng === 'number')
        .map((a) => {
          const pt = map.latLngToContainerPoint([a.lat!, a.lng!]);
          const memberCount = a.members?.length ?? 1;
          return {
            allianceId: a.id,
            screenX: pt.x,
            screenY: pt.y,
            guardCount: computeDefenderGuardCount(memberCount),
          };
        });
      engine.syncCastles(slots);
    };

    syncPositions();
    map.on('move zoom resize viewreset', syncPositions);
    window.addEventListener('resize', syncPositions);

    return () => {
      map.off('move zoom resize viewreset', syncPositions);
      window.removeEventListener('resize', syncPositions);
      engine.stop();
      engineRef.current = null;
    };
  }, [map, mapReady, alliances]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const now = Date.now();
    for (const attack of attacks) {
      const age = now - attack.createdAt;
      if (age < 0 || age >= BATTLE_VISUAL_MS) continue;
      const key = `${attack.id}-block`;
      if (triggeredRef.current.has(key)) continue;
      if (age < 800) {
        triggeredRef.current.add(key);
        engine.triggerBlock(attack.defenderAllianceId);
      }
    }

    if (triggeredRef.current.size > 80) {
      triggeredRef.current.clear();
    }
  }, [attacks]);

  if (!mapReady) return null;

  return (
    <canvas
      ref={canvasRef}
      className={styles.defenderThreeLayer}
      aria-hidden
    />
  );
}
