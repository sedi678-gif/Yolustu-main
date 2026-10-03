import { ARENA_ENERGY_MAX, ARENA_ENERGY_START, ARENA_SLOT_COUNT } from './config';
import { arenaCardMeta, arenaCardTitle, isArenaCardId, officialArenaCardCost } from './catalog';
import { remainingTurnSeconds, roleLabelAz, sideSlots, turnLabel } from './turnOrder';
import type { ArenaMatchState, ArenaPresenceState } from './types';
import type { ArenaHandCardView, ArenaSlotPlayer, ArenaViewModel } from '../types';
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

function handFromMatch(match: ArenaMatchState, viewerPlayerId: string): ArenaHandCardView[] {
  const loadout = match.loadouts[viewerPlayerId];
  const energy = match.players[viewerPlayerId]?.energy ?? 0;
  if (!loadout) return [];
  return loadout.cards.map((card) => {
    const meta = isArenaCardId(card.cardId) ? arenaCardMeta(card.cardId) : null;
    const cost = officialArenaCardCost(card.cardId);
    const disabled = card.remaining <= 0 || energy < cost;
    return {
      id: card.cardId,
      title: meta?.title ?? card.cardId,
      image: meta?.image,
      emoji: meta?.emoji,
      energyCostLabel: `⚡ ${cost}`,
      remainingUsesLabel: `${card.remaining}/${card.maxUses}`,
      selected: false,
      disabled,
    };
  });
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
  const loadoutPhase = match.phase === 'loadout';
  const click = match.effects?.clickEvent;
  const last = match.effects?.lastPlay;
  const hide = Boolean(last?.hidden && last.playerId !== viewerPlayerId);
  const viewerRole = match.players[viewerPlayerId]?.role;
  return {
    ...base,
    matchState: { statusLabel: loadoutPhase ? 'Kart seçimi' : match.status === 'active' ? 'Arena' : 'Bağlı' },
    timer: { label: loadoutPhase || serverNow <= 0 ? '--' : String(seconds) },
    energy: { label: `⚡ ${energy}/${maxEnergy}` },
    players: {
      home: slotsFromMatch(match, 'home', presence),
      away: slotsFromMatch(match, 'away', presence),
    },
    currentTurn: loadoutPhase
      ? null
      : {
          playerId: match.currentTurn,
          label: turnLabel(match),
        },
    cards: { hand: handFromMatch(match, viewerPlayerId) },
    clickEvent: {
      visible: Boolean(click) && viewerRole === 'CLICKER',
      cardTitle: click ? arenaCardTitle(click.cardId) : 'Klik kartı',
      shareable: Boolean(click) && viewerRole === 'CLICKER' && !click?.sharedToChat,
    },
    effectLabel: hide ? 'Gizli kart' : match.effects?.lastSummary,
    doubleActive: match.effects?.pendingDoubleFor === viewerPlayerId,
    spyReveal: match.effects?.spyReveal?.[viewerPlayerId] ?? [],
  };
}

export { roleLabelAz };
