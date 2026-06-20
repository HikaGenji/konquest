import type { HeroId } from './types';

// Each hero is a passive "player profile" that bends one or two core systems.
export interface HeroMods {
  /** Added to the attacker's per-round hit chance. */
  attackHit: number;
  /** Added to the defender's per-round hit chance. */
  defenseHit: number;
  /** Fraction off research costs (0..1). */
  researchDiscount: number;
  /** Fraction off unit build costs (0..1). */
  unitDiscount: { army: number; navy: number; air: number };
  /** Added to the income multiplier (e.g. 0.15 = +15%). */
  incomeBonus: number;
  /** Bonus starting treasury / capital armies. */
  startTreasury: number;
  startArmies: number;
  /** Fraction off spy cost (1 = free). */
  spyDiscount: number;
  /** Multiplier on strike cost, bonus strike damage, and tech-tier reduction. */
  strikeCostMult: number;
  strikeDamageBonus: number;
  strikeTechReduction: number;
}

export interface Hero {
  id: HeroId;
  name: string;
  title: string;
  emoji: string;
  blurb: string;
  mods: HeroMods;
}

function mods(p: Partial<Omit<HeroMods, 'unitDiscount'>> & { unitDiscount?: Partial<HeroMods['unitDiscount']> }): HeroMods {
  return {
    attackHit: 0,
    defenseHit: 0,
    researchDiscount: 0,
    incomeBonus: 0,
    startTreasury: 0,
    startArmies: 0,
    spyDiscount: 0,
    strikeCostMult: 1,
    strikeDamageBonus: 0,
    strikeTechReduction: 0,
    ...p,
    unitDiscount: { army: 0, navy: 0, air: 0, ...(p.unitDiscount ?? {}) },
  };
}

export const HEROES: Hero[] = [
  {
    id: 'caesar',
    name: 'Julius Caesar',
    title: 'The Tactician',
    emoji: '🏛️',
    blurb: 'Veni, vidi, vici — legions strike with +8% attack.',
    mods: mods({ attackHit: 0.08 }),
  },
  {
    id: 'attila',
    name: 'Attila',
    title: 'Scourge of God',
    emoji: '🐎',
    blurb: 'Ferocious raider: +11% attack, but −4% on defense.',
    mods: mods({ attackHit: 0.11, defenseHit: -0.04 }),
  },
  {
    id: 'leonidas',
    name: 'Leonidas',
    title: 'The Wall',
    emoji: '🛡️',
    blurb: 'This is Sparta — defenders fight with +12% defense.',
    mods: mods({ defenseHit: 0.12 }),
  },
  {
    id: 'genghis',
    name: 'Genghis Khan',
    title: 'The Great Khan',
    emoji: '🏹',
    blurb: 'Endless horde: armies cost 30% less.',
    mods: mods({ unitDiscount: { army: 0.3 } }),
  },
  {
    id: 'napoleon',
    name: 'Napoleon',
    title: 'Master Gunner',
    emoji: '⚔️',
    blurb: 'Artillery genius: strikes unlock a tier early, cost ½, +2 damage.',
    mods: mods({ strikeCostMult: 0.5, strikeDamageBonus: 2, strikeTechReduction: 1 }),
  },
  {
    id: 'alexander',
    name: 'Alexander',
    title: 'The Great',
    emoji: '👑',
    blurb: 'Unstoppable advance: start with +$25 and +6 armies.',
    mods: mods({ startTreasury: 25, startArmies: 6 }),
  },
  {
    id: 'cleopatra',
    name: 'Cleopatra',
    title: 'Pharaoh of Wealth',
    emoji: '💰',
    blurb: "Egypt's riches: +15% income every turn.",
    mods: mods({ incomeBonus: 0.15 }),
  },
  {
    id: 'suntzu',
    name: 'Sun Tzu',
    title: 'Art of War',
    emoji: '🕵️',
    blurb: 'Perfect intel: spying is free, and +5% attack.',
    mods: mods({ spyDiscount: 1, attackHit: 0.05 }),
  },
  {
    id: 'hannibal',
    name: 'Hannibal',
    title: 'Crosser of Alps',
    emoji: '🐘',
    blurb: 'Master of crossings: navies and air cost 30% less.',
    mods: mods({ unitDiscount: { navy: 0.3, air: 0.3 } }),
  },
  {
    id: 'saladin',
    name: 'Saladin',
    title: 'House of Wisdom',
    emoji: '📜',
    blurb: 'Enlightened: research costs 30% less — race up the ages.',
    mods: mods({ researchDiscount: 0.3 }),
  },
];

export const HERO_BY_ID: Record<HeroId, Hero> = Object.fromEntries(
  HEROES.map((h) => [h.id, h]),
) as Record<HeroId, Hero>;
