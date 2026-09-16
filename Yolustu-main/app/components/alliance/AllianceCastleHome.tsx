"use client";

import React, { useRef } from 'react';
import { useAllianceBrain } from './AllianceBrainContext';
import CastlePeasantPatrol from './CastlePeasantPatrol';
import styles from './alliance.module.css';

const CASTLE_BG_PORTRAIT = '/images/alliance-castle-live.png';
const CASTLE_BG_LANDSCAPE = '/images/alliance-castle-hub-main.png';

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
      <picture>
        <source media="(orientation: landscape)" srcSet={CASTLE_BG_LANDSCAPE} />
        <img
          ref={imgRef}
          src={CASTLE_BG_PORTRAIT}
          alt=""
          className={styles.castleStaticImg}
          draggable={false}
        />
      </picture>
      <CastlePeasantPatrol containerRef={wrapRef} imageRef={imgRef} />
    </div>
  );
}
