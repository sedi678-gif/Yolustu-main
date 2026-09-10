"use client";

import React, { useRef } from 'react';
import { useAllianceBrain } from './AllianceBrainContext';
import CastlePeasantPatrol from './CastlePeasantPatrol';
import styles from './alliance.module.css';

const CASTLE_BG = '/images/alliance-castle-hub-main.png';

export default function AllianceCastleHome() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const { hubVisuals } = useAllianceBrain();

  return (
    <div
      ref={wrapRef}
      className={styles.castlePixiWrap}
      aria-label={`${hubVisuals.allianceName} qala`}
    >
      <img
        ref={imgRef}
        src={CASTLE_BG}
        alt=""
        className={styles.castleStaticImg}
        draggable={false}
      />
      <CastlePeasantPatrol containerRef={wrapRef} imageRef={imgRef} />
    </div>
  );
}
