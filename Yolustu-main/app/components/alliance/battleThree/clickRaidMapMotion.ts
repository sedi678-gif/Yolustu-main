export const RAID_MAX_UNITS = 5;

/** Qala (X,Z) ətrafında spawn radiusu — yerimə/pathfinding yoxdur */
export const RAID_SPAWN_RADIUS = 86;

export function raidUnitCount(cardCount: number | undefined): number {
  return Math.min(RAID_MAX_UNITS, Math.max(1, Math.round(cardCount || 1)));
}

export interface RaidSpawnPoint {
  /** Leaflet ekran X = 3D dünya X */
  x: number;
  /** Leaflet ekran Y = 3D dünya Z (yer müstəvisi) */
  z: number;
}

/**
 * Kart atılan kimi qala koordinatları ətrafında sabit nöqtə.
 * Vaxt keçdikcə yer dəyişmir — yalnız xəritə pan/zoom-da qala ilə birgə sürüşür.
 */
export function computeRaidSpawnPoint(
  castleX: number,
  castleZ: number,
  ringIndex: number,
  ringTotal: number
): RaidSpawnPoint {
  const n = Math.max(1, ringTotal);
  const angle = (2 * Math.PI * ringIndex) / n - Math.PI / 2;
  const radius = RAID_SPAWN_RADIUS + (ringIndex % 3) * 10;
  return {
    x: castleX + Math.cos(angle) * radius,
    z: castleZ + Math.sin(angle) * radius * 0.55,
  };
}

export interface RaidHeroMotion {
  x: number;
  y: number;
  rotationY: number;
  radius: number;
  approaching: boolean;
}

/** HUD / fallback — orbit yox, qala ətrafında sabit spawn */
export function computeRaidHeroMotion(
  castleX: number,
  castleY: number,
  ringIndex: number,
  ringTotal: number
): RaidHeroMotion {
  const spawn = computeRaidSpawnPoint(castleX, castleY, ringIndex, ringTotal);
  const dx = castleX - spawn.x;
  const dz = castleY - spawn.z;
  return {
    x: spawn.x,
    y: spawn.z,
    rotationY: Math.atan2(dx, dz) + Math.PI,
    radius: RAID_SPAWN_RADIUS,
    approaching: false,
  };
}
