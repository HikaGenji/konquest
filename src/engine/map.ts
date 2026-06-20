import type { Edge, Power, Territory } from './types';

// Six present-day great powers — the modern analog of Colonial Conquest's
// USA / Britain / France / Germany / Russia / Japan.
export const POWERS: Power[] = [
  { id: 'usa', name: 'United States', short: 'USA', color: '#3b82f6', capital: 'usa_terr' },
  { id: 'china', name: 'China', short: 'CHN', color: '#ef4444', capital: 'china_terr' },
  { id: 'russia', name: 'Russia', short: 'RUS', color: '#a855f7', capital: 'russia_terr' },
  { id: 'eu', name: 'European Union', short: 'EU', color: '#eab308', capital: 'centraleurope' },
  { id: 'india', name: 'India', short: 'IND', color: '#22c55e', capital: 'india_terr' },
  { id: 'brazil', name: 'Brazil', short: 'BRA', color: '#14b8a6', capital: 'brazil_terr' },
];

// Layout is on a 1000 x 520 canvas, roughly equirectangular (x = longitude,
// y = latitude with north at top). Values drive income, score and victory.
export const TERRITORIES: Territory[] = [
  // North America
  { id: 'canada', name: 'Canada', continent: 'North America', x: 200, y: 95, value: 3, coastal: true },
  { id: 'usa_terr', name: 'United States', continent: 'North America', x: 195, y: 165, value: 6, coastal: true },
  { id: 'mexico', name: 'Mexico', continent: 'North America', x: 175, y: 235, value: 3, coastal: true },
  // South America
  { id: 'colombia', name: 'Gran Colombia', continent: 'South America', x: 255, y: 295, value: 3, coastal: true },
  { id: 'brazil_terr', name: 'Brazil', continent: 'South America', x: 315, y: 350, value: 5, coastal: true },
  { id: 'argentina', name: 'Argentina', continent: 'South America', x: 275, y: 440, value: 3, coastal: true },
  // Europe
  { id: 'uk', name: 'United Kingdom', continent: 'Europe', x: 470, y: 120, value: 4, coastal: true },
  { id: 'westeurope', name: 'Western Europe', continent: 'Europe', x: 478, y: 165, value: 5, coastal: true },
  { id: 'centraleurope', name: 'Central Europe', continent: 'Europe', x: 528, y: 150, value: 6, coastal: true },
  { id: 'scandinavia', name: 'Scandinavia', continent: 'Europe', x: 538, y: 90, value: 3, coastal: true },
  { id: 'easteurope', name: 'Eastern Europe', continent: 'Europe', x: 588, y: 150, value: 4, coastal: true },
  { id: 'balkans', name: 'Balkans', continent: 'Europe', x: 558, y: 195, value: 3, coastal: true },
  // Africa
  { id: 'northafrica', name: 'North Africa', continent: 'Africa', x: 500, y: 250, value: 3, coastal: true },
  { id: 'egypt', name: 'Egypt', continent: 'Africa', x: 580, y: 250, value: 3, coastal: true },
  { id: 'westafrica', name: 'West Africa', continent: 'Africa', x: 470, y: 315, value: 3, coastal: true },
  { id: 'centralafrica', name: 'Central Africa', continent: 'Africa', x: 540, y: 345, value: 2, coastal: false },
  { id: 'eastafrica', name: 'East Africa', continent: 'Africa', x: 600, y: 335, value: 3, coastal: true },
  { id: 'southafrica', name: 'Southern Africa', continent: 'Africa', x: 560, y: 425, value: 3, coastal: true },
  // Middle East
  { id: 'turkey', name: 'Turkey', continent: 'Middle East', x: 580, y: 205, value: 3, coastal: true },
  { id: 'arabia', name: 'Arabia', continent: 'Middle East', x: 630, y: 270, value: 3, coastal: true },
  { id: 'iran', name: 'Iran', continent: 'Middle East', x: 662, y: 222, value: 3, coastal: true },
  // Asia
  { id: 'russia_terr', name: 'Russia', continent: 'Asia', x: 690, y: 110, value: 6, coastal: true },
  { id: 'centralasia', name: 'Central Asia', continent: 'Asia', x: 705, y: 175, value: 3, coastal: false },
  { id: 'pakistan', name: 'Pakistan', continent: 'Asia', x: 702, y: 232, value: 3, coastal: true },
  { id: 'india_terr', name: 'India', continent: 'Asia', x: 732, y: 262, value: 6, coastal: true },
  { id: 'china_terr', name: 'China', continent: 'Asia', x: 792, y: 200, value: 6, coastal: true },
  { id: 'korea', name: 'Korea', continent: 'Asia', x: 842, y: 198, value: 3, coastal: true },
  { id: 'japan', name: 'Japan', continent: 'Asia', x: 875, y: 188, value: 4, coastal: true },
  { id: 'seasia', name: 'Southeast Asia', continent: 'Asia', x: 800, y: 300, value: 4, coastal: true },
  // Oceania
  { id: 'australia', name: 'Australia', continent: 'Oceania', x: 862, y: 405, value: 4, coastal: true },
  { id: 'newzealand', name: 'New Zealand', continent: 'Oceania', x: 935, y: 445, value: 2, coastal: true },
];

