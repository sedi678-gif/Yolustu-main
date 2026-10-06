"use client";

import { useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { titleForPath } from '@/app/lib/appI18n';
import { ensureFirebaseAuth } from '@/app/lib/firebaseAuth';
import AccountAccessGate from '@/app/components/AccountAccessGate';
import AllianceNotifyToast from '@/app/components/alliance/AllianceNotifyToast';

function resolveTheme(theme: 'dark' | 'light' | 'system'): 'dark' | 'light' {
  if (theme === 'system' && typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme === 'light' ? 'light' : 'dark';
}

function detectPlatform() {
  if (typeof window === 'undefined') return;
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isCapacitor = !!(window as unknown as { Capacitor?: unknown }).Capacitor;

  document.documentElement.classList.toggle('platform-ios', isIOS);
  document.documentElement.classList.toggle('platform-capacitor', isCapacitor);

  if (isIOS) {
    document.documentElement.style.setProperty('--app-touch-min', '44px');
  }
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { settings, language } = useSettings();

  useEffect(() => {
    detectPlatform();
    void ensureFirebaseAuth().then((user) => {
      if (!user) {
        console.warn('Firebase Anonymous Auth aktiv deyil — Console-da yandırın.');
      }
    });
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = language;
    const title = titleForPath(language, window.location.pathname);
    if (title) document.title = title;
  }, [language]);

  useEffect(() => {
    if (typeof document === 'undefined' || !settings) return;

    const resolved = resolveTheme(settings.appearance.theme);
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.style.colorScheme = resolved;
    document.body.classList.toggle('theme-light', resolved === 'light');
    document.body.classList.toggle('theme-dark', resolved === 'dark');

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolved === 'light' ? '#f1f5f9' : '#020617');
  }, [settings?.appearance.theme]);

  useEffect(() => {
    if (!settings || settings.appearance.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const resolved = mq.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', resolved);
      document.documentElement.style.colorScheme = resolved;
      document.body.classList.toggle('theme-light', resolved === 'light');
      document.body.classList.toggle('theme-dark', resolved === 'dark');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [settings?.appearance.theme]);

  return (
    <div className="appViewport">
      {children}
      <AllianceNotifyToast />
      <AccountAccessGate />
    </div>
  );
}
