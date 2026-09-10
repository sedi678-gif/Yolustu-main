import type { ClickRaidCardId } from '@/app/lib/clickRaidLogic';



/** Tək glTF faylı — run / attack / death animasiya klipləri daxilində */

export interface ClickRaidGltfConfig {

  gltf: string;

  /** Pixi3D model miqyası (xəritə ölçüsü) */

  displayScale: number;

  clips: {

    run: string;

    attack: string;

    death: string;

  };

}



const MUTANT_BASE = '/models/mutant';

const STANDING_BASE = '/models/standing';

const ZOMBIE_BASE = '/models/zombie';

const DOG_BASE = '/models/dog';



export const CLICK_RAID_GLTF: Record<ClickRaidCardId, ClickRaidGltfConfig> = {

  mutant: {

    gltf: `${MUTANT_BASE}/mutant.gltf`,

    displayScale: 2.8,

    clips: { run: 'run', attack: 'attack', death: 'death' },

  },

  standing: {

    gltf: `${STANDING_BASE}/standing.gltf`,

    displayScale: 2.6,

    clips: { run: 'run', attack: 'attack', death: 'death' },

  },

  zombi: {

    gltf: `${ZOMBIE_BASE}/zombi.gltf`,

    displayScale: 2.8,

    clips: { run: 'run', attack: 'attack', death: 'death' },

  },

  it: {

    gltf: `${DOG_BASE}/it.gltf`,

    displayScale: 2.9,

    clips: { run: 'run', attack: 'attack', death: 'death' },

  },

};



export type ClickRaidAnimState = 'run' | 'attack' | 'death';



/** @deprecated FBX yolları — yalnız build-click-raid-gltf skripti üçün */

export const CLICK_RAID_FBX_SOURCES: Record<

  ClickRaidCardId,

  { run: string; attack: string; death: string; meshScale: number }

> = {

  mutant: {

    run: `${MUTANT_BASE}/Mutant%20Run.fbx`,

    attack: `${MUTANT_BASE}/Mutant%20Swiping.fbx`,

    death: `${MUTANT_BASE}/Mutant%20Dying.fbx`,

    meshScale: 0.011,

  },

  standing: {

    run: `${STANDING_BASE}/Standing%20Run%20Forward.fbx`,

    attack: `${STANDING_BASE}/Standing%202H%20Magic%20Attack%2001.fbx`,

    death: `${STANDING_BASE}/Standing%20React%20Death%20Backward.fbx`,

    meshScale: 0.01,

  },

  zombi: {

    run: `${ZOMBIE_BASE}/Zombie%20Run.fbx`,

    attack: `${ZOMBIE_BASE}/Zombie%20Attack.fbx`,

    death: `${ZOMBIE_BASE}/Zombie%20Death.fbx`,

    meshScale: 0.011,

  },

  it: {

    run: `${DOG_BASE}/dog%20run.fbx`,

    attack: `${DOG_BASE}/dog%20attack.fbx`,

    death: `${DOG_BASE}/dog%20death.fbx`,

    meshScale: 0.012,

  },

};


