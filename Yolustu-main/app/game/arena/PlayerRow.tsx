"use client";

import PlayerSlot from './PlayerSlot';
import { padArenaSlots } from './slotLayout';
import type { ArenaSlotPlayer } from './types';

interface PlayerRowProps {
  players: Array<ArenaSlotPlayer | null>;
  label: string;
  currentPlayerId?: string;
}

export default function PlayerRow({ players, label, currentPlayerId }: PlayerRowProps) {
  const slots = padArenaSlots(players);

  return (
    <section className="w-full min-w-0 px-2" aria-label={label}>
      <div className="grid grid-cols-5 gap-1">
        {slots.map((player, index) => (
          <PlayerSlot
            key={`${label}-${index}`}
            player={player}
            index={index}
            current={Boolean(player && currentPlayerId && player.id === currentPlayerId)}
          />
        ))}
      </div>
    </section>
  );
}
