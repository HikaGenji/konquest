import type { Rng } from './rng';

export type PowerId =
  | 'usa'
  | 'china'
  | 'russia'
  | 'eu'
  | 'india'
  | 'brazil';

export interface Power {
  id: PowerId;
  name: string;
  /** Short label shown on the map. */
  short: string;
  color: string;
  /** Territory id of this power's capital / starting region. */
  capital: string;
}

export type EdgeType = 'land' | 'sea';

export interface Territory {
  id: string;
  name: string;
  continent: string;
  /** Layout coordinates on a 1000 x 520 canvas (lon/lat-ish). */
  x: number;
  y: number;
  /** Economic value: income per turn and contribution to score / victory. */
  value: number;
  coastal: boolean;
}

/** An undirected connection between two territories. */
export interface Edge {
  a: string;
  b: string;
  type: EdgeType;
}

export interface TerritoryState {
  /** Owning power id, or null for an independent (neutral) territory. */
  owner: PowerId | null;
  armies: number;
  navies: number;
}

export interface PlayerState {
  power: PowerId;
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
  /** Powers controlled by a human, in turn order. */
  powers: PowerId[];
  seed: number;
  maxTurns: number;
}

export interface GameState {
  status: GameStatus;
  config: GameConfig;
  turn: number;
  currentPlayerIndex: number;
  players: PlayerState[];
  territories: Record<string, TerritoryState>;
  rng: Rng;
  log: LogEntry[];
  winner: PowerId | null;
  /** Territory ids the CURRENT player has revealed (via spies) this turn. */
  intel: string[];
}

export interface LogEntry {
  turn: number;
  power: PowerId | null;
  message: string;
}

// --- Actions -------------------------------------------------------------

export interface BuildAction {
  type: 'build';
  territoryId: string;
  armies: number;
  navies: number;
}

export interface MoveAction {
  type: 'move';
  from: string;
  to: string;
  armies: number;
  navies: number;
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

/** Pay to reveal a single foreign territory's forces for the current turn. */
export interface SpyAction {
  type: 'spy';
  territoryId: string;
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
  attArmiesLeft: number;
  attNaviesLeft: number;
  defArmiesLeft: number;
  defNaviesLeft: number;
  rounds: number;
}
