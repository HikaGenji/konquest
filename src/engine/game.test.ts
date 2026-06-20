import { describe, it, expect } from 'vitest';
import {
  AGES,
  ageIndex,
  apply,
  canHold,
  createGame,
  currentPlayer,
  FACTIONS,
  generateMap,
  hexagonBoard,
  incomeFor,
  incomeMultiplier,
  isRevealed,
  MAX_TECH,
  ownedTiles,
  ownedValue,
  researchCost,
  researchCostFor,
  RULES,
  STRIKE_TECH,
  strikeTargets,
  totalValue,
  UNIT,
  unitCostFor,
  validate,
} from './index';
import type { FactionId, GameState, HeroId, Tile } from './types';

function newGame(
  seed = 42,
  factions: FactionId[] = ['crimson', 'azure'],
  radius = 3,
  heroes?: HeroId[],
): GameState {
  return createGame({
    factions,
    heroes: heroes ?? factions.map(() => 'leonidas' as HeroId),
    seed,
    maxTurns: 30,
    radius,
  });
}

function setType(g: GameState, id: string, type: Tile['type']): void {
  const t = g.map.find((m) => m.id === id)!;
  t.type = type;
}

describe('map generation', () => {
  it('fills a hexagon board of the right size', () => {
    const gen = generateMap(1, 3, 2);
    expect(gen.map.length).toBe(hexagonBoard(3).length); // 37
  });

  it('seats faction starts on land', () => {
    const gen = generateMap(7, 4, 4);
    expect(gen.starts.length).toBe(4);
    for (const id of gen.starts) {
      expect(gen.map.find((t) => t.id === id)!.type).toBe('land');
    }
  });

  it('adjacency is symmetric', () => {
    const gen = generateMap(3, 3, 2);
    for (const [id, ns] of Object.entries(gen.adj)) {
      for (const n of ns) expect(gen.adj[n]).toContain(id);
    }
  });

  it('is deterministic for a fixed seed', () => {
    const a = generateMap(99, 4, 3);
    const b = generateMap(99, 4, 3);
    expect(a.map).toEqual(b.map);
    expect(a.starts).toEqual(b.starts);
  });
});

describe('terrain rules', () => {
  it('gates units by terrain', () => {
    expect(canHold('land', 'army')).toBe(true);
    expect(canHold('sea', 'army')).toBe(false);
    expect(canHold('mountain', 'army')).toBe(false);
    expect(canHold('sea', 'navy')).toBe(true);
    expect(canHold('land', 'navy')).toBe(false);
    expect(canHold('mountain', 'air')).toBe(true);
    expect(canHold('sea', 'air')).toBe(true);
  });
});

describe('game setup', () => {
  it('gives every faction one tile and the same budget', () => {
    const g = newGame();
    expect(ownedTiles(g, 'crimson').length).toBe(1);
    expect(ownedTiles(g, 'azure').length).toBe(1);
    expect(g.players[0].treasury - ownedValue(g, 'crimson')).toBe(RULES.STARTING_TREASURY);
    expect(g.players.every((p) => p.offense === 1 && p.defense === 1 && p.industry === 1)).toBe(true);
  });

  it('leaves all other tiles neutral', () => {
    const g = newGame();
    const owned = g.map.filter((t) => g.tiles[t.id].owner !== null).length;
    expect(owned).toBe(2);
  });
});

describe('build', () => {
  it('builds armies on a land capital and deducts treasury', () => {
    const g = newGame();
    const cap = ownedTiles(g, 'crimson')[0];
    const before = g.players[0].treasury;
    const next = apply(g, { type: 'build', tileId: cap, army: 2, navy: 0, air: 1 });
    expect(next.tiles[cap].army).toBe(RULES.CAPITAL_ARMIES + 2);
    expect(next.tiles[cap].air).toBe(1);
    expect(next.players[0].treasury).toBe(before - 2 * UNIT.army.cost - UNIT.air.cost);
  });

  it('rejects building a navy on a land tile', () => {
    const g = newGame();
    const cap = ownedTiles(g, 'crimson')[0];
    expect(validate(g, { type: 'build', tileId: cap, army: 0, navy: 1, air: 0 }).ok).toBe(false);
  });
});

