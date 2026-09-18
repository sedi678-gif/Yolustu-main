"use client";

import AppBottomNav from '@/app/components/AppBottomNav';
import styles from './shop.module.css';

export default function ShopPageClient() {
  return (
    <div className={styles.shopWorld}>
      <header className={styles.shopBar}>
        <h1 className={styles.shopTitle}>Mağaza</h1>
      </header>
      <div className={styles.shopContent} />
      <AppBottomNav activeTab="shop" />
    </div>
  );
}
