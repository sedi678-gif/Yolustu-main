'use client';

import AppLink from '@/app/components/AppLink';
import type { ChannelStudioData } from './useChannelStudio';
import { formatStudioAge, formatStudioCount } from './useChannelStudio';
import styles from './studioDashboard.module.css';

export type ChannelStudioTab = 'dashboard' | 'content' | 'analytics';

function Sparkline({ series }: { series: { value: number }[] }) {
  const w = 320;
  const h = 72;
  const max = Math.max(1, ...series.map((p) => p.value));
  const step = series.length > 1 ? w / (series.length - 1) : w;
  const pts = series.map((p, i) => {
    const x = i * step;
    const y = h - 6 - (p.value / max) * (h - 12);
    return `${x},${y}`;
  });
  const line = pts.join(' ');
  const area = `0,${h} ${line} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <polygon points={area} fill="rgba(255,0,0,0.16)" />
      <polyline points={line} fill="none" stroke="#ff0000" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

function MediaThumb({
  url,
  type,
  className,
  alt,
}: {
  url: string;
  type: 'video' | 'image';
  className?: string;
  alt: string;
}) {
  if (type === 'video') {
    return <video className={className} src={url} muted playsInline preload="metadata" />;
  }
  return <img className={className} src={url} alt={alt} />;
}

function Skeleton({ className }: { className: string }) {
  return <div className={`${styles.skeleton} ${className}`} aria-hidden />;
}

function ContentTable({ data }: { data: ChannelStudioData }) {
  if (!data.ready) {
    return (
      <article className={`${styles.card} ${styles.span2}`}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Kanal kontenti</h2>
        </div>
        <Skeleton className={styles.skeletonRow} />
        <Skeleton className={styles.skeletonRow} />
        <Skeleton className={styles.skeletonRow} />
      </article>
    );
  }

  return (
    <article className={`${styles.card} ${styles.span2}`}>
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle}>Kanal kontenti</h2>
        <p className={styles.cardMeta}>{data.posts.length} paylaşım</p>
      </div>
      {data.posts.length === 0 ? (
        <p className={styles.empty}>Kanalın kontent cədvəli burada görünəcək. Yarat ilə ilk paylaşımı yüklə.</p>
      ) : (
        <div className={styles.tableWrap}>
          <div className={styles.tableHead} aria-hidden>
            <span>Kontent</span>
            <span>Tarix</span>
            <span>Bəyənmə</span>
            <span>Şərh</span>
            <span>Hədiyyə</span>
          </div>
          {data.posts.map((post) => (
            <AppLink key={post.id} href="/profile" className={styles.tableRow}>
              <div className={styles.tableContent}>
                <MediaThumb
                  url={post.mediaUrl}
                  type={post.mediaType}
                  className={styles.contentThumb}
                  alt={post.title}
                />
                <div>
                  <p className={styles.tableTitle}>{post.title || 'Başlıqsız'}</p>
                  <span className={styles.cardMeta}>
                    {post.mediaType === 'video' ? 'Video' : 'Şəkil'} · {formatStudioCount(post.likes)} bəyənmə
                  </span>
                </div>
              </div>
              <span className={styles.tableCell}>{formatStudioAge(post.createdAt)}</span>
              <span className={styles.tableCell}>{formatStudioCount(post.likes)}</span>
              <span className={styles.tableCell}>{formatStudioCount(post.commentsCount)}</span>
              <span className={styles.tableCell}>{formatStudioCount(post.giftCount)}</span>
            </AppLink>
          ))}
        </div>
      )}
    </article>
  );
}

function AnalyticsPanel({ data, analyticsOpen }: { data: ChannelStudioData; analyticsOpen: boolean }) {
  return (
    <article className={`${styles.card} ${styles.span2}`}>
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle}>Kanal analitikası</h2>
        <p className={styles.cardMeta}>Son 28 gün</p>
      </div>
      <div className={styles.analyticsGrid}>
        <div>
          <label className={styles.cardMeta}>İzləyicilər</label>
          <div className={styles.statBig}>{formatStudioCount(data.followers)}</div>
        </div>
        <div>
          <label className={styles.cardMeta}>Alınan bəyənmə</label>
          <div className={styles.statBig}>{formatStudioCount(data.likesReceived)}</div>
        </div>
        <div>
          <label className={styles.cardMeta}>Kontent</label>
          <div className={styles.statBig}>{formatStudioCount(data.posts.length)}</div>
        </div>
        <div>
          <label className={styles.cardMeta}>Əlaqə</label>
          <div className={styles.statBig}>
            {analyticsOpen ? formatStudioCount(data.engagement28d) : '—'}
          </div>
        </div>
      </div>
      {analyticsOpen ? (
        <>
          <p className={styles.cardMeta} style={{ marginTop: 16 }}>
            Bəyənmə + şərh (günlük)
          </p>
          <div className={styles.chart}>
            <Sparkline series={data.series} />
          </div>
        </>
      ) : (
        <p className={styles.lockHint}>
          Dərin qrafik Professional panoda açılır. İzləyici və bəyənmə hər kəsə görünür.
        </p>
      )}
    </article>
  );
}

export default function ChannelDashboard({
  data,
  analyticsOpen,
  tab,
}: {
  data: ChannelStudioData;
  analyticsOpen: boolean;
  tab: ChannelStudioTab;
}) {
  if (tab === 'content') {
    return (
      <div className={styles.grid}>
        <ContentTable data={data} />
      </div>
    );
  }

  if (tab === 'analytics') {
    return (
      <div className={styles.grid}>
        <AnalyticsPanel data={data} analyticsOpen={analyticsOpen} />
      </div>
    );
  }

  const { latest, posts, comments } = data;

  return (
    <div className={styles.grid}>
      <article className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Son paylaşımın nəticəsi</h2>
          <p className={styles.cardMeta}>Canlı göstərici</p>
        </div>
        {!data.ready ? (
          <Skeleton className={styles.skeletonLatest} />
        ) : latest ? (
          <div className={styles.latest}>
            <div className={styles.thumbWrap}>
              <MediaThumb url={latest.mediaUrl} type={latest.mediaType} alt={latest.title} />
              <span className={styles.badge}>{latest.mediaType === 'video' ? 'Video' : 'Şəkil'}</span>
            </div>
            <div className={styles.latestBody}>
              <h3>{latest.title || 'Başlıqsız paylaşım'}</h3>
              <p className={styles.cardMeta}>Yayımlandı · {formatStudioAge(latest.createdAt)}</p>
              <div className={styles.metrics}>
                <div className={styles.metric}>
                  <label>Bəyənmə</label>
                  <b>{formatStudioCount(latest.likes)}</b>
                </div>
                <div className={styles.metric}>
                  <label>Şərh</label>
                  <b>{formatStudioCount(latest.commentsCount)}</b>
                </div>
                <div className={styles.metric}>
                  <label>Hədiyyə</label>
                  <b>{formatStudioCount(latest.giftCount)}</b>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className={styles.empty}>Hələ paylaşım yoxdur. Yarat düyməsi ilə ilk kontenti yüklə.</p>
        )}
      </article>

      <article className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Kanal analitikası</h2>
          <p className={styles.cardMeta}>Son 28 gün</p>
        </div>
        <div className={styles.statsRow}>
          <div>
            <label className={styles.cardMeta}>İzləyicilər</label>
            <div className={styles.statBig}>{formatStudioCount(data.followers)}</div>
          </div>
          <div>
            <label className={styles.cardMeta}>Alınan bəyənmə</label>
            <div className={styles.statBig}>{formatStudioCount(data.likesReceived)}</div>
          </div>
        </div>
        {analyticsOpen ? (
          <>
            <p className={styles.cardMeta} style={{ marginTop: 12 }}>
              Əlaqə (bəyənmə + şərh): {formatStudioCount(data.engagement28d)}
            </p>
            <div className={styles.chart}>
              <Sparkline series={data.series} />
            </div>
          </>
        ) : (
          <p className={styles.lockHint}>
            Dərin qrafik Professional panoda açılır. İzləyici və bəyənmə hər kəsə görünür.
          </p>
        )}
      </article>

      <article className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Son şərhlər</h2>
          <p className={styles.cardMeta}>{latest ? latest.title : 'Kontent yoxdur'}</p>
        </div>
        {!data.ready ? (
          <Skeleton className={styles.skeletonRow} />
        ) : comments.length === 0 ? (
          <p className={styles.empty}>Bu paylaşımda hələ şərh yoxdur.</p>
        ) : (
          comments.map((item) => (
            <div key={item.id} className={styles.comment}>
              {item.userAvatar ? (
                <img className={styles.avatar} src={item.userAvatar} alt="" />
              ) : (
                <div className={styles.avatar} />
              )}
              <div>
                <span>
                  {item.userName} · {formatStudioAge(item.createdAt)}
                </span>
                <p>{item.text}</p>
              </div>
            </div>
          ))
        )}
      </article>

      <article className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Kontent</h2>
          <p className={styles.cardMeta}>{posts.length} paylaşım</p>
        </div>
        {!data.ready ? (
          <Skeleton className={styles.skeletonRow} />
        ) : posts.length === 0 ? (
          <p className={styles.empty}>Kanalın kontent cədvəli burada görünəcək.</p>
        ) : (
          posts.slice(0, 6).map((post) => (
            <AppLink key={post.id} href="/profile" className={styles.contentRow}>
              <MediaThumb
                url={post.mediaUrl}
                type={post.mediaType}
                className={styles.contentThumb}
                alt={post.title}
              />
              <div>
                <p className={styles.tableTitle}>{post.title || 'Başlıqsız'}</p>
                <span className={styles.cardMeta}>
                  {formatStudioCount(post.likes)} bəyənmə · {formatStudioAge(post.createdAt)}
                </span>
              </div>
            </AppLink>
          ))
        )}
      </article>
    </div>
  );
}
