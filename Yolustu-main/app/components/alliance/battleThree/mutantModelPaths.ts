const BASE = '/models/mutant';

export const MUTANT_MODELS = {
  run: `${BASE}/Mutant%20Run.fbx`,
  attack: `${BASE}/Mutant%20Swiping.fbx`,
  death: `${BASE}/Mutant%20Dying.fbx`,
} as const;

export type MutantAnimState = 'run' | 'attack' | 'death';
