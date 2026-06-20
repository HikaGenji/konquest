// Axial hex-grid helpers (flat-top orientation).
// Coordinates are axial (q, r); the third cube coord is s = -q - r.

export interface Axial {
  q: number;
  r: number;
}

/** The six neighbour directions in axial coordinates. */
export const HEX_DIRECTIONS: Axial[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function key(q: number, r: number): string {
  return `${q},${r}`;
}

export function hexDistance(a: Axial, b: Axial): number {
  return (
    (Math.abs(a.q - b.q) +
      Math.abs(a.q + a.r - b.q - b.r) +
      Math.abs(a.r - b.r)) /
    2
  );
}

/** Flat-top axial → pixel centre for a hex of the given size (centre radius). */
export function hexToPixel(q: number, r: number, size: number): { x: number; y: number } {
  return {
    x: size * (1.5 * q),
    y: size * (Math.sqrt(3) * (r + q / 2)),
  };
}

/** All axial coords inside a hexagon-shaped board of the given radius. */
export function hexagonBoard(radius: number): Axial[] {
  const out: Axial[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= radius) {
        out.push({ q, r });
      }
    }
  }
  return out;
}

/** The six corner tiles of a hexagon board of the given radius. */
export function boardCorners(radius: number): Axial[] {
  const R = radius;
  return [
    { q: R, r: 0 },
    { q: R, r: -R },
    { q: 0, r: -R },
    { q: -R, r: 0 },
    { q: -R, r: R },
    { q: 0, r: R },
  ];
}

/** Polygon point string for a flat-top hex centred at (cx, cy). */
export function hexPolygon(cx: number, cy: number, size: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i);
    pts.push(`${(cx + size * Math.cos(angle)).toFixed(2)},${(cy + size * Math.sin(angle)).toFixed(2)}`);
  }
  return pts.join(' ');
}
