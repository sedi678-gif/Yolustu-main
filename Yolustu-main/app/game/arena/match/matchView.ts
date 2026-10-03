import { ARENA_ENERGY_MAX, ARENA_ENERGY_START, ARENA_SLOT_COUNT } from './config';
import { remainingTurnSeconds, roleLabelAz, sideSlots, turnLabel } from './turnOrder';
import type { ArenaMatchState, ArenaPresenceState } from './types';
import type { ArenaSlotPlayer, ArenaViewModel } from '../types';
import { createPlaceholderArenaView } from '../placeholderView';

function slotsFromMatch(
  match: ArenaMatchState,
  side: 'home' | 'away',
  presence: Record<string, ArenaPresenceState>
): Array<ArenaSlotPlayer | null> {
  const ids = sideSlots(match, side);
  const next: Array<ArenaSlotPlayer | null> = [];
  for (let i = 0; i < ARENA_SLOT_COUNT; i += 1) {
    const id = ids[i];
    if (!id) {
      next.push(null);
      continue;
    }
    const player = match.players[id];
    next.push({
      id,
      name: match.displayNames[id]?.trim() || id.slice(0, 8),
      role: player?.role ?? (i === 0 ? 'LIDER' : i === 1 ? 'HELP_LIDER' : i === 2 ? 'CLICKER' : 'MEMBER'),
      online: presence[id]?.online === true,
    });
  }
  return next;
}

export function matchToArenaView(input: {
  match: ArenaMatchState;
  viewerPlayerId: string;
  serverNow: number;
  presence: Record<string, ArenaPresenceState>;
}): ArenaViewModel {
  const { match, viewerPlayerId, serverNow, presence } = input;
  const viewer = match.players[viewerPlayerId];
  const energy = viewer?.energy ?? ARENA_ENERGY_START;
  const maxEnergy = viewer?.maxEnergy ?? ARENA_ENERGY_MAX;
    const seconds = remainingTurnSeconds(match.turnExpiresAt, serverNow);
    const base = createPlaceholderArenaView();
    return {
      ...base,
      matchState: { statusLabel: match.status === 'active' ? 'Arena' : 'Bağlı' },
      timer: { label: serverNow <= 0 ? '--' : String(seconds) },
    energy: { label: `⚡ ${energy}/${maxEnergy}` },
    players: {
      home: slotsFromMatch(match, 'home', presence),
      away: slotsFromMatch(match, 'away', presence),
    },
    currentTurn: {
      playerId: match.currentTurn,
      label: turnLabel(match),
    },
    cards: { hand: base.cards.hand },
    clickEvent: { visible: false, cardTitle: 'Klik kartı' },
  };
}

export { roleLabelAz };
