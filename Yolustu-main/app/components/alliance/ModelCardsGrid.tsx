"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  MODEL_CARD_DEFS,
  ModelCardDef,
  modelCardImageCandidates,
  modelCardInfoUrl,
  modelCardPublicUrl,
  parseModelCardInfo,
} from './modelCardsCatalog';
import styles from './alliance.module.css';

interface LoadedCard {
  def: ModelCardDef;
  title: string;
  body: string;
  images: string[];
}

function ModelCardFace({ card }: { card: LoadedCard }) {
  const [index, setIndex] = useState(0);
  const src = card.images[index];

  if (!src) {
    return (
      <div className={styles.modelCardFallback} style={{ ['--card-accent' as string]: card.def.accent }}>
        <span className={styles.modelCardFallbackEmoji}>{card.def.emoji}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={card.title}
      className={styles.modelCardImg}
      loading="lazy"
      onError={() => setIndex((i) => i + 1)}
    />
  );
}

function ModelCardInfoModal({
  card,
  onClose,
}: {
  card: LoadedCard;
  onClose: () => void;
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.body);
  }, []);

  if (!target) return null;

  const body = card.body.trim() || 'Bu kart üçün məlumat hələ yazılmayıb.';

  return createPortal(
    <div className={styles.modelCardInfoOverlay} onClick={onClose} role="presentation">
      <div
        className={styles.modelCardInfoSheet}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={card.title}
      >
        <div className={styles.modelCardInfoHead}>
          <h3>{card.title}</h3>
          <button type="button" className={styles.modelCardInfoClose} onClick={onClose} aria-label="Bağla">
            ✕
          </button>
        </div>
        <p className={styles.modelCardInfoBody}>{body}</p>
      </div>
    </div>,
    target
  );
}

export default function ModelCardsGrid() {
  const [cards, setCards] = useState<LoadedCard[]>([]);
  const [infoCard, setInfoCard] = useState<LoadedCard | null>(null);

  useEffect(() => {
    let cancelled = false;

    void Promise.all(
      MODEL_CARD_DEFS.map(async (def) => {
        let title = def.title;
        let body = '';
        let extraImage: string | undefined;
        try {
          const res = await fetch(modelCardInfoUrl(def.folder), { cache: 'no-store' });
          if (res.ok) {
            const parsed = parseModelCardInfo(await res.text());
            if (parsed.title) title = parsed.title;
            body = parsed.body;
            extraImage = parsed.image;
          }
        } catch {
          /* info.json oxunmasa fallback başlıq qalır */
        }

        const images = [
          extraImage
            ? extraImage.startsWith('/')
              ? extraImage
              : modelCardPublicUrl(def.imageFolder, extraImage)
            : '',
          ...modelCardImageCandidates(def),
        ].filter(Boolean);

        return { def, title, body, images };
      })
    ).then((loaded) => {
      if (!cancelled) setCards(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const list = cards.length > 0 ? cards : MODEL_CARD_DEFS.map((def) => ({
    def,
    title: def.title,
    body: '',
    images: modelCardImageCandidates(def),
  }));

  return (
    <>
      <div className={styles.mapCardsGrid}>
        {list.map((card) => (
          <div key={card.def.id} className={styles.mapCardItem}>
            <div className={styles.modelCardArtWrap}>
              <ModelCardFace card={card} />
              <button
                type="button"
                className={styles.modelCardInfoBtn}
                onClick={() => setInfoCard(card)}
                title={`${card.title} məlumatı`}
                aria-label={`${card.title} məlumatı`}
              >
                i
              </button>
            </div>
            <span className={styles.mapCardName}>{card.title}</span>
          </div>
        ))}
      </div>
      {infoCard ? <ModelCardInfoModal card={infoCard} onClose={() => setInfoCard(null)} /> : null}
    </>
  );
}
