"use client";

import { useMemo, useState } from 'react';
import { ARENA_CARD_CATALOG, ARENA_LOADOUT_SIZE } from './match/catalog';
import { lockArenaLoadout } from './match/matchService';

export default function ArenaLoadoutPicker({
  matchId,
  playerId,
}: {
  matchId: string;
  playerId: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggle(id: string) {
    setError(null);
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= ARENA_LOADOUT_SIZE) return prev;
      return [...prev, id];
    });
  }

  async function confirm() {
    if (selected.length !== ARENA_LOADOUT_SIZE || busy) return;
    setBusy(true);
    setError(null);
    try {
      await lockArenaLoadout({ matchId, playerId, cardIds: selected });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kartlar saxlanılmadı');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-2 rounded-xl border border-cyan-400/25 bg-slate-950/90 p-2" aria-label="5 kart seçimi">
      <p className="px-1 text-[11px] font-black uppercase tracking-wide text-cyan-100">
        13 kartdan {ARENA_LOADOUT_SIZE} seç ({selected.length}/{ARENA_LOADOUT_SIZE})
      </p>
      <div className="mt-2 grid grid-cols-4 gap-1">
        {ARENA_CARD_CATALOG.map((card) => {
          const on = selectedSet.has(card.id);
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => toggle(card.id)}
              className={`min-h-[72px] overflow-hidden rounded-lg border text-left ${
                on ? 'border-cyan-300 ring-2 ring-cyan-400/70' : 'border-white/15'
              }`}
            >
              <div className="h-10 bg-slate-800">
                {card.image ? (
                  <img src={card.image} alt="" className="h-full w-full object-cover" draggable={false} />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm">{card.emoji}</div>
                )}
              </div>
              <div className="px-1 py-1">
                <p className="truncate text-[8px] font-extrabold text-white">{card.title}</p>
                <p className="text-[8px] font-bold text-amber-200">⚡ {card.cost}</p>
              </div>
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-1 px-1 text-[10px] font-bold text-rose-300">{error}</p> : null}
      <button
        type="button"
        disabled={selected.length !== ARENA_LOADOUT_SIZE || busy}
        onClick={() => void confirm()}
        className="mt-2 w-full rounded-lg border border-cyan-300/40 bg-cyan-500/20 py-2 text-[11px] font-black text-cyan-50 disabled:opacity-40"
      >
        {busy ? 'Yazılır…' : '5 kartı təsdiqlə'}
      </button>
    </section>
  );
}
