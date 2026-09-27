"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { IconMapAd } from './AllianceMapIcons';
import styles from './alliance.module.css';
import { useUser } from '@/context/UserContext';
import { normalizeUserPlanState, shouldShowAds } from '@/app/lib/userPlan';
import { useAllianceScreenHold } from './AllianceScreenBusy';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    showYolustuRewardedAd?: () => Promise<boolean>;
  }
}

interface GoogleAdButtonProps {
  onReward?: () => void;
  variant?: 'pill' | 'nav' | 'xp';
  label?: string;
}

/**
 * Google AdMob / AdSense inteqrasiyası üçün hazır düymə.
 * .env: NEXT_PUBLIC_GOOGLE_ADS_CLIENT, NEXT_PUBLIC_GOOGLE_ADS_SLOT
 */
export default function GoogleAdButton({ onReward, variant = 'pill', label }: GoogleAdButtonProps) {
  const { playerProfile } = useUser();
  const hideAds = !shouldShowAds(normalizeUserPlanState(playerProfile as unknown as Record<string, unknown> | null));
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  useAllianceScreenHold(open);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_ADS_CLIENT;
  const slotId = process.env.NEXT_PUBLIC_GOOGLE_ADS_SLOT;

  useEffect(() => {
    if (!open || !clientId || !slotId) return;

    const existing = document.querySelector('script[data-yolustu-ads="1"]');
    if (!existing) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
      script.crossOrigin = 'anonymous';
      script.dataset.yolustuAds = '1';
      document.head.appendChild(script);
    }

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* AdSense yüklənməyibsə placeholder qalır */
    }
  }, [open, clientId, slotId]);

  const handleWatchAd = useCallback(async () => {
    setLoading(true);
    try {
      if (typeof window.showYolustuRewardedAd === 'function') {
        const ok = await window.showYolustuRewardedAd();
        if (ok) onReward?.();
        return;
      }
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }, [onReward]);

  if (hideAds) return null;

  const btnClass =
    variant === 'nav'
      ? `${styles.epAdBtn} ${styles.epAdBtnNav}`
      : variant === 'xp'
        ? styles.mapAdXpBtn
        : styles.epAdBtn;

  const btnLabel = label ?? (variant === 'xp' ? '+500 XP' : 'REKLAM');

  return (
    <>
      <button
        type="button"
        className={btnClass}
        onClick={handleWatchAd}
        disabled={loading}
        title="Reklam izlə — Google Ads"
        aria-label={btnLabel}
      >
        <span className={styles.epAdBtnIcon}><IconMapAd /></span>
        <span>{loading ? '...' : btnLabel}</span>
      </button>

      {open && (
        <div className={styles.adModalOverlay} onClick={() => setOpen(false)}>
          <div className={styles.adModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.adModalHeader}>
              <span>📺 Google Ads</span>
              <button type="button" className={styles.epChatClose} onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>
            <p className={styles.adModalHint}>
              AdSense slot ID-ni `.env` faylına əlavə edin. Capacitor AdMob üçün `showYolustuRewardedAd` funksiyasını bağlayın.
            </p>
            {clientId && slotId ? (
              <ins
                className="adsbygoogle"
                style={{ display: 'block', minHeight: 250, width: '100%' }}
                data-ad-client={clientId}
                data-ad-slot={slotId}
                data-ad-format="auto"
                data-full-width-responsive="true"
              />
            ) : (
              <div className={styles.adPlaceholder}>
                NEXT_PUBLIC_GOOGLE_ADS_CLIENT və NEXT_PUBLIC_GOOGLE_ADS_SLOT təyin edin
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
