import { describe, it, expect } from 'vitest';
import {
  ADJACENCY,
  AGES,
  ageIndex,
  apply,
  attackerHit,
  createGame,
  currentPlayer,
  defenderHit,
  EDGES,
  MAX_TECH,
  ownedTerritories,
  ownedValue,
  POWER_BY_ID,
  researchCost,
  RULES,
  TERRITORIES,
  TERRITORY_BY_ID,
  validate,
} from './index';
import type { GameConfig, GameState } from './types';

function newGame(overrides: Partial<GameConfig> = {}): GameState {
  return createGame({
    powers: ['usa', 'china'],
    seed: 12345,
    maxTurns: 30,
    ...overrides,
  });
}

describe('map data integrity', () => {
  it('every edge references real territories', () => {
    const ids = new Set(TERRITORIES.map((t) => t.id));
    for (const e of EDGES) {
      expect(ids.has(e.a), `edge a=${e.a}`).toBe(true);
      expect(ids.has(e.b), `edge b=${e.b}`).toBe(true);
    }
  });

  it('every capital exists and is unique', () => {
    const caps = Object.values(POWER_BY_ID).map((p) => p.capital);
    for (const c of caps) expect(TERRITORY_BY_ID[c]).toBeDefined();
    expect(new Set(caps).size).toBe(caps.length);
  });

  it('adjacency is symmetric', () => {
    for (const [id, ns] of Object.entries(ADJACENCY)) {
      for (const [other, type] of Object.entries(ns)) {
        expect(ADJACENCY[other][id]).toBe(type);
      }
    }
  });

  it('the graph is fully connected', () => {
    const start = TERRITORIES[0].id;
    const seen = new Set<string>([start]);
    const queue = [start];
    while (queue.length) {
      const cur = queue.pop()!;
      for (const n of Object.keys(ADJACENCY[cur])) {
        if (!seen.has(n)) {
          seen.add(n);
          queue.push(n);
        }
      }
    }
    expect(seen.size).toBe(TERRITORIES.length);
  });
});

describe('game setup', () => {
  it('seats each power in its capital and collects opening income', () => {
    const g = newGame();
    expect(g.territories['usa_terr'].owner).toBe('usa');
    expect(g.territories['china_terr'].owner).toBe('china');
    expect(g.territories['usa_terr'].armies).toBe(RULES.CAPITAL_ARMIES);
    // First player already collected income from their capital.
    const usaIncome = ownedValue(g, 'usa');
    expect(g.players[0].treasury).toBe(RULES.STARTING_TREASURY + usaIncome);
  });

  it('unchosen powers remain neutral garrisons', () => {
    const g = newGame({ powers: ['usa', 'china'] });
    expect(g.territories['russia_terr'].owner).toBeNull();
    expect(g.territories['brazil_terr'].owner).toBeNull();
  });
});

describe('build action', () => {
  it('adds units and deducts treasury', () => {
    const g = newGame();
    const before = g.players[0].treasury;
    const next = apply(g, { type: 'build', territoryId: 'usa_terr', armies: 2, navies: 1 });
    expect(next.territories['usa_terr'].armies).toBe(RULES.CAPITAL_ARMIES + 2);
    expect(next.territories['usa_terr'].navies).toBe(RULES.CAPITAL_NAVIES + 1);
    expect(next.players[0].treasury).toBe(before - 2 * RULES.ARMY_COST - 1 * RULES.NAVY_COST);
  });

  it('rejects building beyond the treasury', () => {
    const g = newGame();
    const v = validate(g, { type: 'build', territoryId: 'usa_terr', armies: 999, navies: 0 });
    expect(v.ok).toBe(false);
  });

  it('rejects navies in a landlocked territory', () => {
    let g = newGame();
    // Give USA a landlocked territory by capturing one via direct state edit.
    g = { ...g };
    g.territories['centralasia'] = { owner: 'usa', armies: 5, navies: 0 };
    const v = validate(g, { type: 'build', territoryId: 'centralasia', armies: 0, navies: 1 });
    expect(v.ok).toBe(false);
  });
});

describe('movement & combat', () => {
  it('reinforces a friendly adjacent territory', () => {
    let g = newGame();
    // Capture Mexico cheaply first by stacking the deck: make it owned.
    g.territories['mexico'] = { owner: 'usa', armies: 1, navies: 0 };
    const next = apply(g, { type: 'move', from: 'usa_terr', to: 'mexico', armies: 5, navies: 0 });
    expect(next.territories['mexico'].armies).toBe(6);
    expect(next.territories['usa_terr'].armies).toBe(RULES.CAPITAL_ARMIES - 5);
  });

  it('a large force reliably captures a weak neutral', () => {
    let g = newGame();
    // Stack a big army in USA then attack neutral Mexico.
    g.territories['usa_terr'] = { owner: 'usa', armies: 60, navies: 0 };
    g.territories['mexico'] = { owner: null, armies: 3, navies: 0 };
    const next = apply(g, { type: 'move', from: 'usa_terr', to: 'mexico', armies: 50, navies: 0 });
    expect(next.territories['mexico'].owner).toBe('usa');
    expect(next.territories['mexico'].armies).toBeGreaterThan(0);
  });

  it('blocks moves between unconnected territories', () => {
    const g = newGame();
    const v = validate(g, { type: 'move', from: 'usa_terr', to: 'china_terr', armies: 1, navies: 0 });
    expect(v.ok).toBe(false);
  });

  it('requires a navy for sea crossings and respects carry capacity', () => {
    const g = newGame();
    // usa_terr -> uk is a sea edge.
    const noNavy = validate(g, { type: 'move', from: 'usa_terr', to: 'uk', armies: 2, navies: 0 });
    expect(noNavy.ok).toBe(false);
    const overload = validate(g, {
      type: 'move',
      from: 'usa_terr',
      to: 'uk',
      armies: RULES.CARRY_PER_NAVY * RULES.CAPITAL_NAVIES + 1,
      navies: RULES.CAPITAL_NAVIES,
    });
    expect(overload.ok).toBe(false);
  });
});

