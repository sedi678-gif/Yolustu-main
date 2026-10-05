"use client";

import AppBottomNav from '@/app/components/AppBottomNav';
import styles from './shop.module.css';

const SECTIONS = [
  {
    id: 'frames',
    title: 'Çərçivələr',
    hint: 'Profil çərçivələri',
    tone: styles.toneFrames,
  },
  {
    id: 'vip',
    title: 'VIP Pass',
    hint: 'VIP abunə',
    tone: styles.toneVip,
  },
  {
    id: 'vip-plus',
    title: 'VIP Pass Plus',
    hint: 'VIP Plus abunə',
    tone: styles.toneVipPlus,
  },
] as const;

export default function ShopPageClient() {
  return (
    <div className={styles.shopWorld}>
      <header className={styles.shopBar}>
        <p className={styles.eyebrow}>Neon Bazar</p>
        <h1 className={styles.shopTitle}>Mağaza</h1>
      </header>

      <div className={styles.shopContent}>
        {SECTIONS.map((section) => (
          <section key={section.id} className={`${styles.frame} ${section.tone}`} aria-labelledby={`${section.id}-title`}>
            <div className={styles.frameHead}>
              <h2 id={`${section.id}-title`} className={styles.frameTitle}>
                {section.title}
              </h2>
              <p className={styles.frameHint}>{section.hint}</p>
            </div>
            <div className={styles.frameBody} />
          </section>
        ))}
      </div>

      <AppBottomNav activeTab="shop" />
    </div>
  );
}
