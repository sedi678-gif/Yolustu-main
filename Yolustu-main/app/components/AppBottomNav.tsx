"use client";

import { useAppStrings } from '@/app/lib/useAppStrings';
import AppLink from '@/app/components/AppLink';
import styles from './AppBottomNav.module.css';

export type AppNavTab = 'profile' | 'shop' | 'explore' | 'messages' | 'alliance';

const Icons = {
  Profile: ({ active }: { active?: boolean }) => (
    <svg className={styles.navIcon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#6366f1' : 'var(--nav-text, #64748b)'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Shop: ({ active }: { active?: boolean }) => (
    <svg className={styles.navIcon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#6366f1' : 'var(--nav-text, #64748b)'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
  Explore: () => (
    <svg className={styles.navIcon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Messages: ({ active }: { active?: boolean }) => (
    <svg className={styles.navIcon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#6366f1' : 'var(--nav-text, #64748b)'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  Alliance: ({ active }: { active?: boolean }) => (
    <svg className={styles.navIcon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#6366f1' : 'var(--nav-text, #64748b)'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
};

interface AppBottomNavProps {
  activeTab: AppNavTab;
}

export default function AppBottomNav({ activeTab }: AppBottomNavProps) {
  const t = useAppStrings();

  return (
    <nav className={styles.bottomNav} aria-label="Əsas naviqasiya">
      <AppLink href="/profile" className={styles.navItem} title={t.nav.profile}>
        <Icons.Profile active={activeTab === 'profile'} />
        <span className={`${styles.navLabel} ${activeTab === 'profile' ? styles.navLabelActive : ''}`}>{t.nav.profile}</span>
      </AppLink>
      <AppLink href="/shop" className={styles.navItem} title={t.nav.shop}>
        <Icons.Shop active={activeTab === 'shop'} />
        <span className={`${styles.navLabel} ${activeTab === 'shop' ? styles.navLabelActive : ''}`}>{t.nav.shop}</span>
      </AppLink>
      <AppLink href="/explore" className={styles.navItemCenter} title={t.nav.explore}>
        <Icons.Explore />
      </AppLink>
      <AppLink href="/messages" className={styles.navItem} title={t.nav.messages}>
        <Icons.Messages active={activeTab === 'messages'} />
        <span className={`${styles.navLabel} ${activeTab === 'messages' ? styles.navLabelActive : ''}`}>{t.nav.messages}</span>
      </AppLink>
      <AppLink href="/alliance" className={styles.navItem} title={t.nav.alliance}>
        <Icons.Alliance active={activeTab === 'alliance'} />
        <span className={`${styles.navLabel} ${activeTab === 'alliance' ? styles.navLabelActive : ''}`}>{t.nav.alliance}</span>
      </AppLink>
    </nav>
  );
}
