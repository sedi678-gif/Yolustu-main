"use client";

import React from 'react';
import styles from './alliance.module.css';

interface AllianceMapRoundBtnProps {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  active?: boolean;
}

export default function AllianceMapRoundBtn({
  icon,
  label,
  onClick,
  disabled = false,
  title,
  active = false,
}: AllianceMapRoundBtnProps) {
  return (
    <button
      type="button"
      className={`${styles.mapRoundBtn} ${active ? styles.mapRoundBtnActive : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      aria-label={label}
    >
      <span className={styles.mapRoundBtnIcon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.mapRoundBtnLabel}>{label}</span>
    </button>
  );
}
