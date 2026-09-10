"use client";



import React, { useEffect, useState } from 'react';

import Link from 'next/link';

import { useUser } from '@/context/UserContext';

import { useAllianceBrain } from '@/app/components/alliance/AllianceBrainContext';

import BattleCardArt from '@/app/components/alliance/BattleCardArt';

import { getBattleCardAsset } from '@/app/components/alliance/battleCardAssets';

import AppBottomNav from '@/app/components/AppBottomNav';

import {

  BATTLE_CARD_PRODUCTS,

  SHIELD_PRODUCTS,

  DISASTER_LABELS,

  WEEKLY_CARD_LIMIT,

  formatShieldExpiry,

} from './shopConfig';

import {

  purchaseBattleCard,

  purchaseShield,

  purchaseFortressLevel,

  listenWeeklyShop,

  getRemainingWeekly,

} from './shopService';

import { FORTRESS_SHOP_PRODUCTS, getFortressMarkerUrl } from '@/app/lib/allianceFortressConfig';

import { AllianceWeeklyShop } from '@/app/components/alliance/types';

import { emitAllianceHubEvent } from '@/app/components/alliance/allianceSocket';

import VipShopPanel from './VipShopPanel';

import styles from './shop.module.css';


const TAB_META = {

  cards: { icon: '🎴', label: 'Kartlar' },

  shields: { icon: '🛡️', label: 'Qalxan' },

  fortress: { icon: '🏰', label: 'Qalalar' },

  vip: { icon: '👑', label: 'VIP' },

} as const;



