"use client";

import { useMemo, useState } from 'react';
import { MODEL_CARD_DEFS } from '@/app/components/alliance/modelCardsCatalog';
import CardComponent from '@/app/components/battleArena/CardComponent';

export type GameMode = '1v1' | '4v4';
export type ArenaRole = 'LIDER' | 'HELP_LIDER' | 'CLICKER' | 'MEMBER';

export const ENERGY_LIMIT: Record<GameMode, number> = {
  '1v1': 35,
  '4v4': 30,
};

export interface BattleArenaProps {
  gameMode?: GameMode;
  hasLiveClicker?: boolean;
  currentUserRole?: ArenaRole;
  currentEnergy?: number;
}

interface Seat {
  id: string;
  name: string;
  role?: ArenaRole;
  hiddenCards: number;
}

interface TablePlay {
  id: string;
  cardId: string;
  side: 'attack' | 'defend';
  revealed: boolean;
}

const ROLE_LABEL: Record<ArenaRole, string> = {
  LIDER: 'Lider',
  HELP_LIDER: 'Köməkçi lider',
  CLICKER: 'Kliker',
  MEMBER: 'Üzv',
};

function leaderHand() {
  return MODEL_CARD_DEFS.slice(0, 5).map((item) => item.id);
}

function SeatChip({ seat, self }: { seat: Seat; self?: boolean }) {
  return (
    <div className={`flex w-[72px] flex-col items-center ${self ? 'brightness-110' : ''}`}>
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full border text-[11px] font-black ${
          self ? 'border-cyan-300 bg-cyan-500/20 text-cyan-100' : 'border-white/20 bg-slate-900/80 text-slate-200'
        }`}
      >
        {seat.name.slice(0, 1)}
      </div>
      <p className="mt-1 max-w-full truncate text-[10px] font-bold text-slate-100">{seat.name}</p>
      {seat.role ? <p className="text-[9px] font-semibold uppercase tracking-wide text-cyan-300/80">{ROLE_LABEL[seat.role]}</p> : null}
      <div className="mt-1 flex">
        {Array.from({ length: Math.min(seat.hiddenCards, 5) }, (_, i) => (
          <CardComponent key={`${seat.id}-h-${i}`} face="back" size="sm" className="-ml-4 first:ml-0" />
        ))}
      </div>
    </div>
  );
}

export default function BattleArena({
  gameMode: modeProp = '1v1',
  hasLiveClicker: clickerProp = false,
  currentUserRole: roleProp = 'MEMBER',
  currentEnergy: energyProp,
}: BattleArenaProps) {
  const [gameMode, setGameMode] = useState<GameMode>(modeProp);
  const [hasLiveClicker, setHasLiveClicker] = useState(clickerProp);
  const [currentUserRole, setCurrentUserRole] = useState<ArenaRole>(roleProp);
  const [currentEnergy, setCurrentEnergy] = useState(() => energyProp ?? ENERGY_LIMIT[modeProp]);
  const [liveClicks, setLiveClicks] = useState(0);
  const [hand, setHand] = useState<string[]>(() => leaderHand());
  const [table, setTable] = useState<TablePlay[]>([]);
  const [log, setLog] = useState('İttifaq savaş masası hazırdır');

  const energyMax = ENERGY_LIMIT[gameMode];
  const energyClickFallback = gameMode === '1v1' || !hasLiveClicker;
  const canPlayCards = gameMode === '1v1' || currentUserRole === 'MEMBER' || currentUserRole === 'CLICKER';
  const isObserver = gameMode === '4v4' && (currentUserRole === 'LIDER' || currentUserRole === 'HELP_LIDER');

  const opponents: Seat[] = useMemo(() => {
    if (gameMode === '1v1') return [{ id: 'opp', name: 'Rəqib', hiddenCards: 5 }];
    return [
      { id: 'o1', name: 'Rəqib 1', hiddenCards: 5 },
      { id: 'o2', name: 'Rəqib 2', hiddenCards: 5 },
      { id: 'o3', name: 'Rəqib 3', hiddenCards: 5 },
      { id: 'o4', name: 'Rəqib 4', hiddenCards: 5 },
    ];
  }, [gameMode]);

  const allies: Seat[] = useMemo(() => {
    if (gameMode === '1v1') return [{ id: 'me', name: 'Sən', hiddenCards: 0 }];
    return [
      { id: 'a1', name: 'Sən', role: currentUserRole, hiddenCards: 0 },
      { id: 'a2', name: 'Lider', role: 'LIDER', hiddenCards: 0 },
      { id: 'a3', name: 'Köməkçi', role: 'HELP_LIDER', hiddenCards: 0 },
      { id: 'a4', name: hasLiveClicker ? 'Kliker' : 'Üzv', role: hasLiveClicker ? 'CLICKER' : 'MEMBER', hiddenCards: 0 },
    ];
  }, [gameMode, currentUserRole, hasLiveClicker]);

  const switchMode = (next: GameMode) => {
    setGameMode(next);
    setCurrentEnergy(ENERGY_LIMIT[next]);
    setLiveClicks(0);
    setHand(leaderHand());
    setTable([]);
    setLog(next === '1v1' ? 'Solo duel: klik birbaşa enerjidən düşür' : '4v4 ittifaq savaşı');
    if (next === '1v1') setHasLiveClicker(false);
  };

  const spendClick = () => {
    if (energyClickFallback) {
      if (currentEnergy < 1) {
        setLog('Enerji bitib — klik mümkün deyil');
        return;
      }
      setCurrentEnergy((value) => value - 1);
      setLog(`1 klik = 1 enerji. Qalıq: ${currentEnergy - 1}/${energyMax}`);
      return;
    }
    setLiveClicks((value) => value + 1);
    setLog(`Canlı kliker kliklədi (${liveClicks + 1}). Enerji xərclənmədi.`);
  };

  const playOwnCard = (cardId: string) => {
    if (!canPlayCards) {
      setLog('Lider və köməkçi lider yalnız masanı izləyir');
      return;
    }
    setHand((prev) => prev.filter((id) => id !== cardId));
    setTable((prev) => [...prev, { id: `atk-${Date.now()}`, cardId, side: 'attack', revealed: true }]);
    setLog(`${cardId} hücum zonasına atıldı`);

    window.setTimeout(() => {
      const reply = MODEL_CARD_DEFS[7]?.id ?? 'qaya';
      const id = `def-${Date.now()}`;
      setTable((prev) => [...prev, { id, cardId: reply, side: 'defend', revealed: false }]);
      setLog('Rəqib kartı gizli gəldi…');
      window.setTimeout(() => {
        setTable((prev) => prev.map((item) => (item.id === id ? { ...item, revealed: true } : item)));
        setLog('Rəqib kartı döyüş zonasında açıldı');
      }, 520);
    }, 380);
  };

  const attackCard = [...table].reverse().find((item) => item.side === 'attack');
  const defendCard = [...table].reverse().find((item) => item.side === 'defend');

  return (
    <div className="relative min-h-dvh w-full overflow-hidden text-slate-100">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(56,189,248,0.16), transparent 55%), linear-gradient(180deg, #070b14 0%, #102033 42%, #0b1220 100%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-3 pb-3 pt-[max(10px,env(safe-area-inset-top))]">
        <header className="mb-3 flex items-center justify-between gap-2">
          <div className="flex rounded-full border border-cyan-400/30 bg-slate-950/60 p-1">
            {(['1v1', '4v4'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => switchMode(mode)}
                className={`rounded-full px-3 py-1 text-[11px] font-black ${gameMode === mode ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}
              >
                {mode}
              </button>
            ))}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">Enerji</p>
            <p className="text-lg font-black tabular-nums">
              {currentEnergy}/{energyMax}
            </p>
          </div>
        </header>

        {gameMode === '4v4' ? (
          <div className="mb-2 flex items-center justify-between gap-2 text-[10px]">
            <label className="flex items-center gap-1 font-bold text-slate-300">
              <input type="checkbox" checked={hasLiveClicker} onChange={(e) => setHasLiveClicker(e.target.checked)} />
              Canlı kliker
            </label>
            <select
              value={currentUserRole}
              onChange={(e) => setCurrentUserRole(e.target.value as ArenaRole)}
              className="rounded-md border border-white/15 bg-slate-900 px-2 py-1 text-[10px] font-bold"
            >
              {Object.entries(ROLE_LABEL).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="mb-2 text-center text-[10px] font-semibold text-slate-400">Solo duel · rol yoxdur · 1 klik = 1 enerji</p>
        )}

        <section className={`mb-2 flex justify-center gap-2 ${gameMode === '4v4' ? 'flex-wrap' : ''}`}>
          {opponents.map((seat) => (
            <SeatChip key={seat.id} seat={seat} />
          ))}
        </section>

        <section className="relative flex min-h-[210px] flex-1 flex-col items-center justify-center">
          <p className="mb-3 text-center text-[11px] font-semibold text-cyan-100/80">{log}</p>
          <div className="relative h-[168px] w-[220px]">
            {attackCard ? (
              <div className="absolute left-6 top-4 transition-transform duration-500" style={{ transform: 'rotate(-6deg)' }}>
                <CardComponent cardId={attackCard.cardId} face="front" size="lg" revealed={attackCard.revealed} />
              </div>
            ) : null}
            {defendCard ? (
              <div
                className="absolute right-4 top-8 transition-transform duration-500"
                style={{ transform: defendCard.revealed ? 'rotate(6deg)' : 'rotate(6deg) rotateY(180deg)' }}
              >
                <CardComponent cardId={defendCard.cardId} face={defendCard.revealed ? 'front' : 'back'} size="lg" revealed={defendCard.revealed} />
              </div>
            ) : null}
            {!attackCard && !defendCard ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-cyan-500/30 text-[11px] font-bold text-slate-400">
                Döyüş zonası
              </div>
            ) : null}
          </div>
        </section>

        <div className="mb-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={spendClick}
            className="rounded-full border border-amber-300/40 bg-amber-400/15 px-4 py-2 text-[11px] font-black uppercase tracking-wide text-amber-100"
          >
            {energyClickFallback ? 'Klik (enerji -1)' : 'Canlı klik'}
          </button>
          {gameMode === '4v4' && hasLiveClicker ? (
            <span className="text-[10px] font-bold text-slate-400">Canlı klik: {liveClicks}</span>
          ) : null}
        </div>

        <section className={`mb-3 flex justify-center gap-2 ${gameMode === '4v4' ? 'flex-wrap' : ''}`}>
          {allies.map((seat) => (
            <SeatChip key={seat.id} seat={seat} self={seat.id === 'me' || seat.id === 'a1'} />
          ))}
        </section>

        <section className="flex min-h-[132px] items-end justify-center">
          {isObserver ? (
            <p className="pb-6 text-center text-[11px] font-bold text-slate-400">Sən masanı izləyirsən — kart atmaq üzvlərə məxsusdur</p>
          ) : (
            hand.map((cardId, index) => (
              <CardComponent
                key={cardId}
                cardId={cardId}
                size="md"
                rotate={(index - 2) * 5}
                className="-ml-4 first:ml-0"
                onClick={() => playOwnCard(cardId)}
                disabled={!canPlayCards}
              />
            ))
          )}
        </section>
      </div>
    </div>
  );
}
