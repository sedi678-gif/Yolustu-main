"use client";

import ArenaScreen from '../arena/ArenaScreen';
import type { GameTableProps } from './types';

export default function GameTable({ open, onClose, matchId, playerId }: GameTableProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[280] flex justify-center bg-black" role="dialog" aria-modal="true" aria-label="Oyun masası">
      <ArenaScreen onClose={onClose} matchId={matchId} playerId={playerId} />
    </div>
  );
}
