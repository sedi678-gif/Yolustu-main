import type { CardEffectModule } from '../types';

export const qulCard: CardEffectModule = {
  cardId: 'qul',
  effects: [
    { type: 'slave' },
    { type: 'click_challenge', required: 5 },
    { type: 'damage', amount: 3 },
    { type: 'attack', playerDelta: 4, allianceDelta: 2 },
  ],
};
