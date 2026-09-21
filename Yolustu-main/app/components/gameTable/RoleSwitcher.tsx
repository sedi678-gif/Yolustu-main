"use client";

import { MATCH_MODES, TABLE_ROLES, type MatchMode, type TableRole, type TableSide } from './gameTableTypes';

interface RoleSwitcherProps {
  role: TableRole;
  side: TableSide;
  mode: MatchMode;
  onRole: (role: TableRole) => void;
  onSide: (side: TableSide) => void;
  onMode: (mode: MatchMode) => void;
}

export default function RoleSwitcher({ role, side, mode, onRole, onSide, onMode }: RoleSwitcherProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Rol görünüşü">
        {TABLE_ROLES.map((item) => {
          const active = role === item.id;
          return (
            <button
              key={item.id}
              type="button"
              title={item.hint}
              onClick={() => onRole(item.id)}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-extrabold tracking-wide uppercase transition ${
                active
                  ? 'border-amber-300 bg-amber-300/20 text-amber-100 shadow-[0_0_16px_rgba(251,191,36,0.35)]'
                  : 'border-white/15 bg-slate-950/50 text-slate-300 hover:border-white/35'
              }`}
            >
              {item.viewAs}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {MATCH_MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onMode(item.id)}
            className={`rounded-md border px-2 py-1 text-[10px] font-bold ${
              mode === item.id
                ? 'border-cyan-300/70 bg-cyan-400/15 text-cyan-100'
                : 'border-white/10 bg-black/30 text-slate-400'
            }`}
          >
            {item.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-white/15" />
        {(['attacker', 'defender'] as TableSide[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onSide(item)}
            className={`rounded-md border px-2 py-1 text-[10px] font-bold ${
              side === item
                ? item === 'attacker'
                  ? 'border-rose-400 bg-rose-500/20 text-rose-100'
                  : 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
                : 'border-white/10 bg-black/30 text-slate-400'
            }`}
          >
            {item === 'attacker' ? 'Hücum tərəfi' : 'Müdafiə tərəfi'}
          </button>
        ))}
      </div>
    </div>
  );
}
