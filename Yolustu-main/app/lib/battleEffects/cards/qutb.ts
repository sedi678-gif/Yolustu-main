import type { CardEffectModule } from '../types';

export const qutbCard: CardEffectModule = {
  cardId: 'qutb',
  effects: [
    { type: 'fire', amount: 7 },
    { type: 'ice', freezeMs: 600_000 },
    { type: 'click_challenge', required: 5 },
    { type: 'attack', playerDelta: 5, allianceDelta: 3 },
  ],
};
