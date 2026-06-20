// A heuristic AI. On its turn it spends up to ACTIONS_PER_TURN actions then
// ends. It estimates combat odds (tech + hero modifiers), captures what it
// can — ferrying armies across sea/mountains with navy/air transport —
// softens tough targets with strikes, builds toward the frontier, and invests
// in tech. It plays entirely through the pure `apply` reducer.
import {
  AIR_CAPACITY,
  NAVY_CAPACITY,
  apply,
  attackerHit,
  canPlayerStrike,
  currentPlayer,
  defenderHit,
  heroMods,
  neighborsOf,
  ownedTiles,
  researchCostFor,
  strikeCostFor,
  strikeTargets,
  tileById,
  tileTotal,
  unitCostFor,
} from './game';
import { MAX_TECH } from './tech';
import type { GameAction, GameState, PlayerState, TileType } from './types';

const clampChance = (x: number) => Math.min(0.85, Math.max(0.2, x));

/** Defender-hit / attacker-hit ratio — how much force is needed to win. */
function oddsRatio(me: PlayerState, defender: PlayerState | undefined, isNeutral: boolean): number {
  const attOff = me.offense;
  const defDef = defender ? defender.defense : 1;
  const aBonus = heroMods(me).attackHit;
  const dBonus = defender ? heroMods(defender).defenseHit : 0;
  const attC = clampChance(attackerHit(attOff, defDef) + aBonus);
  const defC = clampChance(defenderHit(defDef, attOff, isNeutral) + dBonus);
  return defC / attC;
}

interface Eval {
  send: { army: number; navy: number; air: number } | null; // a winning move, if any
  projectable: number; // most force we could throw at it
  need: number; // force required to win comfortably
  score: number;
  type: TileType;
}

function evalTarget(state: GameState, me: PlayerState, from: string, to: string): Eval {
  const fs = state.tiles[from];
  const ts = state.tiles[to];
  const tt = tileById(state, to)!;
  const isNeutral = ts.owner === null;
  const defender = ts.owner ? state.players.find((p) => p.faction === ts.owner) : undefined;
  const def = tileTotal(ts);
  const ratio = oddsRatio(me, defender, isNeutral);
  const need = def <= 0 ? 1 : Math.ceil(def * ratio * 1.25) + 1;
  const score = tt.value * 3 + (isNeutral ? 0 : 6);

  let projectable: number;
  let send: Eval['send'] = null;
  if (tt.type === 'land') {
    projectable = fs.army + fs.air;
    if (projectable >= need) {
      const army = Math.min(fs.army, need);
      const air = Math.min(fs.air, need - army);
      send = { army, navy: 0, air };
    }
  } else if (tt.type === 'sea') {
    const escorts = fs.navy + fs.air;
    const cap = fs.navy * NAVY_CAPACITY + fs.air * AIR_CAPACITY;
    projectable = escorts + Math.min(fs.army, cap);
    if (escorts > 0 && projectable >= need) {
      const carried = Math.min(fs.army, cap, Math.max(0, need - escorts));
      send = { army: carried, navy: fs.navy, air: fs.air }; // ferry troops along
    }
  } else {
    const escorts = fs.air;
    const cap = fs.air * AIR_CAPACITY;
    projectable = escorts + Math.min(fs.army, cap);
    if (escorts > 0 && projectable >= need) {
      const carried = Math.min(fs.army, cap, Math.max(0, need - escorts));
      send = { army: carried, navy: 0, air: fs.air };
    }
  }
  return { send, projectable, need, score, type: tt.type };
}

function chooseResearch(me: PlayerState): GameAction | null {
  const off = researchCostFor(me, me.offense);
  const ind = researchCostFor(me, me.industry);
  const def = researchCostFor(me, me.defense);
  if (me.industry < 2 && me.industry < MAX_TECH && me.treasury >= ind) return { type: 'research', track: 'industry' };
  if (me.offense < 4 && me.offense < MAX_TECH && me.treasury >= off) return { type: 'research', track: 'offense' };
  if (me.industry < 4 && me.industry < MAX_TECH && me.treasury >= ind) return { type: 'research', track: 'industry' };
  if (me.offense < MAX_TECH && me.treasury >= off) return { type: 'research', track: 'offense' };
  if (me.defense < me.offense && me.defense < MAX_TECH && me.treasury >= def) return { type: 'research', track: 'defense' };
  return null;
}

