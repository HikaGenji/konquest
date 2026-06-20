import { makeRng, nextInt, rollHits } from './rng';
import {
  canHold,
  FACTION_BY_ID,
  generateMap,
  initialTileStates,
  UNIT,
} from './map';
import {
  ageFor,
  hasGlobalStrike,
  MAX_TECH,
  STRIKE_TECH,
} from './tech';
import { HERO_BY_ID } from './heroes';
import type { HeroMods } from './heroes';
import type {
  CombatResult,
  FactionId,
  GameAction,
  GameConfig,
  GameState,
  LogEntry,
  PlayerState,
  ResearchTrack,
  Tile,
  TileState,
  UnitType,
} from './types';

// --- Tunable constants ---------------------------------------------------

export const RULES = {
  ATT_HIT: 0.5,
  DEF_HIT: 0.55,
  NEUTRAL_DEF_HIT: 0.45,
  TECH_HIT_BONUS: 0.06,
  TECH_HIT_CROSS: 0.03,
  HIT_MIN: 0.2,
  HIT_MAX: 0.85,
  RESEARCH_BASE: 30,
  RESEARCH_STEP: 25,
  INCOME_PER_INDUSTRY: 0.15,
  STRIKE_COST: 15,
  STRIKE_BASE_DMG: 2,
  STRIKE_GLOBAL_BONUS: 2,
  SPY_COST: 10,
  STARTING_TREASURY: 60,
  CAPITAL_ARMIES: 10,
  VICTORY_VALUE_FRACTION: 0.6,
  /** Actions (build/move/research/strike/spy) allowed per turn. */
  ACTIONS_PER_TURN: 3,
} as const;

export const ACTIONS_PER_TURN = RULES.ACTIONS_PER_TURN;

export function unitCost(unit: UnitType): number {
  return UNIT[unit].cost;
}

export function researchCost(level: number): number {
  return RULES.RESEARCH_BASE + RULES.RESEARCH_STEP * (level - 1);
}

// --- Hero modifiers ------------------------------------------------------

export function heroMods(player: PlayerState): HeroMods {
  return HERO_BY_ID[player.hero].mods;
}
export function effectiveStrikeTech(player: PlayerState): number {
  return STRIKE_TECH - heroMods(player).strikeTechReduction;
}
export function canPlayerStrike(player: PlayerState): boolean {
  return player.offense >= effectiveStrikeTech(player);
}
export function unitCostFor(player: PlayerState, unit: UnitType): number {
  return Math.max(1, Math.round(UNIT[unit].cost * (1 - heroMods(player).unitDiscount[unit])));
}
export function buildCostFor(
  player: PlayerState,
  counts: { army: number; navy: number; air: number },
): number {
  return (
    counts.army * unitCostFor(player, 'army') +
    counts.navy * unitCostFor(player, 'navy') +
    counts.air * unitCostFor(player, 'air')
  );
}
export function researchCostFor(player: PlayerState, level: number): number {
  return Math.floor(researchCost(level) * (1 - heroMods(player).researchDiscount));
}
export function spyCostFor(player: PlayerState): number {
  return Math.floor(RULES.SPY_COST * (1 - heroMods(player).spyDiscount));
}
export function strikeCostFor(player: PlayerState): number {
  return Math.floor(RULES.STRIKE_COST * heroMods(player).strikeCostMult);
}

function clampHit(x: number): number {
  return Math.min(RULES.HIT_MAX, Math.max(RULES.HIT_MIN, x));
}

export function attackerHit(attOffense: number, defDefense: number): number {
  return clampHit(
    RULES.ATT_HIT +
      RULES.TECH_HIT_BONUS * (attOffense - 1) -
      RULES.TECH_HIT_CROSS * (defDefense - 1),
  );
}

export function defenderHit(defDefense: number, attOffense: number, isNeutral: boolean): number {
  const base = isNeutral ? RULES.NEUTRAL_DEF_HIT : RULES.DEF_HIT;
  return clampHit(
    base +
      RULES.TECH_HIT_BONUS * (defDefense - 1) -
      RULES.TECH_HIT_CROSS * (attOffense - 1),
  );
}

