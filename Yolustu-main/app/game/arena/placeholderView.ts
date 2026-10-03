import { MODEL_CARD_DEFS, modelCardImageUrl } from '@/app/components/alliance/modelCardsCatalog';
import type { ArenaViewModel } from './types';

export function createPlaceholderArenaView(): ArenaViewModel {
  return {
    homeAllianceName: 'Öz ittifaqı',
    awayAllianceName: 'Rəqib ittifaqı',
    matchState: { statusLabel: 'Arena' },
    timer: { label: '--:--' },
    energy: { label: '-- / --' },
    players: {
      away: [
        { id: 'away-1', name: 'Lider', role: 'LIDER', online: true },
        { id: 'away-2', name: 'Köməkçi', role: 'HELP_LIDER', online: false },
        { id: 'away-3', name: 'Kliker', role: 'CLICKER', online: true },
        null,
        null,
      ],
      home: [
        { id: 'home-1', name: 'Sən', role: 'LIDER', online: true },
        { id: 'home-2', name: 'Köməkçi', role: 'HELP_LIDER', online: true },
        { id: 'home-3', name: 'Kliker', role: 'CLICKER', online: false },
        { id: 'home-4', name: 'Üzv', role: 'MEMBER', online: true },
        null,
      ],
    },
    cards: {
      hand: MODEL_CARD_DEFS.slice(0, 5).map((def, index) => ({
        id: def.id,
        title: def.title,
        image: modelCardImageUrl(def),
        emoji: def.emoji,
        energyCostLabel: '--',
        remainingUsesLabel: '--',
        selected: index === 0,
      })),
    },
    activeCard: null,
    currentTurn: null,
    clickEvent: { visible: true, cardTitle: 'Klik kartı' },
  };
}