function ShopContent() {

  const { manat, manatReady, playerProfile, userId, applyManatDelta } = useUser();

  const { activeAlliance, fortressHub } = useAllianceBrain();

  const [tab, setTab] = useState<'cards' | 'shields' | 'fortress' | 'vip'>('cards');

  const [weekly, setWeekly] = useState<AllianceWeeklyShop | null>(null);

  const [notification, setNotification] = useState<string | null>(null);

  const [loading, setLoading] = useState<string | null>(null);



  const notify = (text: string) => {

    setNotification(text);

    setTimeout(() => setNotification(null), 3500);

  };



  useEffect(() => {

    if (!activeAlliance?.id) {

      setWeekly(null);

      return;

    }

    return listenWeeklyShop(activeAlliance.id, setWeekly);

  }, [activeAlliance?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search).get('tab');
    if (q === 'fortress') setTab('fortress');
  }, []);

  const isLeader = fortressHub.canManage;
  const currentFortress = fortressHub.level;



  const activeShields = (playerProfile?.activeShields ?? []).filter(

    (s) => s.expiresAt > Date.now()

  );



  const handleBuyCard = async (cardId: typeof BATTLE_CARD_PRODUCTS[0]['id']) => {

    if (!activeAlliance) {

      notify('Döyüş kartı almaq üçün ittifaqda olmalısan');

      return;

    }

    const product = BATTLE_CARD_PRODUCTS.find((p) => p.id === cardId);

    if (!product) return;

    setLoading(cardId);

    applyManatDelta(-product.price);

    try {

      await purchaseBattleCard(userId, activeAlliance.id, cardId);

      emitAllianceHubEvent('cards_updated', { userId, cardId, allianceId: activeAlliance.id });

      notify('Kart uğurla alındı! 🎴');

    } catch (e) {

      applyManatDelta(product.price);

      notify(e instanceof Error ? e.message : 'Xəta baş verdi');

    } finally {

      setLoading(null);

    }

  };



  const handleBuyFortress = async (level: typeof FORTRESS_SHOP_PRODUCTS[0]['level']) => {
    if (!activeAlliance) {
      notify('Qala almaq üçün ittifaqda olmalısan');
      return;
    }
    if (!isLeader) {
      notify('Yalnız ittifaq lideri qala səviyyəsi ala bilər');
      return;
    }
    const product = FORTRESS_SHOP_PRODUCTS.find((p) => p.level === level);
    if (!product) return;
    setLoading(`fortress-${level}`);
    applyManatDelta(-product.price);
    try {
      await purchaseFortressLevel(userId, activeAlliance.id, level);
      emitAllianceHubEvent('fortress_updated', { userId, level, allianceId: activeAlliance.id });
      notify(`🏰 Qala Lv.${level} aktiv oldu!`);
    } catch (e) {
      applyManatDelta(product.price);
      notify(e instanceof Error ? e.message : 'Xəta baş verdi');
    } finally {
      setLoading(null);
    }
  };

  const handleBuyShield = async (durationId: typeof SHIELD_PRODUCTS[0]['id']) => {

    const product = SHIELD_PRODUCTS.find((p) => p.id === durationId);

    if (!product) return;

    setLoading(durationId);

    applyManatDelta(-product.price);

    try {

      await purchaseShield(userId, durationId);

      emitAllianceHubEvent('cards_updated', { userId, type: 'shield' });

      notify('Qalxan aktivləşdirildi! 🛡️');

    } catch (e) {

      applyManatDelta(product.price);

      notify(e instanceof Error ? e.message : 'Xəta baş verdi');

    } finally {

      setLoading(null);

    }

  };



  return (

    <div className={styles.shopWorld}>

      {notification && <div className={styles.notification}>{notification}</div>}



      <section className={styles.shopHero}>

        <div className={styles.shopHeroTop}>

          <div>

            <p className={styles.shopEyebrow}>Yolustu Market</p>

            <h1 className={styles.shopTitle}>Strategiya Mağazası</h1>

            <p className={styles.shopSubtitle}>

              Döyüş kartları, qalxanlar və VIP kosmetikalar — balansınla güclən.

            </p>

          </div>

          <div className={styles.walletCard}>

            <span className={styles.walletLabel}>Balans</span>

            <div className={styles.walletAmount}>

              <span className={styles.manatIcon}>₼</span>

              {manatReady ? manat.toLocaleString('az-AZ') : '...'}

            </div>

          </div>

        </div>

        <div className={styles.shopHeroLinks}>

          <Link href="/profile" className={styles.profileLink}>

            Profil balansı →

          </Link>

        </div>

      </section>



      <nav className={styles.tabBar} aria-label="Mağaza bölmələri">

        {(Object.keys(TAB_META) as Array<keyof typeof TAB_META>).map((key) => (

          <button

            key={key}

            type="button"

            className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}

            onClick={() => setTab(key)}

          >

            <span className={styles.tabIcon}>{TAB_META[key].icon}</span>

            {TAB_META[key].label}

          </button>

        ))}

      </nav>



      <div className={styles.shopContent}>

        {tab === 'cards' && (

          <>

            <div className={styles.sectionHead}>

              <h2 className={styles.sectionTitle}>Döyüş Kartları</h2>

              <span className={styles.sectionMeta}>{BATTLE_CARD_PRODUCTS.length} məhsul</span>

            </div>



            {!activeAlliance ? (

              <div className={styles.warningBanner}>

                Döyüş kartları yalnız <strong>ittifaq üzvləri</strong> üçün satılır.{' '}

                <Link href="/profile">Profildən ittifaqə qoşul</Link> və ya{' '}

                <Link href="/alliance">ittifaq yarat</Link>.

              </div>

            ) : (

              <div className={styles.weekBanner}>

                🗓️ <strong>{activeAlliance.name}</strong> · hər kartdan həftədə max{' '}

                <strong>{WEEKLY_CARD_LIMIT} ədəd</strong>

              </div>

            )}



            <div className={styles.productGrid}>

              {BATTLE_CARD_PRODUCTS.map((product) => {

                const remaining = activeAlliance ? getRemainingWeekly(weekly, product.id) : 0;

                const owned = playerProfile?.battleCards?.[product.id] ?? 0;

                const canBuy =

                  !!activeAlliance && remaining > 0 && manat >= product.price && !loading;

                const asset = getBattleCardAsset(product.id);



                return (

                  <article

                    key={product.id}

                    className={`${styles.productCard} ${styles.battleCardProduct}`}

                  >

                    <div className={styles.productArt}>

                      <BattleCardArt

                        id={product.id}

                        size="md"

                        count={owned > 0 ? owned : undefined}

                      />

                    </div>

                    <div className={styles.productBody}>

                      <div className={styles.productName}>{asset.title}</div>

                      {asset.tag && <div className={styles.productTag}>{asset.tag}</div>}

                      <div className={styles.productDesc}>{product.desc}</div>

                      <div className={styles.productLimit}>

                        {activeAlliance

                          ? `Qaldı ${remaining}/${WEEKLY_CARD_LIMIT} · Səndə ${owned}`

                          : 'İttifaq tələb olunur'}

                      </div>

                      <div className={styles.productFooter}>

                        <div className={styles.productPrice}>

                          ₼ {product.price.toLocaleString('az-AZ')}

                        </div>

                        <button

                          type="button"

                          className={styles.buyBtn}

                          disabled={!canBuy}

                          onClick={() => handleBuyCard(product.id)}

                        >

                          {loading === product.id ? '...' : 'Al'}

                        </button>

                      </div>

                    </div>

                  </article>

                );

              })}

            </div>

          </>

        )}



        {tab === 'shields' && (

          <>

            <div className={styles.sectionHead}>

              <h2 className={styles.sectionTitle}>Qalxanlar</h2>

              <span className={styles.sectionMeta}>{SHIELD_PRODUCTS.length} plan</span>

            </div>



            <div className={styles.weekBanner}>

              🌋 Zəlzələ, sunami və yangın hadisələrindən qorunma — fövqəladə hal sistemi.

            </div>



            <div className={styles.productGrid}>

              {SHIELD_PRODUCTS.map((product) => {

                const canBuy = manat >= product.price && !loading;

                return (

                  <article key={product.id} className={`${styles.productCard} ${styles.shieldCard}`}>

                    <div className={styles.productArt}>

                      <div className={styles.shieldIcon}>🛡️</div>

                    </div>

                    <div className={styles.productBody}>

                      <div className={styles.productName}>{product.name}</div>

                      <div className={styles.productDesc}>{product.desc}</div>

                      <div className={styles.disasterTags}>

                        {Object.entries(DISASTER_LABELS).map(([key, label]) => (

                          <span key={key} className={styles.disasterTag}>

                            {label}

                          </span>

                        ))}

                      </div>

                      <div className={styles.productFooter}>

                        <div className={styles.productPrice}>

                          ₼ {product.price.toLocaleString('az-AZ')}

                        </div>

                        <button

                          type="button"

                          className={styles.buyBtn}

                          disabled={!canBuy}

                          onClick={() => handleBuyShield(product.id)}

                        >

                          {loading === product.id ? '...' : 'Aktivləşdir'}

                        </button>

                      </div>

                    </div>

                  </article>

                );

              })}

            </div>



            {activeShields.length > 0 && (

              <div className={styles.activeShields}>

                <div className={styles.activeShieldsTitle}>Aktiv qalxanların</div>

                {activeShields.map((shield) => (

                  <div key={shield.id} className={styles.shieldRow}>

                    <span>{shield.name}</span>

                    <span>{formatShieldExpiry(shield.expiresAt)}</span>

                  </div>

                ))}

              </div>

            )}

          </>

        )}



        {tab === 'fortress' && (
          <>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>İttifaq qalaları</h2>
              <span className={styles.sectionMeta}>Lv.2 — Lv.6</span>
            </div>
            {!activeAlliance ? (
              <div className={styles.warningBanner}>
                Qala almaq üçün ittifaqda olmalısan.{' '}
                <Link href="/alliance">İttifaq səhifəsi</Link>
              </div>
            ) : !isLeader ? (
              <div className={styles.warningBanner}>
                Yalnız <strong>ittifaq lideri</strong> mağazadan qala səviyyəsi ala bilər. Hazırkı
                qala: Lv.{currentFortress}
              </div>
            ) : (
              <div className={styles.weekBanner}>
                🏰 <strong>{activeAlliance.name}</strong> · hazırkı qala Lv.{currentFortress}
              </div>
            )}
            <div className={styles.productGrid}>
              {FORTRESS_SHOP_PRODUCTS.map((product) => {
                const canBuy =
                  !!activeAlliance &&
                  isLeader &&
                  manat >= product.price &&
                  product.level > currentFortress &&
                  loading === null;
                return (
                  <article key={product.level} className={styles.productCard}>
                    <img
                      src={getFortressMarkerUrl(product.level)}
                      alt=""
                      className={styles.fortressShopThumb}
                      width={88}
                      height={88}
                    />
                    <h3 className={styles.productName}>{product.name}</h3>
                    <p className={styles.productDesc}>{product.desc}</p>
                    <div className={styles.productFooter}>
                      <div className={styles.productPrice}>
                        ₼ {product.price.toLocaleString('az-AZ')}
                      </div>
                      <button
                        type="button"
                        className={styles.buyBtn}
                        disabled={!canBuy}
                        onClick={() => handleBuyFortress(product.level)}
                      >
                        {loading === `fortress-${product.level}`
                          ? '...'
                          : product.level <= currentFortress
                            ? 'Artıq var'
                            : 'Al'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}

        {tab === 'vip' && (

          <>

            <div className={styles.sectionHead}>

              <h2 className={styles.sectionTitle}>VIP & Profil</h2>

              <span className={styles.sectionMeta}>Kosmetika</span>

            </div>

            <VipShopPanel

              userId={userId}

              manat={manat}

              cosmetics={playerProfile?.cosmetics}

              onNotify={notify}

              onSpend={(amount) => applyManatDelta(-amount)}

              onRefund={(amount) => applyManatDelta(amount)}

            />

          </>

        )}

      </div>



      <AppBottomNav activeTab="shop" />

    </div>

  );

}



export default function ShopPageClient() {
  return <ShopContent />;
}

