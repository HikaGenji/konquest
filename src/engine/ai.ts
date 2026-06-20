// A lightweight heuristic AI. On its turn it spends up to ACTIONS_PER_TURN
// actions then ends the turn. It is intentionally simple but competent:
// take winnable adjacent fights, otherwise mass forces on the frontier or
// invest in tech. It plays entirely through the pure `apply` reducer.
import { apply, currentPlayer, neighborsOf, ownedTiles, researchCostFor, tileById, tileTotal, unitCostFor } from './game';
import { canHold } from './map';
import { MAX_TECH } from './tech';
import type { GameAction, GameState } from './types';

function chooseAIAction(state: GameState): GameAction | null {
  const me = currentPlayer(state);
  const mine = ownedTiles(state, me.faction);
  if (mine.length === 0) return null;

  // 1) Best clearly-winnable attack on an adjacent enemy/neutral tile.
  let best: { action: GameAction; score: number } | null = null;
  for (const from of mine) {
    const fs = state.tiles[from];
    for (const to of neighborsOf(state, from)) {
      const ts = state.tiles[to];
      if (ts.owner === me.faction) continue;
      const tt = tileById(state, to)!;
      const army = canHold(tt.type, 'army') ? fs.army : 0;
      const navy = canHold(tt.type, 'navy') ? fs.navy : 0;
      const air = canHold(tt.type, 'air') ? fs.air : 0;
      const moving = army + navy + air;
      const def = tileTotal(ts);
      if (moving === 0 || moving < def + 2) continue; // need a comfortable margin
      const score = tt.value * 3 - def + (ts.owner ? 5 : 0);
      if (!best || score > best.score) {
        best = { action: { type: 'move', from, to, army, navy, air }, score };
      }
    }
  }
  if (best) return best.action;

  const armyCost = unitCostFor(me, 'army');
  const airCost = unitCostFor(me, 'air');
  const capital = mine.find((id) => tileById(state, id)!.type === 'land') ?? mine[0];

  // 2) Reinforce the frontier so future turns can break through.
  const frontierLand = mine.filter((id) => {
    const t = tileById(state, id)!;
    return t.type === 'land' && neighborsOf(state, id).some((n) => state.tiles[n].owner !== me.faction);
  });
  if (frontierLand.length > 0 && me.treasury >= armyCost * 2) {
    const n = Math.min(6, Math.floor(me.treasury / armyCost));
    if (n > 0) return { type: 'build', tileId: frontierLand[0], army: n, navy: 0, air: 0 };
  }

  // 3) If boxed in by water/mountains, buy air to leap across.
  const anyFrontier = mine.some((id) => neighborsOf(state, id).some((n) => state.tiles[n].owner !== me.faction));
  const haveAir = mine.some((id) => state.tiles[id].air > 0);
  if (anyFrontier && frontierLand.length === 0 && !haveAir && me.treasury >= airCost) {
    return { type: 'build', tileId: capital, army: 0, navy: 0, air: Math.min(3, Math.floor(me.treasury / airCost)) };
  }

  // 4) Invest in technology.
  if (me.industry < me.offense && me.industry < MAX_TECH && me.treasury >= researchCostFor(me, me.industry)) {
    return { type: 'research', track: 'industry' };
  }
  if (me.offense < MAX_TECH && me.treasury >= researchCostFor(me, me.offense)) {
    return { type: 'research', track: 'offense' };
  }

  // 5) Fallback: stockpile on the capital.
  const capTile = tileById(state, capital)!;
  if (capTile.type === 'land' && me.treasury >= armyCost) {
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
    if (s.actionsLeft >= before) break; // action was rejected / made no progress
  }
  if (s.status === 'playing') s = apply(s, { type: 'endTurn' });
  return s;
}
