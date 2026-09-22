import type { CardEffectModule } from '../types';

export const mutantCard: CardEffectModule = {
  cardId: 'mutant',
  effects: [
    { type: 'damage', amount: 6 },
    { type: 'click_challenge', required: 5 },
    { type: 'attack', playerDelta: 4, allianceDelta: 2 },
  ],
};
