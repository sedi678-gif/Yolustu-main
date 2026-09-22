import type { CardEffectModule } from '../types';

export const qayaCard: CardEffectModule = {
  cardId: 'qaya',
  effects: [
    { type: 'negate' },
    { type: 'damage', amount: 6 },
    { type: 'attack', playerDelta: 3, allianceDelta: 2 },
  ],
};
