// Builds SVG path data for the real continents, projected with the SAME
// equirectangular projection the territories use (engine/map.ts → project),
// so the landmasses line up exactly under the territory nodes.
import { feature } from 'topojson-client';
import landTopo from 'world-atlas/land-110m.json';
import { project } from '../engine/map';

type Ring = number[][];

function ringToPath(ring: Ring): string {
  let d = '';
  let prevLon: number | null = null;
  for (let i = 0; i < ring.length; i++) {
    const lon = ring[i][0];
    const lat = ring[i][1];
    const { x, y } = project(lon, lat);
    const cmd =
      i === 0 || (prevLon !== null && Math.abs(lon - prevLon) > 180) ? 'M' : 'L';
    d += `${cmd}${x.toFixed(1)} ${y.toFixed(1)}`;
    prevLon = lon;
  }
  return d + 'Z';
}

function geometryToPolygons(geometry: GeoJSON.Geometry): Ring[][] {
  if (geometry.type === 'MultiPolygon') return geometry.coordinates as Ring[][];
  if (geometry.type === 'Polygon') return [geometry.coordinates as Ring[]];
  return [];
}

function buildLandPath(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topo = landTopo as any;
  // land-110m's `land` object is a GeometryCollection, so `feature` returns a
  // FeatureCollection; older datasets may yield a single Feature.
  const geo = feature(topo, topo.objects.land) as
    | GeoJSON.Feature
    | GeoJSON.FeatureCollection;
  const features =
    geo.type === 'FeatureCollection' ? geo.features : [geo];

  let d = '';
  for (const f of features) {
    for (const polygon of geometryToPolygons(f.geometry)) {
      for (const ring of polygon) {
        d += ringToPath(ring);
      }
    }
  }
  return d;
}

export const LAND_PATH = buildLandPath();

/** Graticule lines (every 30°) for a subtle map feel. */
export function buildGraticule(): string {
  let d = '';
  for (let lon = -150; lon <= 180; lon += 30) {
    const a = project(lon, 85);
    const b = project(lon, -55);
    d += `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  for (let lat = -40; lat <= 80; lat += 30) {
    const a = project(-180, lat);
    const b = project(195, lat);
    d += `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  return d;
}

export const GRATICULE_PATH = buildGraticule();
