import type { CardEffectModule } from '../types';

export const qulCard: CardEffectModule = {
  cardId: 'qul',
  effects: [
    { type: 'slave' },
    { type: 'click_challenge', scale: 'normal', target: 'opponent' },
    { type: 'damage', amount: 3 },
    { type: 'attack', playerDelta: 4, allianceDelta: 2 },
  ],
};
