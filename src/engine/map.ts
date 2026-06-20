import { makeRng, nextInt } from './rng';
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

/**
 * Grow a connected region from one or more seeds by repeatedly absorbing a
 * random allowed neighbour. A single seed yields one connected blob; several
 * seeds yield connected patches. Picking from the (multiset of) frontier
 * neighbours biases toward compact, organic shapes.
 */
function growRegion(
  rng: ReturnType<typeof makeRng>,
  region: Set<string>,
  seeds: string[],
  target: number,
  allowed: (id: string) => boolean,
  neighbours: (id: string) => string[],
): void {
  for (const s of seeds) if (allowed(s)) region.add(s);
  while (region.size < target) {
    const frontier: string[] = [];
    for (const id of region) {
      for (const n of neighbours(id)) {
        if (allowed(n) && !region.has(n)) frontier.push(n);
      }
    }
    if (frontier.length === 0) break;
    region.add(frontier[nextInt(rng, 0, frontier.length - 1)]);
  }
}

export function generateMap(seed: number, radius: number, factionCount: number): GeneratedMap {
  const rng = makeRng(seed);
  const coords = hexagonBoard(radius);

  const map: Tile[] = coords.map(({ q, r }) => {
    const { x, y } = hexToPixel(q, r, HEX_SIZE);
    return { id: key(q, r), q, r, x, y, type: 'land' as TileType, value: 2 };
  });

  const byKey = new Map(map.map((t) => [t.id, t]));
  const neighbours = (id: string): string[] => {
    const t = byKey.get(id)!;
    return HEX_DIRECTIONS.map((d) => key(t.q + d.q, t.r + d.r)).filter((k) => byKey.has(k));
  };

  // Faction starts at well-spread board corners; these stay land throughout.
  const corners = boardCorners(radius);
  const pick = STARTS_BY_COUNT[factionCount] ?? STARTS_BY_COUNT[4];
  const starts = Array.from({ length: factionCount }, (_, i) => {
    const c = corners[pick[i]];
    return key(c.q, c.r);
  });
  const blocked = new Set(starts);
  const total = map.length;

  // --- Sea: one connected ocean, seeded from a board edge (never on a start) ---
  const sea = new Set<string>();
  const seaTarget = Math.round(total * 0.26);
  const border = map.filter(
    (t) => Math.max(Math.abs(t.q), Math.abs(t.r), Math.abs(t.q + t.r)) === radius && !blocked.has(t.id),
  );
  if (border.length > 0 && seaTarget > 0) {
    const seaSeed = border[nextInt(rng, 0, border.length - 1)].id;
    growRegion(rng, sea, [seaSeed], seaTarget, (id) => !blocked.has(id), neighbours);
  }

  // --- Mountains: a few connected patches among the remaining land ---
  const mtn = new Set<string>();
  const mtnTarget = Math.round(total * 0.14);
  const land = map.filter((t) => !sea.has(t.id) && !blocked.has(t.id)).map((t) => t.id);
  const patches = Math.min(3, Math.max(1, Math.round(mtnTarget / 4)));
  const seeds: string[] = [];
  for (let i = 0; i < patches && land.length > 0; i++) {
    seeds.push(land[nextInt(rng, 0, land.length - 1)]);
  }
  growRegion(rng, mtn, seeds, mtnTarget, (id) => !blocked.has(id) && !sea.has(id), neighbours);

  // Assign final types and values.
  for (const t of map) {
    if (sea.has(t.id)) {
      t.type = 'sea';
      t.value = 1;
    } else if (mtn.has(t.id)) {
      t.type = 'mountain';
      t.value = 2;
    } else {
      t.type = 'land';
      t.value = nextInt(rng, 2, 3);
    }
  }
  for (const id of starts) {
    const t = byKey.get(id)!;
    t.type = 'land';
    t.value = 3;
  }

  const adj: Record<string, string[]> = {};
  for (const t of map) adj[t.id] = neighbours(t.id);

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
    // Neutral garrison of the terrain-appropriate unit. Tougher than raw value
    // so the map isn't gobbled instantly — which lengthens games and rewards
    // investing in Weapons tech to break through.
    const g = t.value + 1;
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