// --- Helpers -------------------------------------------------------------

export function clone(state: GameState): GameState {
  return structuredClone(state);
}

function log(state: GameState, faction: FactionId | null, message: string): void {
  const entry: LogEntry = { turn: state.turn, faction, message };
  state.log.push(entry);
  if (state.log.length > 200) state.log.shift();
}

export function tileById(state: GameState, id: string): Tile | undefined {
  return state.map.find((t) => t.id === id);
}

export function tileTotal(ts: TileState): number {
  return ts.army + ts.navy + ts.air;
}

export function ownedTiles(state: GameState, faction: FactionId): string[] {
  return Object.keys(state.tiles).filter((id) => state.tiles[id].owner === faction);
}

export function ownedValue(state: GameState, faction: FactionId): number {
  const byId = new Map(state.map.map((t) => [t.id, t]));
  return ownedTiles(state, faction).reduce((s, id) => s + (byId.get(id)?.value ?? 0), 0);
}

export function totalValue(state: GameState): number {
  return state.map.reduce((s, t) => s + t.value, 0);
}

export function incomeMultiplier(industry: number): number {
  return 1 + (industry - 1) * RULES.INCOME_PER_INDUSTRY;
}

export function incomeFor(state: GameState, player: PlayerState): number {
  const mult = incomeMultiplier(player.industry) + heroMods(player).incomeBonus;
  return Math.floor(ownedValue(state, player.faction) * mult);
}

export function currentPlayer(state: GameState): PlayerState {
  return state.players[state.currentPlayerIndex];
}

export function neighborsOf(state: GameState, id: string): string[] {
  return state.adj[id] ?? [];
}

/** Tiles whose forces the current player can see (own + spied). */
export function revealedTo(state: GameState): Set<string> {
  const faction = currentPlayer(state).faction;
  const set = new Set<string>(state.intel);
  for (const id of Object.keys(state.tiles)) {
    if (state.tiles[id].owner === faction) set.add(id);
  }
  return set;
}

export function isRevealed(state: GameState, id: string): boolean {
  return (
    state.tiles[id]?.owner === currentPlayer(state).faction || state.intel.includes(id)
  );
}

// --- Setup ---------------------------------------------------------------

export function createGame(config: GameConfig): GameState {
  const gen = generateMap(config.seed, config.radius, config.factions.length);
  const tiles = initialTileStates(gen, config.factions, RULES.CAPITAL_ARMIES);

  const state: GameState = {
    status: 'playing',
    config,
    turn: 1,
    currentPlayerIndex: 0,
    players: config.factions.map((faction, i) => ({
      faction,
      hero: config.heroes[i],
      isAI: config.controllers[i] === 'ai',
      treasury: RULES.STARTING_TREASURY + HERO_BY_ID[config.heroes[i]].mods.startTreasury,
      alive: true,
      offense: 1,
      defense: 1,
      industry: 1,
    })),
    map: gen.map,
    adj: gen.adj,
    tiles,
    rng: makeRng(config.seed ^ 0x9e3779b9),
    log: [],
    winner: null,
    intel: [],
    actionsLeft: RULES.ACTIONS_PER_TURN,
  };

  // Apply heroes that start with extra armies on their capital.
  gen.starts.forEach((id, i) => {
    state.tiles[id].army += HERO_BY_ID[config.heroes[i]].mods.startArmies;
  });

  log(state, null, 'A new contest for the realm begins.');
  collectIncome(state);
  return state;
}

function collectIncome(state: GameState): void {
  const player = currentPlayer(state);
  if (!player.alive) return;
  const income = incomeFor(state, player);
  player.treasury += income;
  log(
    state,
    player.faction,
    `${FACTION_BY_ID[player.faction].name} collects $${income} (treasury $${player.treasury}).`,
  );
}