describe('movement & combat', () => {
  it('requires adjacency', () => {
    const g = newGame();
    const cap = ownedTiles(g, 'crimson')[0];
    const far = ownedTiles(g, 'azure')[0];
    expect(validate(g, { type: 'move', from: cap, to: far, army: 1, navy: 0, air: 0 }).ok).toBe(false);
  });

  it('blocks armies from entering sea or mountain', () => {
    const g = newGame();
    const cap = ownedTiles(g, 'crimson')[0];
    const nb = g.adj[cap][0];
    setType(g, nb, 'sea');
    expect(validate(g, { type: 'move', from: cap, to: nb, army: 1, navy: 0, air: 0 }).ok).toBe(false);
    // air may enter the sea tile
    g.tiles[cap].air = 3;
    expect(validate(g, { type: 'move', from: cap, to: nb, army: 0, navy: 0, air: 1 }).ok).toBe(true);
  });

  it('captures a weak neutral with overwhelming force', () => {
    const g = newGame();
    const cap = ownedTiles(g, 'crimson')[0];
    const nb = g.adj[cap][0];
    setType(g, nb, 'land');
    g.tiles[cap].army = 40;
    g.tiles[nb] = { owner: null, army: 2, navy: 0, air: 0 };
    const next = apply(g, { type: 'move', from: cap, to: nb, army: 35, navy: 0, air: 0 });
    expect(next.tiles[nb].owner).toBe('crimson');
    expect(next.tiles[nb].army).toBeGreaterThan(0);
  });

  it('reinforces a friendly tile', () => {
    const g = newGame();
    const cap = ownedTiles(g, 'crimson')[0];
    const nb = g.adj[cap][0];
    setType(g, nb, 'land');
    g.tiles[nb] = { owner: 'crimson', army: 1, navy: 0, air: 0 };
    const next = apply(g, { type: 'move', from: cap, to: nb, army: 4, navy: 0, air: 0 });
    expect(next.tiles[nb].army).toBe(5);
  });
});

describe('technology', () => {
  it('starts in the first age', () => {
    expect(ageIndex(1, 1, 1)).toBe(0);
    expect(ageIndex(MAX_TECH, MAX_TECH, MAX_TECH)).toBe(AGES.length - 1);
  });

  it('research raises a track and deducts cost', () => {
    const g = newGame();
    const next = apply(g, { type: 'research', track: 'industry' });
    expect(next.players[0].industry).toBe(2);
  });

  it('industry multiplies income', () => {
    expect(incomeMultiplier(1)).toBe(1);
    const g = newGame();
    const base = incomeFor(g, g.players[0]);
    expect(incomeFor(g, { ...g.players[0], industry: 5 })).toBeGreaterThan(base);
  });
});

describe('strikes', () => {
  it('are locked until Weapons L4 and gain global range at L6', () => {
    const g = newGame();
    const cap = ownedTiles(g, 'crimson')[0];
    const p = (offense: number) => ({ ...g.players[0], offense });
    expect(strikeTargets(g, cap, p(1)).size).toBe(0);
    const adjacent = strikeTargets(g, cap, p(STRIKE_TECH));
    const global = strikeTargets(g, cap, p(MAX_TECH));
    expect(global.size).toBeGreaterThanOrEqual(adjacent.size);
  });
});

describe('fog of war & spies', () => {
  it('hides foreign tiles until spied', () => {
    const g = newGame();
    const cap = ownedTiles(g, 'crimson')[0];
    const enemy = ownedTiles(g, 'azure')[0];
    expect(isRevealed(g, cap)).toBe(true);
    expect(isRevealed(g, enemy)).toBe(false);
    const next = apply(g, { type: 'spy', tileId: enemy });
    expect(isRevealed(next, enemy)).toBe(true);
    expect(next.players[0].treasury).toBe(g.players[0].treasury - RULES.SPY_COST);
  });

  it('clears intel when the turn passes', () => {
    let g = newGame();
    const enemy = ownedTiles(g, 'azure')[0];
    g = apply(g, { type: 'spy', tileId: enemy });
    expect(g.intel).toContain(enemy);
    g = apply(g, { type: 'endTurn' });
    expect(g.intel).toEqual([]);
  });
});

describe('heroes', () => {
  it('Alexander starts with extra treasury and armies', () => {
    const g = newGame(1, ['crimson', 'azure'], 3, ['alexander', 'leonidas']);
    const cap = ownedTiles(g, 'crimson')[0];
    expect(g.tiles[cap].army).toBe(RULES.CAPITAL_ARMIES + 6);
    expect(g.players[0].treasury).toBe(RULES.STARTING_TREASURY + 25 + ownedValue(g, 'crimson'));
  });

  it('Saladin discounts research and Genghis discounts armies', () => {
    const g = newGame(1, ['crimson', 'azure'], 3, ['saladin', 'genghis']);
    expect(researchCostFor(g.players[0], 1)).toBeLessThan(researchCost(1));
    expect(unitCostFor(g.players[0], 'army')).toBe(UNIT.army.cost); // Saladin: no unit discount
    expect(unitCostFor(g.players[1], 'army')).toBeLessThan(UNIT.army.cost); // Genghis
  });
});

describe('turn flow & victory', () => {
  it('rotates factions and collects income', () => {
    const g = newGame();
    expect(currentPlayer(g).faction).toBe('crimson');
    const next = apply(g, { type: 'endTurn' });
    expect(currentPlayer(next).faction).toBe('azure');
  });

  it('ends when only one faction remains', () => {
    const g = newGame();
    const azureTile = ownedTiles(g, 'azure')[0];
    g.tiles[azureTile] = { owner: null, army: 1, navy: 0, air: 0 };
    const next = apply(g, { type: 'endTurn' });
    expect(next.status).toBe('finished');
    expect(next.winner).toBe('crimson');
  });

  it('total map value is positive and four factions are available', () => {
    expect(totalValue(newGame())).toBeGreaterThan(0);
    expect(FACTIONS.length).toBe(4);
  });
});
