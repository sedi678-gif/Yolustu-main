import type { CardEffectModule } from '../types';

export const sehrbazCard: CardEffectModule = {
  cardId: 'sehrbaz',
  effects: [
    { type: 'swap' },
    { type: 'damage', amount: 4 },
    { type: 'attack', playerDelta: 4, allianceDelta: 2 },
  ],
};