// --- Combat --------------------------------------------------------------

export function resolveCombat(
  state: GameState,
  attTotal: number,
  defTotal: number,
  isNeutral: boolean,
  attOffense: number,
  defDefense: number,
  attackBonus = 0,
  defenseBonus = 0,
): CombatResult {
  const rng = state.rng;
  let a = attTotal;
  let d = defTotal;
  let rounds = 0;
  const attChance = clampHit(attackerHit(attOffense, defDefense) + attackBonus);
  const defChance = clampHit(defenderHit(defDefense, attOffense, isNeutral) + defenseBonus);

  let safety = 0;
  while (a > 0 && d > 0 && safety++ < 5000) {
    const attHits = rollHits(rng, a, attChance);
    const defHits = rollHits(rng, d, defChance);
    a = Math.max(0, a - defHits);
    d = Math.max(0, d - attHits);
    rounds++;
  }

  return { attackerWins: d === 0 && a > 0, attLeft: a, defLeft: d, rounds };
}

type Forces = { army: number; navy: number; air: number };

/** Distribute `survivors` across the three unit types in their original ratio. */
function distribute(orig: Forces, survivors: number): Forces {
  const total = orig.army + orig.navy + orig.air;
  if (total === 0 || survivors <= 0) return { army: 0, navy: 0, air: 0 };
  if (survivors >= total) return { ...orig };
  const out = {
    army: Math.floor((orig.army / total) * survivors),
    navy: Math.floor((orig.navy / total) * survivors),
    air: Math.floor((orig.air / total) * survivors),
  };
  let used = out.army + out.navy + out.air;
  // Hand out the rounding remainder to the largest contingents first.
  const order = (['army', 'navy', 'air'] as UnitType[]).sort((x, y) => orig[y] - orig[x]);
  for (const u of order) {
    if (used >= survivors) break;
    if (orig[u] > out[u]) {
      out[u]++;
      used++;
    }
  }
  return out;
}

// --- Validation ----------------------------------------------------------

export interface ValidationOk {
  ok: true;
}
export interface ValidationErr {
  ok: false;
  reason: string;
}
export type Validation = ValidationOk | ValidationErr;

const ok: ValidationOk = { ok: true };
const err = (reason: string): ValidationErr => ({ ok: false, reason });

function movingTotal(a: { army: number; navy: number; air: number }): number {
  return a.army + a.navy + a.air;
}

