// Deterministic, seedable PRNG (mulberry32).
// We store the current 32-bit integer state inside the game state so that
// every action is fully reproducible — essential for an authoritative server
// and for unit testing combat.

export interface Rng {
  state: number;
}

export function makeRng(seed: number): Rng {
  // Force into an unsigned 32-bit integer.
  return { state: seed >>> 0 };
}

/** Returns a float in [0, 1) and advances the generator in place. */
export function nextFloat(rng: Rng): number {
  rng.state = (rng.state + 0x6d2b79f5) >>> 0;
  let t = rng.state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Integer in [min, max] inclusive. */
export function nextInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(nextFloat(rng) * (max - min + 1));
}

/** Count how many of `n` independent trials succeed with probability `p`. */
export function rollHits(rng: Rng, n: number, p: number): number {
  let hits = 0;
  for (let i = 0; i < n; i++) {
    if (nextFloat(rng) < p) hits++;
  }
  return hits;
}
