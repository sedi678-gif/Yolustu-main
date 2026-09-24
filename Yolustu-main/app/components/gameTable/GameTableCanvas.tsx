"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppLink from '@/app/components/AppLink';
import CardSlotZone from './CardSlotZone';
import CastleCore, { useCastleHit } from './CastleCore';
import ClickerPanel from './ClickerPanel';
import CoordinatorOverlay, { CoordinatorToolbar } from './CoordinatorOverlay';
import HandDock from './HandDock';
import PlayerSeats from './PlayerSeats';
import RoleSwitcher from './RoleSwitcher';
import TableCard from './TableCard';
import {
  MATCH_MODES,
  PING_KINDS,
  TABLE_SLOT_COUNT,
  catalogCard,
  emptySlots,
  isSlotCardRevealed,
  makeInstance,
  permissionsForRole,
  starterHand,
  starterSlots,
  type MatchMode,
  type PingKind,
  type TableCardInstance,
  type TablePing,
  type TableRole,
  type TableSide,
} from './gameTableTypes';
import styles from './gameTable.module.css';

const RAID_CLICKS_NEEDED = 5;
const DRAG_THRESHOLD = 8;

interface DragGhost {
  instanceId: string;
  cardId: string;
  x: number;
  y: number;
}

function slotFromPoint(x: number, y: number): { side: TableSide; index: number } | null {
  if (typeof document === 'undefined') return null;
  const stack = document.elementsFromPoint(x, y);
  for (const node of stack) {
    const el = (node as Element).closest?.('[data-table-slot]') as HTMLElement | null;
    if (!el) continue;
    const side = el.dataset.tableSide as TableSide | undefined;
    const index = Number(el.dataset.tableIndex);
    if ((side === 'attacker' || side === 'defender') && Number.isInteger(index)) {
      return { side, index };
    }
  }
  return null;
}