export function validate(state: GameState, action: GameAction): Validation {
  if (state.status !== 'playing') return err('The game is over.');
  const player = currentPlayer(state);

  if (action.type !== 'endTurn' && state.actionsLeft <= 0) {
    return err('No actions left this turn — end your turn.');
  }

  if (action.type === 'build') {
    const ts = state.tiles[action.tileId];
    const tile = tileById(state, action.tileId);
    if (!ts || !tile) return err('Unknown tile.');
    if (ts.owner !== player.faction) return err('You can only build on your own tile.');
    if (action.army < 0 || action.navy < 0 || action.air < 0) return err('Invalid quantity.');
    if (movingTotal(action) === 0) return err('Nothing to build.');
    if (action.army > 0 && !canHold(tile.type, 'army')) return err('Armies need a land tile.');
    if (action.navy > 0 && !canHold(tile.type, 'navy')) return err('Navies need a sea tile.');
    if (action.air > 0 && !canHold(tile.type, 'air')) return err('Cannot build air here.');
    if (buildCostFor(player, action) > player.treasury) return err('Not enough money.');
    return ok;
  }

  if (action.type === 'move') {
    const from = state.tiles[action.from];
    const to = state.tiles[action.to];
    const toTile = tileById(state, action.to);
    if (!from || !to || !toTile) return err('Unknown tile.');
    if (from.owner !== player.faction) return err('You can only move from your own tile.');
    if (!neighborsOf(state, action.from).includes(action.to)) return err('Tiles are not adjacent.');
    if (action.army < 0 || action.navy < 0 || action.air < 0) return err('Invalid quantity.');
    if (action.army > from.army || action.navy > from.navy || action.air > from.air) {
      return err('Not enough units.');
    }
    if (movingTotal(action) === 0) return err('Nothing to move.');
    if (action.army > 0 && !canHold(toTile.type, 'army')) return err('Armies cannot enter that terrain.');
    if (action.navy > 0 && !canHold(toTile.type, 'navy')) return err('Navies can only go on sea.');
    if (action.air > 0 && !canHold(toTile.type, 'air')) return err('Air cannot go there.');
    return ok;
  }

  if (action.type === 'research') {
    const level = trackLevel(player, action.track);
    if (level >= MAX_TECH) return err('Already at the highest age for that track.');
    if (researchCostFor(player, level) > player.treasury) return err('Not enough money to research.');
    return ok;
  }

  if (action.type === 'strike') {
    const from = state.tiles[action.from];
    const to = state.tiles[action.to];
    if (!from || !to) return err('Unknown tile.');
    if (from.owner !== player.faction) return err('You can only strike from your own tile.');
    if (!canPlayerStrike(player)) return err('Strikes need higher Weapons tech (Drone Age).');
    if (to.owner === player.faction) return err('You cannot strike your own tile.');
    if (tileTotal(to) <= 0) return err('No forces there to strike.');
    if (!strikeTargets(state, action.from, player).has(action.to)) {
      return err('That target is out of range.');
    }
    if (strikeCostFor(player) > player.treasury) return err('Not enough money to strike.');
    return ok;
  }

  if (action.type === 'spy') {
    const t = state.tiles[action.tileId];
    if (!t) return err('Unknown tile.');
    if (t.owner === player.faction) return err('You already see your own forces.');
    if (state.intel.includes(action.tileId)) return err('Already revealed this turn.');
    if (spyCostFor(player) > player.treasury) return err('Not enough money to spy.');
    return ok;
  }

  return ok; // endTurn
}

/** Enemy/neutral tiles a faction can strike from `from`, given its hero/weapons. */
export function strikeTargets(state: GameState, from: string, player: PlayerState): Set<string> {
  if (!canPlayerStrike(player)) return new Set();
  const owner = state.tiles[from].owner;
  const inRange = hasGlobalStrike(player.offense) ? Object.keys(state.tiles) : neighborsOf(state, from);
  return new Set(
    inRange.filter((id) => {
      const t = state.tiles[id];
      return id !== from && t.owner !== owner && tileTotal(t) > 0;
    }),
  );
}

// --- Reducer -------------------------------------------------------------

export function apply(state: GameState, action: GameAction): GameState {
  const check = validate(state, action);
  if (!check.ok) {
    const next = clone(state);
    log(next, currentPlayer(next).faction, `Action rejected: ${check.reason}`);
    return next;
  }
  const next = clone(state);
  switch (action.type) {
    case 'build':
      applyBuild(next, action);
      break;
    case 'move':
      applyMove(next, action);
      break;
    case 'research':
      applyResearch(next, action);
      break;
    case 'strike':
      applyStrike(next, action);
      break;
    case 'spy':
      applySpy(next, action);
      break;
    case 'endTurn':
      applyEndTurn(next);
      break;
  }
  if (action.type !== 'endTurn') next.actionsLeft = Math.max(0, next.actionsLeft - 1);
  return next;
}

function applyBuild(state: GameState, action: Extract<GameAction, { type: 'build' }>): void {
  const player = currentPlayer(state);
  const ts = state.tiles[action.tileId];
  const cost = buildCostFor(player, action);
  player.treasury -= cost;
  ts.army += action.army;
  ts.navy += action.navy;
  ts.air += action.air;
  const parts: string[] = [];
  if (action.army) parts.push(`${action.army} ${UNIT.army.glyph}`);
  if (action.navy) parts.push(`${action.navy} ${UNIT.navy.glyph}`);
  if (action.air) parts.push(`${action.air} ${UNIT.air.glyph}`);
  log(state, player.faction, `Built ${parts.join(' & ')} (–$${cost}).`);
}

