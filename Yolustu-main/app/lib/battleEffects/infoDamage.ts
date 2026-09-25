import { allianceMemberCount } from '@/app/lib/battleClick/battleClickConfig';

/** info.json zərər tavanı — zəlzələ 70 × üzv, maksimum 3500. */
export const INFO_DAMAGE_MAX = 3500;

export const CARD_VARIANTS = {
  qutb: ['fire', 'ice'],
  felaket: ['tsunami', 'earthquake'],
} as const;

export type CardVariant = (typeof CARD_VARIANTS)[keyof typeof CARD_VARIANTS][number];

export function defaultCardVariant(cardId: string): CardVariant | null {
  if (cardId === 'qutb') return 'fire';
  if (cardId === 'felaket') return 'earthquake';
  return null;
}

export function normalizeCardVariant(cardId: string, raw: unknown): CardVariant | null {
  const allowed = CARD_VARIANTS[cardId as keyof typeof CARD_VARIANTS];
  if (!allowed) {
    if (raw != null && raw !== '') throw new Error('Bu kartın seçimi yoxdur');
    return null;
  }
  const value = typeof raw === 'string' && raw.trim() ? raw.trim() : defaultCardVariant(cardId);
  if (!value || !(allowed as readonly string[]).includes(value)) throw new Error('Kart seçimi yanlışdır');
  return value as CardVariant;
}

/** info.json: Od 50/üzv max 2500, Sunami 30/üzv max 1500, Zəlzələ 70/üzv max 3500. */
export function officialInfoDamage(cardId: string, memberCount: unknown, variant: CardVariant | null): number {
  const members = allianceMemberCount(memberCount);
  if (cardId === 'qutb' && variant === 'fire') return Math.min(50 * members, 2500);
  if (cardId === 'felaket' && variant === 'tsunami') return Math.min(30 * members, 1500);
  if (cardId === 'felaket' && variant === 'earthquake') return Math.min(70 * members, 3500);
  return 0;
}
