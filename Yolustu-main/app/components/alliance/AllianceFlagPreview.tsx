"use client";

import React from 'react';
import { AllianceFlagConfig } from './types';
import styles from './alliance.module.css';

interface AllianceFlagPreviewProps {
  flag: AllianceFlagConfig;
  size?: 'sm' | 'md' | 'lg' | 'hub';
  wave?: boolean;
}

export default function AllianceFlagPreview({ flag, size = 'md', wave = false }: AllianceFlagPreviewProps) {
  const sizeClass =
    size === 'lg'
      ? styles.allianceFlagPreviewLg
      : size === 'sm'
        ? styles.allianceFlagPreviewSm
        : size === 'hub'
          ? styles.allianceFlagPreviewHub
          : '';
  const hasImage = Boolean(flag.imageUrl);
  const shape = flag.shape ?? 'rect';

  const flagEl = (
    <div
      className={`${styles.allianceFlagPreview} ${sizeClass} ${hasImage ? styles.allianceFlagPreviewImage : ''} ${
        wave ? styles.allianceFlagPreviewWaving : ''
      }`}
      style={
        {
          '--flag-bg': flag.backgroundColor,
          '--flag-accent': flag.accentColor,
          '--flag-third': flag.thirdColor || '#f8fafc',
        } as React.CSSProperties
      }
      data-pattern={hasImage ? undefined : flag.pattern}
      data-shape={shape}
      aria-hidden
    >
      {hasImage ? (
        <img src={flag.imageUrl} alt="" className={styles.allianceFlagPreviewImg} draggable={false} />
      ) : (
        <span className={styles.allianceFlagPreviewEmblem}>{flag.emblem}</span>
      )}
      {wave ? <span className={styles.allianceFlagWaveSheen} /> : null}
    </div>
  );

  if (!wave) return flagEl;

  return <div className={styles.allianceFlagWave}>{flagEl}</div>;
}