describe('turn flow & victory', () => {
  it('rotates players and collects income on the new turn', () => {
    const g = newGame();
    expect(currentPlayer(g).power).toBe('usa');
    const next = apply(g, { type: 'endTurn' });
    expect(currentPlayer(next).power).toBe('china');
    const chinaIncome = ownedValue(next, 'china');
    expect(next.players[1].treasury).toBe(RULES.STARTING_TREASURY + chinaIncome);
  });

  it('is deterministic for a fixed seed', () => {
    const a = newGame({ seed: 777 });
    const b = newGame({ seed: 777 });
    a.territories['usa_terr'] = { owner: 'usa', armies: 40, navies: 0 };
    b.territories['usa_terr'] = { owner: 'usa', armies: 40, navies: 0 };
    const ra = apply(a, { type: 'move', from: 'usa_terr', to: 'mexico', armies: 30, navies: 0 });
    const rb = apply(b, { type: 'move', from: 'usa_terr', to: 'mexico', armies: 30, navies: 0 });
    expect(ra.territories['mexico']).toEqual(rb.territories['mexico']);
  });

  it('ends the game when only one power remains', () => {
    let g = newGame({ powers: ['usa', 'china'] });
    // Strip China of its only territory; ending the turn should finish the game.
    g.territories['china_terr'] = { owner: null, armies: 1, navies: 0 };
    const next = apply(g, { type: 'endTurn' });
    expect(next.status).toBe('finished');
    expect(next.winner).toBe('usa');
  });
});

describe('technology', () => {
  it('players start in the first age at tech level 1', () => {
    const g = newGame();
    expect(g.players[0].offense).toBe(1);
    expect(g.players[0].defense).toBe(1);
    expect(ageIndex(1, 1)).toBe(0);
  });

  it('researching raises the track and deducts the scaling cost', () => {
    const g = newGame();
    const before = g.players[0].treasury;
    const next = apply(g, { type: 'research', track: 'offense' });
    expect(next.players[0].offense).toBe(2);
    expect(next.players[0].treasury).toBe(before - researchCost(1));
  });

  it('rejects research past the maximum age', () => {
    let g = newGame();
    g.players[0].offense = MAX_TECH;
    g.players[0].treasury = 99999;
    const v = validate(g, { type: 'research', track: 'offense' });
    expect(v.ok).toBe(false);
  });

  it('rejects research the treasury cannot afford', () => {
    const g = newGame();
    g.players[0].treasury = 0;
    const v = validate(g, { type: 'research', track: 'offense' });
    expect(v.ok).toBe(false);
  });

  it('advancing both tracks climbs through the ages', () => {
    const top = ageIndex(MAX_TECH, MAX_TECH);
    expect(top).toBe(AGES.length - 1);
    expect(ageIndex(1, 1)).toBeLessThan(top);
  });

  it('higher offense and defense improve hit chances monotonically', () => {
    expect(attackerHit(3, 1)).toBeGreaterThan(attackerHit(1, 1));
    expect(attackerHit(1, 4)).toBeLessThan(attackerHit(1, 1)); // enemy armor hurts
    expect(defenderHit(4, 1, false)).toBeGreaterThan(defenderHit(1, 1, false));
  });

  it('an advanced attacker beats an equal-sized low-tech defender most of the time', () => {
    let attackerWins = 0;
    const trials = 40;
    for (let seed = 0; seed < trials; seed++) {
      let g = createGame({ powers: ['usa', 'china'], seed, maxTurns: 30 });
      g.players[0].offense = MAX_TECH; // USA fields Orbital Command
      g.territories['usa_terr'] = { owner: 'usa', armies: 20, navies: 0 };
      g.territories['mexico'] = { owner: null, armies: 20, navies: 0 };
      const r = apply(g, { type: 'move', from: 'usa_terr', to: 'mexico', armies: 20, navies: 0 });
      if (r.territories['mexico'].owner === 'usa') attackerWins++;
    }
    expect(attackerWins).toBeGreaterThan(trials * 0.7);
  });
});

describe('elimination', () => {
  it('marks a power dead when it loses its last territory', () => {
    let g = newGame({ powers: ['usa', 'china', 'russia'] });
    // USA conquers China's capital with overwhelming force.
    g.territories['russia_terr'] = { owner: 'usa', armies: 80, navies: 0 };
    g.territories['china_terr'] = { owner: 'china', armies: 2, navies: 0 };
    // russia_terr <-> china_terr is a land edge.
    const next = apply(g, { type: 'move', from: 'russia_terr', to: 'china_terr', armies: 70, navies: 0 });
    expect(next.territories['china_terr'].owner).toBe('usa');
    const china = next.players.find((p) => p.power === 'china')!;
    expect(china.alive).toBe(false);
    expect(ownedTerritories(next, 'china').length).toBe(0);
  });
});
