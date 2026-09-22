import type { CardEffectModule } from '../types';

export const felaketCard: CardEffectModule = {
  cardId: 'felaket',
  effects: [
    { type: 'earthquake', amount: 9 },
    { type: 'tsunami' },
    { type: 'click_challenge', required: 5 },
    { type: 'attack', playerDelta: 6, allianceDelta: 4 },
  ],
};
