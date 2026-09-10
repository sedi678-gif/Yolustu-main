"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { getLocalProfileUserId } from '@/app/lib/userId';
import {
  listenUserSettings,
  saveUserSettings,
  getCachedSettings,
} from '@/app/lib/settingsService';
import { AppLanguage, DEFAULT_SETTINGS, UserSettings } from '@/app/lib/settingsTypes';

interface SettingsContextType {
  settings: UserSettings | null;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  updateSettings: (patch: Partial<Omit<UserSettings, 'userId'>>) => Promise<void>;
  ready: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useUser();
  const resolvedId =
    userId !== 'anonim_user_id' ? userId : getLocalProfileUserId() || '';

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const effectiveId = resolvedId || 'guest';

    if (!resolvedId) {
      const guestDefaults = getCachedSettings('guest') || DEFAULT_SETTINGS('guest');
      setSettings(guestDefaults);
      setReady(true);
      return;
    }

    const cached = getCachedSettings(resolvedId);
    if (cached) {
      setSettings(cached);
      setReady(true);
    }

    const unsub = listenUserSettings(resolvedId, (s) => {
      setSettings(s);
      setReady(true);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = s.language;
      }
    });

    return unsub;
  }, [resolvedId]);

  const updateSettings = useCallback(
    async (patch: Partial<Omit<UserSettings, 'userId'>>) => {
      const effectiveId = resolvedId || 'guest';
      setSettings((prev) => {
        const base = prev || getCachedSettings(effectiveId) || DEFAULT_SETTINGS(effectiveId);
        const next = { ...base, ...patch, updatedAt: Date.now() } as UserSettings;
        if (typeof window !== 'undefined') {
          localStorage.setItem(`yolustu_user_settings_v1_${effectiveId}`, JSON.stringify(next));
        }
        return next;
      });

      if (!resolvedId) return;
      void saveUserSettings(resolvedId, patch);
    },
    [resolvedId]
  );

  const setLanguage = useCallback(
    (lang: AppLanguage) => {
      void updateSettings({ language: lang });
    },
    [updateSettings]
  );

  const language = settings?.language ?? DEFAULT_SETTINGS(resolvedId || 'guest').language;

  return (
    <SettingsContext.Provider value={{ settings, language, setLanguage, updateSettings, ready }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
