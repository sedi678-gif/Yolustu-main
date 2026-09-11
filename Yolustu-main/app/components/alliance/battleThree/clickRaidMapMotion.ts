import type { ClickRaidCardId } from '@/app/lib/clickRaidLogic';
import type { ClickRaidAnimState } from './clickRaidModelPaths';

export const RAID_APPROACH_MS = 2600;
export const RAID_MAX_UNITS = 5;

const CARD_ORBIT: Record<ClickRaidCardId, number> = {
  mutant: 0.00072,
  standing: 0.00055,
  zombi: 0.00048,
  it: 0.00115,
};

export function raidUnitCount(cardCount: number | undefined): number {
  return Math.min(RAID_MAX_UNITS, Math.max(1, Math.round(cardCount || 1)));
}

export function orbitSpeedForCard(cardId: ClickRaidCardId): number {
  return CARD_ORBIT[cardId] ?? 0.0007;
}

export function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

export interface RaidHeroMotion {
  x: number;
  y: number;
  rotationY: number;
  radius: number;
  approaching: boolean;
}

/** Qala ətrafında canlı orbit — əvvəl kənardan qaçır, sonra mühasirə */
export function computeRaidHeroMotion(
  castleX: number,
  castleY: number,
  ringIndex: number,
  ringTotal: number,
  spawnedAt: number,
  now: number,
  orbitSpeed: number,
  mode: ClickRaidAnimState
): RaidHeroMotion {
  const elapsed = Math.max(0, now - spawnedAt);
  const approach = easeOutCubic(elapsed / RAID_APPROACH_MS);
  const outer = 132 + (ringIndex % 3) * 10;
  const inner = 46 + Math.min(22, ringTotal * 3);
  const radius = mode === 'death' ? inner * 0.92 : outer + (inner - outer) * approach;
  const base = (2 * Math.PI * ringIndex) / Math.max(1, ringTotal);
  const spin = mode === 'run' ? elapsed * orbitSpeed : elapsed * orbitSpeed * 0.18;
  const angle = base + spin;

  return {
    x: castleX + Math.cos(angle) * radius,
    y: castleY + Math.sin(angle) * radius * 0.52,
    rotationY: angle + Math.PI,
    radius,
    approaching: approach < 1 && mode === 'run',
  };
}
