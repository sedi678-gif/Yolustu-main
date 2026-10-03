export type GameMode = '1v1' | '4v4';

export interface GameModeRules {
  mode: GameMode;
  seatsPerSide: number;
  hasRoles: boolean;
  energyLimit: number;
}
