import type { ClickRaidMapSlot } from './ClickRaidMapEngine';

/** Pixi3D və Three ehtiyat engine üçün ortaq interfeys */
export interface IClickRaidMapEngine {
  init(): Promise<boolean>;
  resize(width: number, height: number): void;
  start(): void;
  stop(): void;
  syncRaids(slots: ClickRaidMapSlot[]): void;
  playAttack(attackId: string): void;
  playDeath(attackId: string): void;
  hitTest(clientX: number, clientY: number): string | null;
  isReady(): boolean;
}
