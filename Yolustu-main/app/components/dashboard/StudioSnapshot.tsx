'use client';

import { useChannelStudio, formatStudioCount, formatStudioAge } from './useChannelStudio';
import styles from './studioDashboard.module.css';

export default function StudioSnapshot({ userId }: { userId?: string | null }) {
  const data = useChannelStudio(userId);
  const latest = data.latest;

  const openStudio = () => {
    window.location.href = '/dashboard/';
  };

  return (
    <section className={styles.snapshot} aria-label="Kanal paneli">
      <div className={styles.snapshotHead}>
        {data.avatar ? (
          <img className={styles.avatar} src={data.avatar} alt="" />
        ) : (
          <div className={styles.brandMark} aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}
        <div>
          <h2>{data.name || 'Kanal paneli'}</h2>
          <p>Yolüstü Studio · kanalın nəzarət mərkəzi</p>
        </div>
      </div>
      <div className={styles.snapshotStats}>
        <div>
          <span>İzləyici</span>
          <b>{formatStudioCount(data.followers)}</b>
        </div>
        <div>
          <span>Bəyənmə</span>
          <b>{formatStudioCount(data.likesReceived)}</b>
        </div>
        <div>
          <span>Kontent</span>
          <b>{formatStudioCount(data.posts.length)}</b>
        </div>
      </div>
      {latest ? (
        <div className={styles.snapshotLatest}>
          {latest.mediaType === 'video' ? (
            <video src={latest.mediaUrl} muted playsInline preload="metadata" />
          ) : (
            <img src={latest.mediaUrl} alt="" />
          )}
          <div>
            <p>{latest.title || 'Son paylaşım'}</p>
            <span>
              {formatStudioCount(latest.likes)} bəyənmə · {formatStudioAge(latest.createdAt)}
            </span>
          </div>
        </div>
      ) : (
        <p className={styles.empty} style={{ padding: '0 14px 8px' }}>
          Hələ paylaşım yoxdur.
        </p>
      )}
      <button type="button" className={styles.snapshotCta} onClick={openStudio}>
        Kanal panelini aç
      </button>
    </section>
  );
}