function chooseAIAction(state: GameState): GameAction | null {
  const me = currentPlayer(state);
  const mine = ownedTiles(state, me.faction);
  if (mine.length === 0) return null;

  let bestAtk: { from: string; to: string; send: NonNullable<Eval['send']>; score: number } | null = null;
  let nearMiss: { from: string; to: string; score: number; total: number } | null = null;
  let goal: { from: string; to: string; score: number; type: TileType; fromType: TileType } | null = null;

  for (const from of mine) {
    const fromType = tileById(state, from)!.type;
    for (const to of neighborsOf(state, from)) {
      const ts = state.tiles[to];
      if (ts.owner === me.faction) continue;
      const ev = evalTarget(state, me, from, to);
      if (ev.send) {
        if (!bestAtk || ev.score > bestAtk.score) bestAtk = { from, to, send: ev.send, score: ev.score };
      } else if (ev.projectable >= ev.need * 0.55) {
        if (!nearMiss || ev.score > nearMiss.score) nearMiss = { from, to, score: ev.score, total: tileTotal(ts) };
      }
      if (!goal || ev.score > goal.score) goal = { from, to, score: ev.score, type: ev.type, fromType };
    }
  }

  // 1) Take the best winnable fight (transports armies where needed).
  if (bestAtk) {
    return { type: 'move', from: bestAtk.from, to: bestAtk.to, ...bestAtk.send };
  }

  // 2) Soften a tough, valuable target with a strike to crack it next time.
  if (nearMiss && nearMiss.total >= 3 && canPlayerStrike(me) && me.treasury >= strikeCostFor(me)) {
    if (strikeTargets(state, nearMiss.from, me).has(nearMiss.to)) {
      return { type: 'strike', from: nearMiss.from, to: nearMiss.to };
    }
    for (const from of mine) {
      if (strikeTargets(state, from, me).has(nearMiss.to)) return { type: 'strike', from, to: nearMiss.to };
    }
  }

  // 3) Build toward the most valuable adjacent target.
  const armyCost = unitCostFor(me, 'army');
  const navyCost = unitCostFor(me, 'navy');
  const airCost = unitCostFor(me, 'air');
  const capital = mine.find((id) => tileById(state, id)!.type === 'land') ?? mine[0];
  if (goal) {
    if (goal.type === 'land' && goal.fromType === 'land' && me.treasury >= armyCost) {
      const n = Math.min(6, Math.floor(me.treasury / armyCost));
      if (n > 0) return { type: 'build', tileId: goal.from, army: n, navy: 0, air: 0 };
    }
    if (goal.type === 'sea' && goal.fromType === 'sea' && me.treasury >= navyCost) {
      const n = Math.min(3, Math.floor(me.treasury / navyCost));
      if (n > 0) return { type: 'build', tileId: goal.from, army: 0, navy: n, air: 0 };
    }
    if ((goal.type === 'sea' || goal.type === 'mountain') && me.treasury >= airCost) {
      // Air to escort/ferry armies across; build on the land staging tile.
      const tile = goal.fromType === 'land' ? goal.from : capital;
      const n = Math.min(2, Math.floor(me.treasury / airCost));
      if (n > 0) return { type: 'build', tileId: tile, army: 0, navy: 0, air: n };
    }
  }

  // 4) Tech, then 5) stockpile on the capital.
  const research = chooseResearch(me);
  if (research) return research;
  if (me.treasury >= armyCost && tileById(state, capital)!.type === 'land') {
    return { type: 'build', tileId: capital, army: Math.min(5, Math.floor(me.treasury / armyCost)), navy: 0, air: 0 };
  }
  return null;
}

/** Run a full AI turn and return the state with the turn already ended. */
export function aiTakeTurn(state: GameState): GameState {
  let s = state;
  let guard = 0;
  while (s.actionsLeft > 0 && s.status === 'playing' && guard++ < 12) {
    const action = chooseAIAction(s);
    if (!action) break;
    const before = s.actionsLeft;
    s = apply(s, action);
    if (s.actionsLeft >= before) break; // action rejected / made no progress
  }
  if (s.status === 'playing') s = apply(s, { type: 'endTurn' });
  return s;
}
