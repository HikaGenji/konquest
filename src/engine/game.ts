import { makeRng, nextFloat, rollHits } from './rng';
import {
  ADJACENCY,
  edgeType,
  POWER_BY_ID,
  TERRITORIES,
  TERRITORY_BY_ID,
  TOTAL_MAP_VALUE,
} from './map';
import { ageFor, MAX_TECH } from './tech';
import type {
  CombatResult,
  GameAction,
  GameConfig,
  GameState,
  LogEntry,
  PowerId,
  TerritoryState,
} from './types';

// --- Tunable constants ---------------------------------------------------

export const RULES = {
  ARMY_COST: 10,
  NAVY_COST: 30,
  /** Armies a single navy can carry across a sea edge. */
  CARRY_PER_NAVY: 4,
  /** Base per-round hit probability for attacking armies (tech level 1). */
  ATT_HIT: 0.5,
  /** Base per-round hit probability for a defending great power (tech 1). */
  DEF_HIT: 0.55,
  /** Independent (neutral) defenders are less effective. */
  NEUTRAL_DEF_HIT: 0.45,
  /** Hit-chance gained per level of your OWN relevant tech. */
  TECH_HIT_BONUS: 0.06,
  /** Hit-chance lost to each level of the ENEMY's opposing tech. */
  TECH_HIT_CROSS: 0.03,
  HIT_MIN: 0.2,
  HIT_MAX: 0.85,
  /** Cost to advance a research track from `level` to `level + 1`. */
  RESEARCH_BASE: 30,
  RESEARCH_STEP: 25,
  STARTING_TREASURY: 60,
  CAPITAL_ARMIES: 12,
  CAPITAL_NAVIES: 4,
  /** Win immediately when controlling this fraction of total map value. */
  VICTORY_VALUE_FRACTION: 0.6,
} as const;

/** Money required to advance an offense/defense track from `level` to next. */
export function researchCost(level: number): number {
  return RULES.RESEARCH_BASE + RULES.RESEARCH_STEP * (level - 1);
}

function clampHit(x: number): number {
  return Math.min(RULES.HIT_MAX, Math.max(RULES.HIT_MIN, x));
}

/** Per-round hit chance for an attacker, given both sides' tech levels. */
export function attackerHit(attOffense: number, defDefense: number): number {
  return clampHit(
    RULES.ATT_HIT +
      RULES.TECH_HIT_BONUS * (attOffense - 1) -
      RULES.TECH_HIT_CROSS * (defDefense - 1),
  );
}

