import type { Rng } from './rng';

export type FactionId = 'crimson' | 'azure' | 'verdant' | 'amber';

export interface Faction {
  id: FactionId;
  name: string;
  color: string;
}

export type TileType = 'land' | 'sea' | 'mountain';
export type UnitType = 'army' | 'navy' | 'air';

export type HeroId =
  | 'caesar'
  | 'attila'
  | 'leonidas'
  | 'genghis'
  | 'napoleon'
  | 'alexander'
  | 'cleopatra'
  | 'suntzu'
  | 'hannibal'
  | 'saladin';

export interface Tile {
  id: string;
  q: number;
  r: number;
  /** Pixel-space centre for rendering. */
  x: number;
  y: number;
  type: TileType;
  /** Economic value: income per turn and contribution to score / victory. */
  value: number;
}

export interface TileState {
  owner: FactionId | null;
  army: number;
  navy: number;
  air: number;
}

export interface PlayerState {
  faction: FactionId;
  hero: HeroId;
  treasury: number;
  alive: boolean;
  /** Weapons tech (offense), 1..MAX_TECH. */
  offense: number;
  /** Defenses tech (defense), 1..MAX_TECH. */
  defense: number;
  /** Industry tech (economy / income multiplier), 1..MAX_TECH. */
  industry: number;
}

export type ResearchTrack = 'offense' | 'defense' | 'industry';

export type GameStatus = 'playing' | 'finished';

export interface GameConfig {
  factions: FactionId[];
  /** Chosen hero per faction, in the same order. */
  heroes: HeroId[];
  seed: number;
  maxTurns: number;
  /** Hex board radius (board size). */
  radius: number;
}

export interface GameState {
  status: GameStatus;
  config: GameConfig;
  turn: number;
  currentPlayerIndex: number;
  players: PlayerState[];
  /** Static board geometry. */
  map: Tile[];
  /** Adjacency: tile id -> neighbour tile ids. */
  adj: Record<string, string[]>;
  /** Dynamic per-tile ownership and garrisons. */
  tiles: Record<string, TileState>;
  rng: Rng;
  log: LogEntry[];
  winner: FactionId | null;
  /** Tile ids the CURRENT player has revealed (via spies) this turn. */
  intel: string[];
}

export interface LogEntry {
  turn: number;
  faction: FactionId | null;
  message: string;
}

// --- Actions -------------------------------------------------------------

export interface BuildAction {
  type: 'build';
  tileId: string;
  army: number;
  navy: number;
  air: number;
}

export interface MoveAction {
  type: 'move';
  from: string;
  to: string;
  army: number;
  navy: number;
  air: number;
}

export interface ResearchAction {
  type: 'research';
  track: ResearchTrack;
}

/** Ranged bombardment unlocked by Weapons tech — damages but never captures. */
export interface StrikeAction {
  type: 'strike';
  from: string;
  to: string;
}

/** Pay to reveal a single foreign tile's forces for the current turn. */
export interface SpyAction {
  type: 'spy';
  tileId: string;
}

export interface EndTurnAction {
  type: 'endTurn';
}

export type GameAction =
  | BuildAction
  | MoveAction
  | ResearchAction
  | StrikeAction
  | SpyAction
  | EndTurnAction;

export interface CombatResult {
  attackerWins: boolean;
  attLeft: number;
  defLeft: number;
  rounds: number;
}
