"use client";

import { useCallback, useMemo, useRef, useState } from 'react';
import AppLink from '@/app/components/AppLink';
import CardSlotZone from './CardSlotZone';
import CastleCore, { useCastleHit } from './CastleCore';
import ClickerPanel from './ClickerPanel';
import CoordinatorOverlay, { CoordinatorToolbar } from './CoordinatorOverlay';
import HandDock from './HandDock';
import PlayerSeats from './PlayerSeats';
import RoleSwitcher from './RoleSwitcher';
import {
  MATCH_MODES,
  PING_KINDS,
  TABLE_SLOT_COUNT,
  emptySlots,
  isSlotCardRevealed,
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

export default function GameTableCanvas() {
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
  const [status, setStatus] = useState('Lider görünüşü — bütün kartlar açıqdır.');
  const dragIdRef = useRef<string | null>(null);
  const slotsRef = useRef(slots);
  const handRef = useRef(hand);
  slotsRef.current = slots;
  handRef.current = hand;
  const { hit, pulse } = useCastleHit();

  const perms = useMemo(() => permissionsForRole(role), [role]);
  const modeLabel = MATCH_MODES.find((item) => item.id === mode)?.label ?? mode;

  const revealCard = useCallback(
    (card: TableCardInstance) => isSlotCardRevealed(perms, side, card.ownerSide),
    [perms, side]
  );

  const playCard = useCallback(
    (targetSide: TableSide, index: number) => {
      if (!perms.canPlayCards) {
        setStatus('Bu rol kart ata bilməz.');
        return;
      }
      if (targetSide !== side) {
        setStatus('Kart yalnız öz ittifaqının 5 slotuna atılır.');
        return;
      }

      const pickId = selectedId || dragIdRef.current;
      if (!pickId) {
        setStatus('Əvvəl əldən kart seç və ya sürüşdür.');
        return;
      }

      const currentSlots = slotsRef.current;
      if (currentSlots[targetSide][index]) {
        setStatus('Bu slot doludur.');
        return;
      }

      const fromHand = handRef.current.find((c) => c.instanceId === pickId);
      if (!fromHand) {
        setStatus('Seçilmiş kart əldə tapılmadı.');
        return;
      }

      const nextSlots = {
        ...currentSlots,
        [targetSide]: [...currentSlots[targetSide]],
      };
      nextSlots[targetSide][index] = { ...fromHand, ownerSide: targetSide };
      setSlots(nextSlots);
      setHand(handRef.current.filter((c) => c.instanceId !== pickId));
      setSelectedId(null);
      dragIdRef.current = null;
      const left = TABLE_SLOT_COUNT - nextSlots[targetSide].filter(Boolean).length;
      setStatus(`Kart masaya üzüaşağı düşdü. Boş slot: ${left}.`);
    },
    [perms.canPlayCards, selectedId, side]
  );

  const onSideChange = (next: TableSide) => {
    setSide(next);
    setHand(starterHand(next));
    setSelectedId(null);
    setStatus(next === 'attacker' ? 'Hücum tərəfindən baxırsan.' : 'Müdafiə tərəfindən baxırsan.');
  };

  const onRoleChange = (next: TableRole) => {
    setRole(next);
    const nextPerms = permissionsForRole(next);
    if (nextPerms.canRevealAll) setStatus('Komanda görünüşü: bütün masadakı kartlar üzüaçıq.');
    else if (next === 'clicker') setStatus('Klikləyən: rəqibin kartları üzüaşağıdır. Kart at və kliklə.');
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
          <button
            type="button"
            className={styles.resetBtn}
            onClick={() => {
              setSlots(emptySlots());
              setHand(starterHand(side));
              setPings([]);
              setClicks(0);
              setSelectedId(null);
              setStatus('Masa sıfırlandı.');
            }}
          >
            Sıfırla
          </button>
        </div>
      </header>

      <p className={styles.status} role="status">
        {status}
      </p>

      <div className={styles.tableWrap}>
        <div className={styles.tableFelt} />
        <PlayerSeats mode={mode} viewerSide={side} />
        <div className={styles.board}>
          <CardSlotZone
            side="defender"
            slots={slots.defender}
            revealCard={revealCard}
            dropEnabled={perms.canPlayCards && side === 'defender'}
            hotSlot={hotSlot?.side === 'defender' ? hotSlot.index : null}
            onHoverSlot={(index) => setHotSlot(index == null ? null : { side: 'defender', index })}
            onDropSlot={(index) => playCard('defender', index)}
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
            dropEnabled={perms.canPlayCards && side === 'attacker'}
            hotSlot={hotSlot?.side === 'attacker' ? hotSlot.index : null}
            onHoverSlot={(index) => setHotSlot(index == null ? null : { side: 'attacker', index })}
            onDropSlot={(index) => playCard('attacker', index)}
          />
        </div>
        <CoordinatorOverlay
          enabled={perms.canPing}
          pings={pings}
          onPing={(x, y) => {
            const meta = PING_KINDS.find((item) => item.id === pingKind);
            setPings((prev) => [
              ...prev,
              {
                id: `ping-${Date.now()}`,
                x,
                y,
                kind: pingKind,
                label: meta?.label ?? 'Ping',
                createdAt: Date.now(),
              },
            ]);
          }}
        />
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
        lockedReason="Koordinator kart ata və aça bilməz — yalnız xəritə/ping alətləri aktivdir."
        onSelect={setSelectedId}
        onDragStart={(id) => {
          dragIdRef.current = id;
          setSelectedId(id);
        }}
      />
    </div>
  );
}
