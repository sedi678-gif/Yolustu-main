/** Sword & Shield FBX model yolları (public/models) */

const BASE = '/models/sword%20and%20shield';

export const SHIELD_DEFENDER_MODELS = {
  /** Idle / qala ətrafında dayanma */
  idle: `${BASE}/Sword%20And%20Shield%20Run.fbx`,
  /** Bloklama animasiyası (block.fbx yoxdur — Attack klipi istifadə olunur) */
  block: `${BASE}/Sword%20And%20Shield%20Attack.fbx`,
  death: `${BASE}/Sword%20And%20Shield%20Death.fbx`,
} as const;

export type DefenderAnimState = 'idle' | 'block' | 'death';
