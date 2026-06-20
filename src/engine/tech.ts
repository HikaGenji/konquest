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

/** Which Age (index into AGES) a power with these tech levels sits in. */
export function ageIndex(offense: number, defense: number): number {
  const i = Math.round((offense + defense) / 2) - 1;
  return Math.max(0, Math.min(AGES.length - 1, i));
}

export function ageFor(offense: number, defense: number): Age {
  return AGES[ageIndex(offense, defense)];
}
