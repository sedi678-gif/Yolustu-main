"use client";

import React, { useEffect } from 'react';
import styles from './alliance.module.css';

interface AllianceMapSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  children: React.ReactNode;
}

export default function AllianceMapSheet({
  open,
  onClose,
  title,
  icon,
  children,
}: AllianceMapSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.mapSheetOverlay} onClick={onClose} role="presentation">
      <div
        className={`${styles.mapSheetPage} ${styles.glass}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.mapSheetHeader}>
          <span>
            {icon ? `${icon} ` : ''}
            {title}
          </span>
          <button type="button" className={styles.searchModalClose} onClick={onClose} aria-label="Bağla">
            ✕
          </button>
        </div>
        <div className={styles.mapSheetBody}>{children}</div>
      </div>
    </div>
  );
}
