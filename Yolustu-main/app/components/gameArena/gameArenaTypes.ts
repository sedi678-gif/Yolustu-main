import { MODEL_CARD_DEFS, modelCardImageUrl, type ModelCardDef } from '@/app/components/alliance/modelCardsCatalog';

export const LEADER_HAND_SIZE = 5;

export interface ArenaCardData {
  id: string;
  title: string;
  image: string;
  emoji: string;
  accent: string;
}

export interface ArenaOpponent {
  id: string;
  name: string;
  initial?: string;
  avatarUrl?: string;
  frame: string;
  cards: number;
  fan: boolean;
}

export function toArenaCard(def: ModelCardDef): ArenaCardData {
  return {
    id: def.id,
    title: def.title,
    image: modelCardImageUrl(def),
    emoji: def.emoji,
    accent: def.accent,
  };
}

/** İttifaq liderinin seçdiyi rəsmi 5-lik. */
export function leaderSelectedHand(): ArenaCardData[] {
  return MODEL_CARD_DEFS.slice(0, LEADER_HAND_SIZE).map(toArenaCard);
}

export function catalogArenaCard(id: string): ArenaCardData | undefined {
  const def = MODEL_CARD_DEFS.find((item) => item.id === id);
  return def ? toArenaCard(def) : undefined;
}

export const DEMO_OPPONENTS: ArenaOpponent[] = [
  {
    id: 'p1',
    name: '2025',
    initial: 'П',
    frame: '#7c3aed',
    cards: 6,
    fan: false,
  },
  {
    id: 'p2',
    name: 'KZ_02',
    avatarUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=120&q=80',
    frame: '#cbd5e1',
    cards: 6,
    fan: true,
  },
  {
    id: 'p3',
    name: 'Sergio...',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80',
    frame: '#e2e8f0',
    cards: 6,
    fan: false,
  },
];