function applyMove(state: GameState, action: Extract<GameAction, { type: 'move' }>): void {
  const player = currentPlayer(state);
  const from = state.tiles[action.from];
  const to = state.tiles[action.to];
  const moving: Forces = { army: action.army, navy: action.navy, air: action.air };

  from.army -= moving.army;
  from.navy -= moving.navy;
  from.air -= moving.air;

  if (to.owner === player.faction) {
    to.army += moving.army;
    to.navy += moving.navy;
    to.air += moving.air;
    log(state, player.faction, 'Moved forces to a friendly tile.');
    return;
  }

  const isNeutral = to.owner === null;
  const defender = to.owner ? state.players.find((p) => p.faction === to.owner) : undefined;
  const defDefense = defender ? defender.defense : 1;
  const attTotal = movingTotal(moving);
  const defTotal = tileTotal(to);
  const result = resolveCombat(
    state,
    attTotal,
    defTotal,
    isNeutral,
    player.offense,
    defDefense,
    heroMods(player).attackHit,
    defender ? heroMods(defender).defenseHit : 0,
  );
  const toName = tileLabel(state, action.to);
  const defName = to.owner ? FACTION_BY_ID[to.owner].name : 'the local garrison';

  if (result.attackerWins) {
    const prevOwner = to.owner;
    const survivors = distribute(moving, result.attLeft);
    to.owner = player.faction;
    to.army = survivors.army;
    to.navy = survivors.navy;
    to.air = survivors.air;
    log(
      state,
      player.faction,
      `${FACTION_BY_ID[player.faction].name} captured ${toName} from ${defName} ` +
        `(${result.attLeft} units survive).`,
    );
    if (prevOwner) checkEliminated(state, prevOwner);
  } else {
    const survivors = distribute({ army: to.army, navy: to.navy, air: to.air }, result.defLeft);
    to.army = survivors.army;
    to.navy = survivors.navy;
    to.air = survivors.air;
    log(
      state,
      player.faction,
      `${FACTION_BY_ID[player.faction].name}'s assault on ${toName} was repelled ` +
        `(${result.defLeft} defenders hold).`,
    );
  }
}

const TRACK_LABEL: Record<ResearchTrack, string> = {
  offense: 'weapons',
  defense: 'defenses',
  industry: 'industry',
};

function trackLevel(player: PlayerState, track: ResearchTrack): number {
  return track === 'offense'
    ? player.offense
    : track === 'defense'
      ? player.defense
      : player.industry;
}

function applyResearch(state: GameState, action: Extract<GameAction, { type: 'research' }>): void {
  const player = currentPlayer(state);
  const level = trackLevel(player, action.track);
  const cost = researchCostFor(player, level);
  player.treasury -= cost;
  if (action.track === 'offense') player.offense += 1;
  else if (action.track === 'defense') player.defense += 1;
  else player.industry += 1;
  const age = ageFor(player.offense, player.defense, player.industry);
  const extra =
    action.track === 'offense' && level + 1 === effectiveStrikeTech(player)
      ? ' — missile strikes unlocked!'
      : '';
  log(
    state,
    player.faction,
    `${FACTION_BY_ID[player.faction].name} advanced ${TRACK_LABEL[action.track]} to level ${level + 1} ` +
      `(${age.icon} ${age.name} Age, –$${cost})${extra}.`,
  );
}

function reduceForces(ts: TileState, amount: number): number {
  const before = ts.army + ts.navy + ts.air;
  const after = Math.max(0, before - amount);
  const survivors = distribute({ army: ts.army, navy: ts.navy, air: ts.air }, after);
  ts.army = survivors.army;
  ts.navy = survivors.navy;
  ts.air = survivors.air;
  return before - (ts.army + ts.navy + ts.air);
}

