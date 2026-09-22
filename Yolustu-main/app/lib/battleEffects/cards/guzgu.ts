import type { CardEffectModule } from '../types';

export const guzguCard: CardEffectModule = {
  cardId: 'guzgu',
  effects: [
    { type: 'mirror' },
    { type: 'damage', amount: 4 },
    { type: 'attack', playerDelta: 4, allianceDelta: 2 },
  ],
};
