import { makeRng, nextFloat, nextInt } from './rng';
import {
  boardCorners,
  HEX_DIRECTIONS,
  hexagonBoard,
  hexToPixel,
  key,
} from './hex';
import type { FactionId, Faction, Tile, TileState, TileType, UnitType } from './types';

// Up to four generic factions — chosen for contrast on the board.
export const FACTIONS: Faction[] = [
  { id: 'crimson', name: 'Crimson', color: '#ef4444' },
  { id: 'azure', name: 'Azure', color: '#3b82f6' },
  { id: 'verdant', name: 'Verdant', color: '#22c55e' },
  { id: 'amber', name: 'Amber', color: '#f59e0b' },
];

export const FACTION_BY_ID: Record<string, Faction> = Object.fromEntries(
  FACTIONS.map((f) => [f.id, f]),
);

export const HEX_SIZE = 10;

export const TERRAIN: Record<TileType, { color: string; glyph: string; label: string }> = {
  land: { color: '#3f6b3a', glyph: '🌲', label: 'Land' },
  sea: { color: '#1f4e79', glyph: '🌊', label: 'Sea' },
  mountain: { color: '#6b6256', glyph: '⛰️', label: 'Mountain' },
};

export const UNIT: Record<UnitType, { cost: number; glyph: string; label: string }> = {
  army: { cost: 10, glyph: '🪖', label: 'Army' },
  navy: { cost: 18, glyph: '⚓', label: 'Navy' },
  air: { cost: 30, glyph: '✈️', label: 'Air force' },
};

/** Can a unit type occupy / move onto a tile of this terrain? */
export function canHold(type: TileType, unit: UnitType): boolean {
  if (unit === 'air') return true;
  if (unit === 'army') return type === 'land';
  return type === 'sea'; // navy
}

/** Unit types that may legally enter a tile of this terrain. */
export function unitsForTerrain(type: TileType): UnitType[] {
  return (['army', 'navy', 'air'] as UnitType[]).filter((u) => canHold(type, u));
}

function rollTerrain(rngVal: number): TileType {
  if (rngVal < 0.6) return 'land';
  if (rngVal < 0.86) return 'sea';
  return 'mountain';
}

function tileValue(type: TileType, rng: ReturnType<typeof makeRng>): number {
  if (type === 'land') return nextInt(rng, 2, 3);
  if (type === 'mountain') return 2;
  return 1; // sea
}

export interface GeneratedMap {
  map: Tile[];
  adj: Record<string, string[]>;
  /** One starting tile id per faction, in order. */
  starts: string[];
}

const STARTS_BY_COUNT: Record<number, number[]> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 2, 3, 5],
};

export function generateMap(seed: number, radius: number, factionCount: number): GeneratedMap {
  const rng = makeRng(seed);
  const coords = hexagonBoard(radius);

  const map: Tile[] = coords.map(({ q, r }) => {
    const type = rollTerrain(nextFloat(rng));
    const { x, y } = hexToPixel(q, r, HEX_SIZE);
    return { id: key(q, r), q, r, x, y, type, value: tileValue(type, rng) };
  });

  const byKey = new Map(map.map((t) => [t.id, t]));

  // Adjacency from axial neighbours present on the board.
  const adj: Record<string, string[]> = {};
  for (const t of map) {
    adj[t.id] = HEX_DIRECTIONS.map((d) => key(t.q + d.q, t.r + d.r)).filter((k) =>
      byKey.has(k),
    );
  }

  // Place faction starts at well-spread board corners; force them to be land.
  const corners = boardCorners(radius);
  const pick = STARTS_BY_COUNT[factionCount] ?? STARTS_BY_COUNT[4];
  const starts: string[] = [];
  for (let i = 0; i < factionCount; i++) {
    const c = corners[pick[i]];
    const tile = byKey.get(key(c.q, c.r))!;
    tile.type = 'land';
    tile.value = 3;
    starts.push(tile.id);
  }

  return { map, adj, starts };
}

/** Build the initial dynamic tile states (neutral garrisons + faction capitals). */
export function initialTileStates(
  gen: GeneratedMap,
  factions: FactionId[],
  capitalArmies: number,
): Record<string, TileState> {
  const states: Record<string, TileState> = {};
  for (const t of gen.map) {
    // Neutral garrison of the terrain-appropriate unit, sized by value.
    const g = t.value;
    states[t.id] = {
      owner: null,
      army: t.type === 'land' ? g : 0,
      navy: t.type === 'sea' ? g : 0,
      air: t.type === 'mountain' ? g : 0,
    };
  }
  gen.starts.forEach((id, i) => {
    states[id] = { owner: factions[i], army: capitalArmies, navy: 0, air: 0 };
  });
  return states;
}
