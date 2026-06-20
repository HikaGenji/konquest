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

// --- Map projection ------------------------------------------------------
// The board is drawn on a MAP_W x MAP_H canvas using a simple equirectangular
// projection, cropped to the inhabited latitude band so there is no wasted
// polar ocean. The SAME projection is used to draw the real continent
// outlines (see ui/worldGeo.ts), so every nation sits on its true geography.
export const MAP_W = 1000;
export const MAP_H = 520;
const LAT_TOP = 84;
const LAT_BOTTOM = -56;
const LON_LEFT = -169;
const LON_RIGHT = 191;

export function project(lon: number, lat: number): { x: number; y: number } {
  return {
    x: ((lon - LON_LEFT) / (LON_RIGHT - LON_LEFT)) * MAP_W,
    y: ((LAT_TOP - lat) / (LAT_TOP - LAT_BOTTOM)) * MAP_H,
  };
}

// Each territory is anchored to a real [longitude, latitude]; its canvas x/y is
// derived from the projection above. Values drive income, score and victory.
interface RawTerritory {
  id: string;
  name: string;
  continent: string;
  lon: number;
  lat: number;
  value: number;
  coastal: boolean;
}

const RAW_TERRITORIES: RawTerritory[] = [
  // North America
  { id: 'canada', name: 'Canada', continent: 'North America', lon: -106, lat: 58, value: 3, coastal: true },
  { id: 'usa_terr', name: 'United States', continent: 'North America', lon: -98, lat: 39, value: 6, coastal: true },
  { id: 'mexico', name: 'Mexico', continent: 'North America', lon: -102, lat: 23, value: 3, coastal: true },
  // South America
  { id: 'colombia', name: 'Gran Colombia', continent: 'South America', lon: -73, lat: 4, value: 3, coastal: true },
  { id: 'brazil_terr', name: 'Brazil', continent: 'South America', lon: -51, lat: -10, value: 5, coastal: true },
  { id: 'argentina', name: 'Argentina', continent: 'South America', lon: -65, lat: -36, value: 3, coastal: true },
  // Europe
  { id: 'uk', name: 'United Kingdom', continent: 'Europe', lon: -2, lat: 54, value: 4, coastal: true },
  { id: 'westeurope', name: 'Western Europe', continent: 'Europe', lon: 2, lat: 46, value: 5, coastal: true },
  { id: 'centraleurope', name: 'Central Europe', continent: 'Europe', lon: 14, lat: 51, value: 6, coastal: true },
  { id: 'scandinavia', name: 'Scandinavia', continent: 'Europe', lon: 17, lat: 63, value: 3, coastal: true },
  { id: 'easteurope', name: 'Eastern Europe', continent: 'Europe', lon: 32, lat: 49, value: 4, coastal: true },
  { id: 'balkans', name: 'Balkans', continent: 'Europe', lon: 22, lat: 44, value: 3, coastal: true },
  // Africa
  { id: 'northafrica', name: 'North Africa', continent: 'Africa', lon: 3, lat: 28, value: 3, coastal: true },
  { id: 'egypt', name: 'Egypt', continent: 'Africa', lon: 30, lat: 26, value: 3, coastal: true },
  { id: 'westafrica', name: 'West Africa', continent: 'Africa', lon: 6, lat: 9, value: 3, coastal: true },
  { id: 'centralafrica', name: 'Central Africa', continent: 'Africa', lon: 22, lat: -1, value: 2, coastal: false },
  { id: 'eastafrica', name: 'East Africa', continent: 'Africa', lon: 39, lat: 6, value: 3, coastal: true },
  { id: 'southafrica', name: 'Southern Africa', continent: 'Africa', lon: 25, lat: -29, value: 3, coastal: true },
  // Middle East
  { id: 'turkey', name: 'Turkey', continent: 'Middle East', lon: 35, lat: 39, value: 3, coastal: true },
  { id: 'arabia', name: 'Arabia', continent: 'Middle East', lon: 45, lat: 24, value: 3, coastal: true },
  { id: 'iran', name: 'Iran', continent: 'Middle East', lon: 54, lat: 32, value: 3, coastal: true },
  // Asia
  { id: 'russia_terr', name: 'Russia', continent: 'Asia', lon: 62, lat: 62, value: 6, coastal: true },
  { id: 'centralasia', name: 'Central Asia', continent: 'Asia', lon: 68, lat: 48, value: 3, coastal: false },
  { id: 'pakistan', name: 'Pakistan', continent: 'Asia', lon: 69, lat: 30, value: 3, coastal: true },
  { id: 'india_terr', name: 'India', continent: 'Asia', lon: 79, lat: 22, value: 6, coastal: true },
  { id: 'china_terr', name: 'China', continent: 'Asia', lon: 103, lat: 35, value: 6, coastal: true },
  { id: 'korea', name: 'Korea', continent: 'Asia', lon: 128, lat: 37, value: 3, coastal: true },
  { id: 'japan', name: 'Japan', continent: 'Asia', lon: 139, lat: 37, value: 4, coastal: true },
  { id: 'seasia', name: 'Southeast Asia', continent: 'Asia', lon: 108, lat: 6, value: 4, coastal: true },
  // Oceania
  { id: 'australia', name: 'Australia', continent: 'Oceania', lon: 134, lat: -25, value: 4, coastal: true },
  { id: 'newzealand', name: 'New Zealand', continent: 'Oceania', lon: 173, lat: -41, value: 2, coastal: true },
];

export const TERRITORIES: Territory[] = RAW_TERRITORIES.map((t) => {
  const { x, y } = project(t.lon, t.lat);
  return {
    id: t.id,
    name: t.name,
    continent: t.continent,
    x,
    y,
    value: t.value,
    coastal: t.coastal,
  };
});

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