function applyStrike(state: GameState, action: Extract<GameAction, { type: 'strike' }>): void {
  const player = currentPlayer(state);
  const to = state.tiles[action.to];
  const cost = strikeCostFor(player);
  player.treasury -= cost;
  const global = hasGlobalStrike(player.offense);
  const base =
    RULES.STRIKE_BASE_DMG + (global ? RULES.STRIKE_GLOBAL_BONUS : 0) + heroMods(player).strikeDamageBonus;
  const damage = base + nextInt(state.rng, 0, player.offense);
  const killed = reduceForces(to, damage);
  log(
    state,
    player.faction,
    `${FACTION_BY_ID[player.faction].name} launched ${global ? 'an orbital strike' : 'a missile strike'} on ` +
      `${tileLabel(state, action.to)}, destroying ${killed} ${killed === 1 ? 'unit' : 'units'} (–$${cost}).`,
  );
}

function applySpy(state: GameState, action: Extract<GameAction, { type: 'spy' }>): void {
  const player = currentPlayer(state);
  const t = state.tiles[action.tileId];
  const cost = spyCostFor(player);
  player.treasury -= cost;
  state.intel.push(action.tileId);
  const holder = t.owner ? FACTION_BY_ID[t.owner].name : 'neutral forces';
  log(
    state,
    player.faction,
    `Spies scout ${tileLabel(state, action.tileId)}: ${tileTotal(t)} units (${holder}) (–$${cost}).`,
  );
}

function tileLabel(state: GameState, id: string): string {
  const t = tileById(state, id);
  return t ? `${t.type} (${t.q},${t.r})` : id;
}

function checkEliminated(state: GameState, faction: FactionId): void {
  const player = state.players.find((p) => p.faction === faction);
  if (player && player.alive && ownedTiles(state, faction).length === 0) {
    player.alive = false;
    log(state, faction, `${FACTION_BY_ID[faction].name} has been eliminated.`);
  }
}

function applyEndTurn(state: GameState): void {
  const ending = currentPlayer(state);
  log(state, ending.faction, `${FACTION_BY_ID[ending.faction].name} ends the turn.`);

  for (const p of state.players) checkEliminated(state, p.faction);
  if (checkVictory(state)) return;

  const n = state.players.length;
  let idx = state.currentPlayerIndex;
  for (let i = 0; i < n; i++) {
    idx = (idx + 1) % n;
    if (idx <= state.currentPlayerIndex) state.turn++;
    if (state.players[idx].alive) break;
  }
  state.currentPlayerIndex = idx;
  state.intel = [];
  state.actionsLeft = RULES.ACTIONS_PER_TURN;

  if (state.turn > state.config.maxTurns) {
    finishByScore(state);
    return;
  }
  collectIncome(state);
}

function checkVictory(state: GameState): boolean {
  const alive = state.players.filter((p) => p.alive);
  if (alive.length <= 1) {
    state.status = 'finished';
    state.winner = alive[0]?.faction ?? null;
    if (state.winner) {
      log(state, state.winner, `${FACTION_BY_ID[state.winner].name} stands alone — victory!`);
    }
    return true;
  }
  const total = totalValue(state);
  for (const p of alive) {
    if (ownedValue(state, p.faction) / total >= RULES.VICTORY_VALUE_FRACTION) {
      state.status = 'finished';
      state.winner = p.faction;
      log(state, p.faction, `${FACTION_BY_ID[p.faction].name} dominates the realm — victory!`);
      return true;
    }
  }
  return false;
}

function finishByScore(state: GameState): void {
  state.status = 'finished';
  let best: FactionId | null = null;
  let bestScore = -1;
  for (const p of state.players) {
    if (!p.alive) continue;
    const score = ownedValue(state, p.faction);
    if (score > bestScore) {
      bestScore = score;
      best = p.faction;
    }
  }
  state.winner = best;
  if (best) log(state, best, `Time's up — ${FACTION_BY_ID[best].name} wins on points.`);
}