export default function GameTableCanvas() {
  const unlimited = true;
  const [role, setRole] = useState<TableRole>('leader');
  const [side, setSide] = useState<TableSide>('attacker');
  const [mode, setMode] = useState<MatchMode>('alliance');
  const [slots, setSlots] = useState(starterSlots);
  const [hand, setHand] = useState(() => starterHand('attacker'));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hotSlot, setHotSlot] = useState<{ side: TableSide; index: number } | null>(null);
  const [pings, setPings] = useState<TablePing[]>([]);
  const [pingKind, setPingKind] = useState<PingKind>('target');
  const [clicks, setClicks] = useState(0);
  const [status, setStatus] = useState('Kartı tutub boş slota at — və ya seçib slota kliklə.');
  const [ghost, setGhost] = useState<DragGhost | null>(null);
  const [landing, setLanding] = useState<{ side: TableSide; index: number } | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const dragMovedRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const slotsRef = useRef(slots);
  const handRef = useRef(hand);
  const sideRef = useRef(side);
  const permsRef = useRef(permissionsForRole('leader'));
  const unlimitedRef = useRef(unlimited);
  slotsRef.current = slots;
  handRef.current = hand;
  sideRef.current = side;
  unlimitedRef.current = unlimited;
  const { hit, pulse } = useCastleHit();

  const perms = useMemo(() => permissionsForRole(role), [role]);
  permsRef.current = perms;
  const modeLabel = MATCH_MODES.find((item) => item.id === mode)?.label ?? mode;

  const revealCard = useCallback(
    (card: TableCardInstance) => isSlotCardRevealed(perms, side, card.ownerSide),
    [perms, side]
  );

  const selectedIdRef = useRef<string | null>(null);
  const ignoreClickUntilRef = useRef(0);
  selectedIdRef.current = selectedId;

  const playCard = useCallback(
    (targetSide: TableSide, index: number, pickIdOverride?: string | null) => {
      if (Date.now() < ignoreClickUntilRef.current && !pickIdOverride) return false;
      if (!permsRef.current.canPlayCards) {
        setStatus('Bu rol kart ata bilməz.');
        return false;
      }
      if (targetSide !== sideRef.current) {
        setStatus('Kart yalnız öz ittifaqının 5 slotuna atılır.');
        return false;
      }

      const pickId = pickIdOverride || selectedIdRef.current || dragIdRef.current;
      if (!pickId) {
        setStatus('Əvvəl əldən kart seç və ya sürüşdür.');
        return false;
      }

      const currentSlots = slotsRef.current;
      const occupying = currentSlots[targetSide][index];
      const fromHand = handRef.current.find((card) => card.instanceId === pickId);
      if (!fromHand) {
        setStatus('Seçilmiş kart əldə tapılmadı.');
        return false;
      }

      const placed = unlimitedRef.current
        ? { ...makeInstance(fromHand.cardId, targetSide), ownerSide: targetSide }
        : { ...fromHand, ownerSide: targetSide };

      const nextSlots = {
        ...currentSlots,
        [targetSide]: [...currentSlots[targetSide]],
      };
      nextSlots[targetSide][index] = placed;
      setSlots(nextSlots);

      if (!unlimitedRef.current) {
        let nextHand = handRef.current.filter((card) => card.instanceId !== pickId);
        if (occupying) nextHand = [...nextHand, occupying];
        setHand(nextHand);
      }

      setSelectedId(null);
      dragIdRef.current = null;
      setLanding({ side: targetSide, index });
      window.setTimeout(() => {
        setLanding((prev) =>
          prev && prev.side === targetSide && prev.index === index ? null : prev
        );
      }, 480);
      const left = TABLE_SLOT_COUNT - nextSlots[targetSide].filter(Boolean).length;
      const title = catalogCard(fromHand.cardId)?.title ?? 'Kart';
      setStatus(
        occupying
          ? `${title} əvəzləndi. Boş slot: ${left}.`
          : `${title} masaya düşdü. Boş slot: ${left}.`
      );
      return true;
    },
    []
  );

  const returnSlot = useCallback((index: number) => {
    const targetSide = sideRef.current;
    const occupying = slotsRef.current[targetSide][index];
    if (!occupying) return;
    const nextSlots = {
      ...slotsRef.current,
      [targetSide]: [...slotsRef.current[targetSide]],
    };
    nextSlots[targetSide][index] = null;
    setSlots(nextSlots);
    if (!unlimitedRef.current) {
      setHand([...handRef.current, occupying]);
    }
    setStatus('Kart əlinə qayıtdı.');
  }, []);

  const clearDrag = useCallback(() => {
    dragIdRef.current = null;
    dragMovedRef.current = false;
    dragStartRef.current = null;
    setGhost(null);
    setHotSlot(null);
  }, []);

  const onHandPointerDown = useCallback(
    (id: string, event: React.PointerEvent<HTMLButtonElement>) => {
      if (!permsRef.current.canPlayCards) return;
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      dragIdRef.current = id;
      dragMovedRef.current = false;
      dragStartRef.current = { x: event.clientX, y: event.clientY };
      setSelectedId(id);
    },
    []
  );

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const id = dragIdRef.current;
      const start = dragStartRef.current;
      if (!id || !start) return;
      const dx = event.clientX - start.x;
      const dy = start.y - event.clientY;
      const dist = Math.hypot(dx, event.clientY - start.y);
      if (!dragMovedRef.current) {
        if (dist < DRAG_THRESHOLD) return;
        if (Math.abs(dx) > dy + 6) {
          dragIdRef.current = null;
          dragStartRef.current = null;
          return;
        }
        dragMovedRef.current = true;
      }
      event.preventDefault();
      const card = handRef.current.find((item) => item.instanceId === id);
      if (!card) return;
      setGhost({ instanceId: id, cardId: card.cardId, x: event.clientX, y: event.clientY });
      setHotSlot(slotFromPoint(event.clientX, event.clientY));
    };

    const onUp = (event: PointerEvent) => {
      const id = dragIdRef.current;
      if (!id) return;
      const moved = dragMovedRef.current;
      const target = slotFromPoint(event.clientX, event.clientY);
      if (moved && target) {
        ignoreClickUntilRef.current = Date.now() + 450;
        playCard(target.side, target.index, id);
      } else if (!moved) {
        setSelectedId(id);
        setStatus('Kart seçildi — boş slota kliklə və ya tutub at.');
      }
      clearDrag();
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [clearDrag, playCard]);

  const onSideChange = (next: TableSide) => {
    setSide(next);
    setHand(starterHand(next));
    setSelectedId(null);
    clearDrag();
    setStatus(next === 'attacker' ? 'Hücum tərəfindən baxırsan — 5 slota kart at.' : 'Müdafiə tərəfindən baxırsan — 5 slota kart at.');
  };

  const onRoleChange = (next: TableRole) => {
    setRole(next);
    clearDrag();
    const nextPerms = permissionsForRole(next);
    if (nextPerms.canRevealAll) setStatus('Komanda görünüşü: bütün masadakı kartlar üzüaçıq. Kartı tutub slota at.');
    else if (next === 'clicker') setStatus('Klikləyən: rəqibin kartları üzüaşağıdır. Kart at və qalaya kliklə.');
    else setStatus('Koordinator: kartlar gizli. Masaya klikləyib hədəf nişanla.');
  };

  return (
    <div className={`${styles.canvas} ${styles[`role_${role}`]}`}>
      <header className={styles.hud}>
        <AppLink href="/alliance" className={styles.backLink}>
          ← İttifaq
        </AppLink>
        <RoleSwitcher
          role={role}
          side={side}
          mode={mode}
          onRole={onRoleChange}
          onSide={onSideChange}
          onMode={setMode}
        />
        <div className={styles.permPills}>
          <span className={`${styles.pill} ${perms.canRevealAll ? styles.pillOn : ''}`}>
            Hamısı {perms.canRevealAll ? 'açıq' : 'gizli'}
          </span>
          <span className={`${styles.pill} ${perms.canPlayCards ? styles.pillPlay : ''}`}>
            Oynama {perms.canPlayCards ? 'on' : 'off'}
          </span>
          <span className={`${styles.pill} ${perms.canClickRaid ? styles.pillClick : ''}`}>
            Klik {perms.canClickRaid ? 'on' : 'off'}
          </span>
          <span className={`${styles.pill} ${perms.canPing ? styles.pillPing : ''}`}>
            Ping {perms.canPing ? 'on' : 'off'}
          </span>
          {unlimited ? <span className={`${styles.pill} ${styles.pillPlay}`}>ID 1 · ∞ kart</span> : null}
          <button
            type="button"
            className={styles.resetBtn}
            onClick={() => {
              setSlots(emptySlots());
              setHand(starterHand(side));
              setPings([]);
              setClicks(0);
              setSelectedId(null);
              clearDrag();
              setStatus('Masa sıfırlandı — kartı tutub slota at.');
            }}
          >
            Sıfırla
          </button>
        </div>
      </header>

      <p className={styles.status} role="status">
        {status}
      </p>

      <div
        className={styles.tableWrap}
        onClick={(event) => {
          if (!perms.canPing) return;
          const target = event.target as Element;
          if (target.closest('[data-table-slot], button, a, input')) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const meta = PING_KINDS.find((item) => item.id === pingKind);
          setPings((prev) => [
            ...prev,
            {
              id: `ping-${Date.now()}`,
              x: ((event.clientX - rect.left) / rect.width) * 100,
              y: ((event.clientY - rect.top) / rect.height) * 100,
              kind: pingKind,
              label: meta?.label ?? 'Ping',
              createdAt: Date.now(),
            },
          ]);
        }}
      >
        <div className={styles.tableFelt} />
        <div className={styles.tableFrame} aria-hidden />
        <PlayerSeats mode={mode} viewerSide={side} />
        <div className={styles.board}>
          <CardSlotZone
            side="defender"
            slots={slots.defender}
            revealCard={revealCard}
            dropEnabled={perms.canPlayCards}
            selectedReady={Boolean(selectedId)}
            hotSlot={hotSlot?.side === 'defender' ? hotSlot.index : null}
            landingIndex={landing?.side === 'defender' ? landing.index : null}
            onHoverSlot={(index) => setHotSlot(index == null ? null : { side: 'defender', index })}
            onDropSlot={(index) => playCard('defender', index)}
            onReturnSlot={returnSlot}
          />
          <CastleCore
            hit={hit}
            modeLabel={modeLabel}
            clickable={perms.canClickRaid}
            onCastleClick={() => {
              setClicks((n) => n + 1);
              pulse();
            }}
          />
          <CardSlotZone
            side="attacker"
            slots={slots.attacker}
            revealCard={revealCard}
            dropEnabled={perms.canPlayCards}
            selectedReady={Boolean(selectedId)}
            hotSlot={hotSlot?.side === 'attacker' ? hotSlot.index : null}
            landingIndex={landing?.side === 'attacker' ? landing.index : null}
            onHoverSlot={(index) => setHotSlot(index == null ? null : { side: 'attacker', index })}
            onDropSlot={(index) => playCard('attacker', index)}
            onReturnSlot={returnSlot}
          />
        </div>
        <CoordinatorOverlay pings={pings} />
      </div>

      <CoordinatorToolbar
        visible={perms.canPing}
        pingKind={pingKind}
        onKind={setPingKind}
        onClear={() => setPings([])}
      />

      <ClickerPanel
        visible={perms.canClickRaid}
        clicks={clicks}
        needed={RAID_CLICKS_NEEDED}
        onClickRaid={() => {
          setClicks((n) => n + 1);
          pulse();
        }}
      />

      <HandDock
        cards={hand}
        selectedId={selectedId}
        enabled={perms.canPlayCards}
        draggingId={ghost?.instanceId ?? null}
        unlimited={unlimited}
        lockedReason="Koordinator kart ata və aça bilməz — yalnız xəritə/ping alətləri aktivdir."
        onSelect={(id) => {
          setSelectedId(id);
          setStatus('Kart seçildi — boş slota kliklə və ya tutub at.');
        }}
        onPointerDown={onHandPointerDown}
      />

      {ghost ? (
        <div className={styles.dragGhost} style={{ left: ghost.x, top: ghost.y }} aria-hidden>
          <TableCard card={{ instanceId: ghost.instanceId, cardId: ghost.cardId, ownerSide: side }} revealed compact />
        </div>
      ) : null}
    </div>
  );
}
