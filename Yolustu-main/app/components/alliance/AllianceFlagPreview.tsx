"use client";



import React from 'react';

import { AllianceFlagConfig } from './types';

import styles from './alliance.module.css';



interface AllianceFlagPreviewProps {

  flag: AllianceFlagConfig;

  size?: 'sm' | 'md' | 'lg';

}



export default function AllianceFlagPreview({ flag, size = 'md' }: AllianceFlagPreviewProps) {

  const sizeClass =

    size === 'lg' ? styles.allianceFlagPreviewLg : size === 'sm' ? styles.allianceFlagPreviewSm : '';

  const hasImage = Boolean(flag.imageUrl);



  return (

    <div

      className={`${styles.allianceFlagPreview} ${sizeClass} ${hasImage ? styles.allianceFlagPreviewImage : ''}`}

      style={

        hasImage

          ? ({ '--flag-accent': flag.accentColor } as React.CSSProperties)

          : ({

              '--flag-bg': flag.backgroundColor,

              '--flag-accent': flag.accentColor,

            } as React.CSSProperties)

      }

      data-pattern={hasImage ? undefined : flag.pattern}

      aria-hidden

    >

      {hasImage ? (

        <img src={flag.imageUrl} alt="" className={styles.allianceFlagPreviewImg} draggable={false} />

      ) : (

        <span className={styles.allianceFlagPreviewEmblem}>{flag.emblem}</span>

      )}

    </div>

  );

}