// Undirected edges. `sea` edges require navies to transport armies across.
export const EDGES: Edge[] = [
  // North America
  { a: 'canada', b: 'usa_terr', type: 'land' },
  { a: 'canada', b: 'uk', type: 'sea' },
  { a: 'canada', b: 'russia_terr', type: 'sea' },
  { a: 'usa_terr', b: 'mexico', type: 'land' },
  { a: 'usa_terr', b: 'uk', type: 'sea' },
  { a: 'usa_terr', b: 'brazil_terr', type: 'sea' },
  { a: 'usa_terr', b: 'japan', type: 'sea' },
  { a: 'mexico', b: 'colombia', type: 'land' },
  // South America
  { a: 'colombia', b: 'brazil_terr', type: 'land' },
  { a: 'colombia', b: 'argentina', type: 'land' },
  { a: 'brazil_terr', b: 'argentina', type: 'land' },
  { a: 'brazil_terr', b: 'westafrica', type: 'sea' },
  { a: 'argentina', b: 'southafrica', type: 'sea' },
  // Europe
  { a: 'uk', b: 'westeurope', type: 'sea' },
  { a: 'uk', b: 'scandinavia', type: 'sea' },
  { a: 'uk', b: 'centraleurope', type: 'sea' },
  { a: 'westeurope', b: 'centraleurope', type: 'land' },
  { a: 'westeurope', b: 'northafrica', type: 'sea' },
  { a: 'centraleurope', b: 'scandinavia', type: 'land' },
  { a: 'centraleurope', b: 'easteurope', type: 'land' },
  { a: 'centraleurope', b: 'balkans', type: 'land' },
  { a: 'scandinavia', b: 'easteurope', type: 'land' },
  { a: 'scandinavia', b: 'russia_terr', type: 'land' },
  { a: 'easteurope', b: 'russia_terr', type: 'land' },
  { a: 'easteurope', b: 'balkans', type: 'land' },
  { a: 'easteurope', b: 'turkey', type: 'land' },
  { a: 'balkans', b: 'turkey', type: 'land' },
  { a: 'balkans', b: 'northafrica', type: 'sea' },
  // Africa
  { a: 'northafrica', b: 'egypt', type: 'land' },
  { a: 'northafrica', b: 'westafrica', type: 'land' },
  { a: 'egypt', b: 'arabia', type: 'land' },
  { a: 'egypt', b: 'eastafrica', type: 'land' },
  { a: 'egypt', b: 'turkey', type: 'sea' },
  { a: 'westafrica', b: 'centralafrica', type: 'land' },
  { a: 'centralafrica', b: 'eastafrica', type: 'land' },
  { a: 'centralafrica', b: 'southafrica', type: 'land' },
  { a: 'eastafrica', b: 'southafrica', type: 'land' },
  { a: 'eastafrica', b: 'arabia', type: 'sea' },
  { a: 'eastafrica', b: 'india_terr', type: 'sea' },
  { a: 'southafrica', b: 'australia', type: 'sea' },
  // Middle East
  { a: 'turkey', b: 'arabia', type: 'land' },
  { a: 'turkey', b: 'iran', type: 'land' },
  { a: 'arabia', b: 'iran', type: 'land' },
  { a: 'arabia', b: 'pakistan', type: 'sea' },
  { a: 'arabia', b: 'india_terr', type: 'sea' },
  { a: 'iran', b: 'centralasia', type: 'land' },
  { a: 'iran', b: 'pakistan', type: 'land' },
  // Asia
  { a: 'russia_terr', b: 'centralasia', type: 'land' },
  { a: 'russia_terr', b: 'china_terr', type: 'land' },
  { a: 'russia_terr', b: 'japan', type: 'sea' },
  { a: 'centralasia', b: 'pakistan', type: 'land' },
  { a: 'centralasia', b: 'india_terr', type: 'land' },
  { a: 'centralasia', b: 'china_terr', type: 'land' },
  { a: 'pakistan', b: 'india_terr', type: 'land' },
  { a: 'india_terr', b: 'china_terr', type: 'land' },
  { a: 'india_terr', b: 'seasia', type: 'sea' },
  { a: 'china_terr', b: 'korea', type: 'land' },
  { a: 'china_terr', b: 'seasia', type: 'land' },
  { a: 'china_terr', b: 'japan', type: 'sea' },
  { a: 'korea', b: 'japan', type: 'sea' },
  { a: 'seasia', b: 'australia', type: 'sea' },
  // Oceania
  { a: 'australia', b: 'newzealand', type: 'sea' },
];

// --- Derived lookups -----------------------------------------------------

export const TERRITORY_BY_ID: Record<string, Territory> = Object.fromEntries(
  TERRITORIES.map((t) => [t.id, t]),
);

export const POWER_BY_ID: Record<string, Power> = Object.fromEntries(
  POWERS.map((p) => [p.id, p]),
);

/** Adjacency map: territory id -> { neighborId -> edgeType }. */
export const ADJACENCY: Record<string, Record<string, 'land' | 'sea'>> = (() => {
  const adj: Record<string, Record<string, 'land' | 'sea'>> = {};
  for (const t of TERRITORIES) adj[t.id] = {};
  for (const e of EDGES) {
    adj[e.a][e.b] = e.type;
    adj[e.b][e.a] = e.type;
  }
  return adj;
})();

export function edgeType(from: string, to: string): 'land' | 'sea' | null {
  return ADJACENCY[from]?.[to] ?? null;
}

export const TOTAL_MAP_VALUE = TERRITORIES.reduce((s, t) => s + t.value, 0);
