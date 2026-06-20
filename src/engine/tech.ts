// Megalomania-style technological progression. Each power independently
// climbs two research tracks — Weapons (offense) and Defenses (defense) —
// and the combination places it in one of six visual "Ages". Higher tech
// directly improves combat (see attackerHit / defenderHit in game.ts).

export interface Age {
  name: string;
  icon: string;
  color: string;
  /** Flavor name for this age's land forces. */
  unit: string;
}

export const AGES: Age[] = [
  { name: 'Conventional', icon: '🪖', color: '#9ca3af', unit: 'Infantry' },
  { name: 'Mechanized', icon: '🚙', color: '#c08457', unit: 'Armored Corps' },
  { name: 'Precision', icon: '🎯', color: '#fbbf24', unit: 'Precision Corps' },
  { name: 'Drone', icon: '🛰️', color: '#38bdf8', unit: 'Drone Swarms' },
  { name: 'Cyber-AI', icon: '🤖', color: '#a855f7', unit: 'AI Legions' },
  { name: 'Orbital', icon: '🛸', color: '#f472b6', unit: 'Orbital Command' },
];

export const MIN_TECH = 1;
export const MAX_TECH = AGES.length; // 6

/** Weapons level that unlocks adjacent missile strikes (Precision age). */
export const STRIKE_TECH = 3;
/** Weapons level that upgrades strikes to global range (Cyber-AI age). */
export const STRIKE_GLOBAL_TECH = 5;

/** Which Age (index into AGES) a power with these tech levels sits in. */
export function ageIndex(offense: number, defense: number, industry: number): number {
  const i = Math.round((offense + defense + industry) / 3) - 1;
  return Math.max(0, Math.min(AGES.length - 1, i));
}

export function ageFor(offense: number, defense: number, industry: number): Age {
  return AGES[ageIndex(offense, defense, industry)];
}

/** Can a power with this weapons level launch missile strikes at all? */
export function canStrike(offense: number): boolean {
  return offense >= STRIKE_TECH;
}

/** Do this power's strikes reach anywhere on the map (vs only adjacent)? */
export function hasGlobalStrike(offense: number): boolean {
  return offense >= STRIKE_GLOBAL_TECH;
}
