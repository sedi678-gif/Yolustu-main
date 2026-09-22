import { contribute } from '../fold';
import type { EffectPrimitive } from '../types';

export const clickChallengePrimitive: EffectPrimitive = {
  type: 'click_challenge',
  apply(spec) {
    return contribute({ kinds: ['click_challenge'], clickRequired: spec.required });
  },
};