/** Per-round hit chance for a defender, given both sides' tech levels. */
export function defenderHit(
  defDefense: number,
  attOffense: number,
  isNeutral: boolean,
): number {
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

function neutralGarrison(value: number): number {
  // Smaller, weaker than great-power capitals but scales with worth.
  return value + 1;
}

function log(state: GameState, power: PowerId | null, message: string): void {
  const entry: LogEntry = { turn: state.turn, power, message };
  state.log.push(entry);
  // Keep the log bounded.
  if (state.log.length > 200) state.log.shift();
}

export function ownedTerritories(state: GameState, power: PowerId): string[] {
  return Object.keys(state.territories).filter(
    (id) => state.territories[id].owner === power,
  );
}

export function ownedValue(state: GameState, power: PowerId): number {
  return ownedTerritories(state, power).reduce(
    (s, id) => s + TERRITORY_BY_ID[id].value,
    0,
  );
}

export function currentPlayer(state: GameState) {
  return state.players[state.currentPlayerIndex];
}

/** Territories the current player may act from / move to. */
export function neighbors(territoryId: string): Record<string, 'land' | 'sea'> {
  return ADJACENCY[territoryId] ?? {};
}

// --- Setup ---------------------------------------------------------------

export function createGame(config: GameConfig): GameState {
  const territories: Record<string, TerritoryState> = {};
  for (const t of TERRITORIES) {
    territories[t.id] = {
      owner: null,
      armies: neutralGarrison(t.value),
      navies: t.coastal ? 1 : 0,
    };
  }

  const state: GameState = {
    status: 'playing',
    config,
    turn: 1,
    currentPlayerIndex: 0,
    players: config.powers.map((power) => ({
      power,
      treasury: RULES.STARTING_TREASURY,
      alive: true,
      offense: 1,
      defense: 1,
    })),
    territories,
    rng: makeRng(config.seed),
    log: [],
    winner: null,
  };

  // Seat each active power in its capital with a strong garrison.
  for (const power of config.powers) {
    const capital = POWER_BY_ID[power].capital;
    territories[capital] = {
      owner: power,
      armies: RULES.CAPITAL_ARMIES,
      navies: TERRITORY_BY_ID[capital].coastal ? RULES.CAPITAL_NAVIES : 0,
    };
  }

  log(state, null, 'The contest for the modern world begins.');
  collectIncome(state);
  return state;
}

function collectIncome(state: GameState): void {
  const player = currentPlayer(state);
  if (!player.alive) return;
  const income = ownedValue(state, player.power);
  player.treasury += income;
  log(
    state,
    player.power,
    `${POWER_BY_ID[player.power].name} collects $${income} (treasury $${player.treasury}).`,
  );
}

// --- Combat --------------------------------------------------------------

export function resolveCombat(
  state: GameState,
  attArmies: number,
  attNavies: number,
  defArmies: number,
  defNavies: number,
  isNeutral: boolean,
  isSea: boolean,
  attOffense: number,
  defDefense: number,
): CombatResult {
  const rng = state.rng;
  let aA = attArmies;
  let aN = attNavies;
  let dA = defArmies;
  let dN = defNavies;
  let rounds = 0;

  const attChance = attackerHit(attOffense, defDefense);
  const defChance = defenderHit(defDefense, attOffense, isNeutral);

  // 1. Naval battle for sea invasions where the defender has a fleet.
  if (isSea && dN > 0 && aN > 0) {
    let safety = 0;
    while (aN > 0 && dN > 0 && safety++ < 1000) {
      const attHits = rollHits(rng, aN, attChance);
      const defHits = rollHits(rng, dN, defChance);
      aN = Math.max(0, aN - defHits);
      dN = Math.max(0, dN - attHits);
      rounds++;
    }
    // If the escorting fleet is wiped out, the embarked troops are lost at sea.
    if (aN === 0) {
      return {
        attackerWins: false,
        attArmiesLeft: 0,
        attNaviesLeft: 0,
        defArmiesLeft: dA,
        defNaviesLeft: dN,
        rounds,
      };
    }
  }

  // 2. Land battle for control of the territory.
  let safety = 0;
  while (aA > 0 && dA > 0 && safety++ < 5000) {
    const attHits = rollHits(rng, aA, attChance);
    const defHits = rollHits(rng, dA, defChance);
    aA = Math.max(0, aA - defHits);
    dA = Math.max(0, dA - attHits);
    rounds++;
  }

  const attackerWins = dA === 0 && aA > 0;
  return {
    attackerWins,
    attArmiesLeft: aA,
    attNaviesLeft: aN,
    defArmiesLeft: dA,
    defNaviesLeft: dN,
    rounds,
  };
}

// --- Action validation ---------------------------------------------------

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

export function validate(state: GameState, action: GameAction): Validation {
  if (state.status !== 'playing') return err('The game is over.');
  const player = currentPlayer(state);

  if (action.type === 'build') {
    const ts = state.territories[action.territoryId];
    if (!ts) return err('Unknown territory.');
    if (ts.owner !== player.power) return err('You can only build in your own territory.');
    if (action.armies < 0 || action.navies < 0) return err('Invalid quantity.');
    if (action.armies === 0 && action.navies === 0) return err('Nothing to build.');
    if (action.navies > 0 && !TERRITORY_BY_ID[action.territoryId].coastal) {
      return err('Navies can only be built in coastal territories.');
    }
    const cost = action.armies * RULES.ARMY_COST + action.navies * RULES.NAVY_COST;
    if (cost > player.treasury) return err('Not enough money.');
    return ok;
  }

  if (action.type === 'move') {
    const from = state.territories[action.from];
    const to = state.territories[action.to];
    if (!from || !to) return err('Unknown territory.');
    if (from.owner !== player.power) return err('You can only move from your own territory.');
    const type = edgeType(action.from, action.to);
    if (!type) return err('Those territories are not connected.');
    if (action.armies < 0 || action.navies < 0) return err('Invalid quantity.');
    if (action.armies > from.armies) return err('Not enough armies.');
    if (action.navies > from.navies) return err('Not enough navies.');
    if (type === 'land') {
      if (action.navies > 0) return err('Navies cannot use a land route.');
      if (action.armies === 0) return err('Nothing to move.');
    } else {
      // Sea route.
      if (action.navies === 0) return err('A sea crossing needs at least one navy.');
      const capacity = action.navies * RULES.CARRY_PER_NAVY;
      if (action.armies > capacity) {
        return err(`Those navies can carry at most ${capacity} armies.`);
      }
    }
    return ok;
  }

  if (action.type === 'research') {
    const level = action.track === 'offense' ? player.offense : player.defense;
    if (level >= MAX_TECH) return err('Already at the highest age for that track.');
    if (researchCost(level) > player.treasury) return err('Not enough money to research.');
    return ok;
  }

  return ok; // endTurn
}

// --- Reducer -------------------------------------------------------------

export function apply(state: GameState, action: GameAction): GameState {
  const check = validate(state, action);
  if (!check.ok) {
    // Invalid actions are ignored but recorded for debugging/UI feedback.
    const next = clone(state);
    log(next, currentPlayer(next).power, `Action rejected: ${check.reason}`);
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
    case 'endTurn':
      applyEndTurn(next);
      break;
  }
  return next;
}

function applyResearch(
  state: GameState,
  action: Extract<GameAction, { type: 'research' }>,
): void {
  const player = currentPlayer(state);
  const level = action.track === 'offense' ? player.offense : player.defense;
  const cost = researchCost(level);
  player.treasury -= cost;
  if (action.track === 'offense') player.offense += 1;
  else player.defense += 1;
  const age = ageFor(player.offense, player.defense);
  const what = action.track === 'offense' ? 'weapons' : 'defenses';
  log(
    state,
    player.power,
    `${POWER_BY_ID[player.power].name} advanced ${what} to level ${level + 1} ` +
      `(${age.icon} ${age.name} Age, –$${cost}).`,
  );
}

function applyBuild(
  state: GameState,
  action: Extract<GameAction, { type: 'build' }>,
): void {
  const player = currentPlayer(state);
  const ts = state.territories[action.territoryId];
  const cost = action.armies * RULES.ARMY_COST + action.navies * RULES.NAVY_COST;
  player.treasury -= cost;
  ts.armies += action.armies;
  ts.navies += action.navies;
  const parts: string[] = [];
  if (action.armies) parts.push(`${action.armies} armies`);
  if (action.navies) parts.push(`${action.navies} navies`);
  log(
    state,
    player.power,
    `Built ${parts.join(' & ')} in ${TERRITORY_BY_ID[action.territoryId].name} (–$${cost}).`,
  );
}

function applyMove(
  state: GameState,
  action: Extract<GameAction, { type: 'move' }>,
): void {
  const player = currentPlayer(state);
  const from = state.territories[action.from];
  const to = state.territories[action.to];
  const type = edgeType(action.from, action.to)!;
  const fromName = TERRITORY_BY_ID[action.from].name;
  const toName = TERRITORY_BY_ID[action.to].name;

  // Depart.
  from.armies -= action.armies;
  from.navies -= action.navies;

  // Friendly move / reinforcement.
  if (to.owner === player.power) {
    to.armies += action.armies;
    to.navies += action.navies;
    log(state, player.power, `Moved forces ${fromName} → ${toName}.`);
    return;
  }

  // Contested move: combat. Tech levels of both sides shape the odds.
  const isNeutral = to.owner === null;
  const defender = to.owner ? state.players.find((p) => p.power === to.owner) : undefined;
  const defDefense = defender ? defender.defense : 1;
  const result = resolveCombat(
    state,
    action.armies,
    action.navies,
    to.armies,
    to.navies,
    isNeutral,
    type === 'sea',
    player.offense,
    defDefense,
  );

  const defenderName = to.owner ? POWER_BY_ID[to.owner].name : 'the local defenders';

  if (result.attackerWins) {
    const prevOwner = to.owner;
    to.owner = player.power;
    to.armies = result.attArmiesLeft;
    to.navies = TERRITORY_BY_ID[action.to].coastal ? result.attNaviesLeft : 0;
    log(
      state,
      player.power,
      `${POWER_BY_ID[player.power].name} captured ${toName} from ${defenderName} ` +
        `(${result.attArmiesLeft} armies survive).`,
    );
    if (prevOwner) checkEliminated(state, prevOwner);
  } else {
    // Attack repelled. Surviving defenders hold; attackers (and any lost
    // transports) are gone.
    to.armies = result.defArmiesLeft;
    to.navies = result.defNaviesLeft;
    log(
      state,
      player.power,
      `${POWER_BY_ID[player.power].name}'s assault on ${toName} was repelled ` +
        `(${result.defArmiesLeft} defenders hold).`,
    );
  }
}

function checkEliminated(state: GameState, power: PowerId): void {
  const player = state.players.find((p) => p.power === power);
  if (player && player.alive && ownedTerritories(state, power).length === 0) {
    player.alive = false;
    log(state, power, `${POWER_BY_ID[power].name} has been eliminated.`);
  }
}

function applyEndTurn(state: GameState): void {
  const ending = currentPlayer(state);
  log(state, ending.power, `${POWER_BY_ID[ending.power].name} ends the turn.`);

  // Mark anyone who lost their last territory.
  for (const p of state.players) checkEliminated(state, p.power);

  if (checkVictory(state)) return;

  // Advance to the next living player, wrapping the round counter.
  const n = state.players.length;
  let idx = state.currentPlayerIndex;
  for (let i = 0; i < n; i++) {
    idx = (idx + 1) % n;
    if (idx <= state.currentPlayerIndex) state.turn++;
    if (state.players[idx].alive) break;
  }
  state.currentPlayerIndex = idx;

  if (state.turn > state.config.maxTurns) {
    finishByScore(state);
    return;
  }

  collectIncome(state);
}

// --- Victory -------------------------------------------------------------

function checkVictory(state: GameState): boolean {
  const alive = state.players.filter((p) => p.alive);
  if (alive.length <= 1) {
    state.status = 'finished';
    state.winner = alive[0]?.power ?? null;
    if (state.winner) {
      log(state, state.winner, `${POWER_BY_ID[state.winner].name} stands alone — victory!`);
    }
    return true;
  }

  for (const p of alive) {
    if (ownedValue(state, p.power) / TOTAL_MAP_VALUE >= RULES.VICTORY_VALUE_FRACTION) {
      state.status = 'finished';
      state.winner = p.power;
      log(
        state,
        p.power,
        `${POWER_BY_ID[p.power].name} dominates the globe — decisive victory!`,
      );
      return true;
    }
  }
  return false;
}

function finishByScore(state: GameState): void {
  state.status = 'finished';
  let best: PowerId | null = null;
  let bestScore = -1;
  for (const p of state.players) {
    if (!p.alive) continue;
    const score = ownedValue(state, p.power);
    if (score > bestScore) {
      bestScore = score;
      best = p.power;
    }
  }
  state.winner = best;
  if (best) {
    log(state, best, `Time's up — ${POWER_BY_ID[best].name} leads and wins on points.`);
  }
}

// --- Misc convenience ----------------------------------------------------

/** A quick random tie-breaker helper exposed for the UI (e.g. seed buttons). */
export function randomSeed(): number {
  return Math.floor(nextFloat(makeRng(Date.now() & 0xffffffff)) * 0xffffffff);
}
