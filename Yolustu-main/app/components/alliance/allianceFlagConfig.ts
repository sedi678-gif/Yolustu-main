import { AllianceFlagConfig } from './types';

export const DEFAULT_ALLIANCE_FLAG: AllianceFlagConfig = {
  backgroundColor: '#991b1b',
  accentColor: '#fbbf24',
  emblem: '🦁',
  pattern: 'solid',
};

export const FLAG_BG_PRESETS = [
  '#991b1b',
  '#1d4ed8',
  '#166534',
  '#7c2d12',
  '#581c87',
  '#0f766e',
  '#334155',
  '#b45309',
] as const;

export const FLAG_ACCENT_PRESETS = [
  '#fbbf24',
  '#fef08a',
  '#ffffff',
  '#fca5a5',
  '#93c5fd',
  '#86efac',
] as const;

export const FLAG_EMBLEM_PRESETS = ['🦁', '⚔️', '🛡️', '🏰', '⭐', '🐺', '🦅', '🔥', '👑', '🌙'] as const;

export const FLAG_PATTERN_OPTIONS: { id: AllianceFlagConfig['pattern']; label: string }[] = [
  { id: 'solid', label: 'Düz' },
  { id: 'stripes-h', label: 'Üfüqi' },
  { id: 'stripes-v', label: 'Şaquli' },
  { id: 'diagonal', label: 'Diaqonal' },
];

export function normalizeAllianceFlag(flag?: Partial<AllianceFlagConfig> | null): AllianceFlagConfig {
  const normalized: AllianceFlagConfig = {
    backgroundColor: flag?.backgroundColor || DEFAULT_ALLIANCE_FLAG.backgroundColor,
    accentColor: flag?.accentColor || DEFAULT_ALLIANCE_FLAG.accentColor,
    emblem: flag?.emblem || DEFAULT_ALLIANCE_FLAG.emblem,
    pattern: flag?.pattern || DEFAULT_ALLIANCE_FLAG.pattern,
  };

  if (typeof flag?.imageUrl === 'string' && flag.imageUrl.trim()) {
    normalized.imageUrl = flag.imageUrl.trim();
    if (typeof flag.imageUpdatedAt === 'number') {
      normalized.imageUpdatedAt = flag.imageUpdatedAt;
    }
  }

  return normalized;
}
