import { MODEL_CARD_DEFS, modelCardImageUrl, type ModelCardDef } from '@/app/components/alliance/modelCardsCatalog';

export const TABLE_SLOT_COUNT = 5;
export const DRAG_CARD_MIME = 'application/x-yolustu-table-card';

export type TableRole = 'leader' | 'co-leader' | 'clicker' | 'coordinator';
export type TableSide = 'attacker' | 'defender';
export type MatchMode = '1v1' | '2v2' | '4v4' | 'alliance';
export type PingKind = 'target' | 'attack' | 'defend' | 'hold';

export interface TableCardInstance {
  instanceId: string;
  cardId: string;
  ownerSide: TableSide;
}

export interface TablePing {
  id: string;
  x: number;
  y: number;
  kind: PingKind;
  label: string;
  createdAt: number;
}

export interface TablePermissions {
  canRevealAll: boolean;
  canRevealOwn: boolean;
  canPlayCards: boolean;
  canClickRaid: boolean;
  canPing: boolean;
}

export const TABLE_ROLES: { id: TableRole; label: string; viewAs: string; hint: string }[] = [
  {
    id: 'leader',
    label: 'Lider',
    viewAs: 'View as Leader',
    hint: 'Öz və rəqib kartlarının hamısı üzüaçıq',
  },
  {
    id: 'co-leader',
    label: 'Yardımçı Lider',
    viewAs: 'View as Co-Leader',
    hint: 'Öz və rəqib kartlarının hamısı üzüaçıq',
  },
  {
    id: 'clicker',
    label: 'Klikləyən',
    viewAs: 'View as Clicker',
    hint: 'Kart atır və klikləyir — rəqibin üzüaşağı kartlarını görmür',
  },
  {
    id: 'coordinator',
    label: 'Koordinator',
    viewAs: 'View as Coordinator',
    hint: 'Xəritə/ping — kartları icazəsiz görmür',
  },
];

export const MATCH_MODES: { id: MatchMode; label: string }[] = [
  { id: '1v1', label: '1v1' },
  { id: '2v2', label: '2v2' },
  { id: '4v4', label: '4v4' },
  { id: 'alliance', label: 'İttifaq vs İttifaq' },
];

export const PING_KINDS: { id: PingKind; label: string; color: string }[] = [
  { id: 'target', label: 'Hədəf', color: '#fbbf24' },
  { id: 'attack', label: 'Hücum', color: '#f43f5e' },
  { id: 'defend', label: 'Müdafiə', color: '#22d3ee' },
  { id: 'hold', label: 'Saxla', color: '#a78bfa' },
];

export function permissionsForRole(role: TableRole): TablePermissions {
  const isCommand = role === 'leader' || role === 'co-leader';
  return {
    canRevealAll: isCommand,
    canRevealOwn: isCommand || role === 'clicker',
    canPlayCards: role === 'clicker' || isCommand,
    canClickRaid: role === 'clicker',
    canPing: role === 'coordinator',
  };
}

export function isSlotCardRevealed(
  perms: TablePermissions,
  viewerSide: TableSide,
  cardOwnerSide: TableSide
): boolean {
  if (perms.canRevealAll) return true;
  if (perms.canRevealOwn && cardOwnerSide === viewerSide) return true;
  return false;
}

export function seatsForMode(mode: MatchMode): { attacker: number; defender: number } {
  if (mode === '1v1') return { attacker: 1, defender: 1 };
  if (mode === '2v2') return { attacker: 2, defender: 2 };
  return { attacker: 4, defender: 4 };
}

export function catalogCard(cardId: string): ModelCardDef | undefined {
  return MODEL_CARD_DEFS.find((item) => item.id === cardId);
}

export function catalogImage(cardId: string): string {
  const def = catalogCard(cardId);
  return def ? modelCardImageUrl(def) : '';
}

export function makeInstance(cardId: string, ownerSide: TableSide): TableCardInstance {
  return {
    instanceId: `${ownerSide}-${cardId}-${Math.random().toString(36).slice(2, 8)}`,
    cardId,
    ownerSide,
  };
}

export function starterHand(side: TableSide): TableCardInstance[] {
  return MODEL_CARD_DEFS.map((def) => makeInstance(def.id, side));
}

export function starterSlots(): Record<TableSide, Array<TableCardInstance | null>> {
  return {
    attacker: Array.from({ length: TABLE_SLOT_COUNT }, () => null),
    defender: [
      makeInstance('guzgu', 'defender'),
      makeInstance('qaya', 'defender'),
      makeInstance('felaket', 'defender'),
      null,
      null,
    ],
  };
}

export function emptySlots(): Record<TableSide, Array<TableCardInstance | null>> {
  return {
    attacker: Array.from({ length: TABLE_SLOT_COUNT }, () => null),
    defender: Array.from({ length: TABLE_SLOT_COUNT }, () => null),
  };
}
