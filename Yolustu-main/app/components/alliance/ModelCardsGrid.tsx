"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  MODEL_CARD_DEFS,
  ModelCardDef,
  modelCardImageUrl,
  modelCardInfoUrls,
  parseModelCardInfo,
} from './modelCardsCatalog';
import styles from './alliance.module.css';

interface LoadedCard {
  def: ModelCardDef;
  title: string;
  body: string;
  image: string;
}

function ModelCardFace({ card }: { card: LoadedCard }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={styles.modelCardFallback} style={{ ['--card-accent' as string]: card.def.accent }}>
        <span className={styles.modelCardFallbackEmoji}>{card.def.emoji}</span>
      </div>
    );
  }

  return (
    <img
      src={card.image}
      alt={card.title}
      className={styles.modelCardImg}
      loading="lazy"
      onError={() => setFailed(true)}
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
        <p className={styles.modelCardInfoBody}>{card.body}</p>
      </div>
    </div>,
    target
  );
}

function toLoadedCard(def: ModelCardDef, body = def.info): LoadedCard {
  return {
    def,
    title: def.title,
    body: body.trim() || def.info,
    image: modelCardImageUrl(def),
  };
}

export default function ModelCardsGrid() {
  const baseCards = useMemo(() => MODEL_CARD_DEFS.map((def) => toLoadedCard(def)), []);
  const [cards, setCards] = useState<LoadedCard[]>(baseCards);
  const [infoId, setInfoId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void Promise.all(
      MODEL_CARD_DEFS.map(async (def) => {
        for (const url of modelCardInfoUrls(def)) {
          try {
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) continue;
            const parsed = parseModelCardInfo(await res.text());
            if (parsed.body) {
              return toLoadedCard(def, parsed.body);
            }
          } catch {
            /* növbəti info yolunu yoxla */
          }
        }
        return toLoadedCard(def);
      })
    ).then((loaded) => {
      if (!cancelled) setCards(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const infoCard = infoId ? cards.find((card) => card.def.id === infoId) ?? null : null;

  return (
    <>
      <div className={styles.mapCardsGrid}>
        {cards.map((card) => (
          <div key={card.def.id} className={styles.mapCardItem}>
            <div className={styles.modelCardArtWrap}>
              <ModelCardFace card={card} />
              <button
                type="button"
                className={styles.modelCardInfoBtn}
                onClick={() => setInfoId(card.def.id)}
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
      {infoCard ? <ModelCardInfoModal card={infoCard} onClose={() => setInfoId(null)} /> : null}
    </>
  );
}
