import { useState } from 'react';
import { FACTIONS, FACTION_BY_ID, HEROES } from '../engine';
import type { FactionId, HeroId } from '../engine';
import { HeroCard } from './HeroCard';

type Kind = 'human' | 'ai';

interface Props {
  onStart: (
    factions: FactionId[],
    heroes: HeroId[],
    controllers: Kind[],
    seed: number,
    maxTurns: number,
    radius: number,
  ) => void;
}

const SIZES: { label: string; radius: number }[] = [
  { label: 'Small', radius: 3 },
  { label: 'Medium', radius: 4 },
  { label: 'Large', radius: 5 },
];

export function SetupScreen({ onStart }: Props) {
  const [phase, setPhase] = useState<'config' | 'draft'>('config');
  const [selected, setSelected] = useState<FactionId[]>(['crimson', 'azure']);
  const [kinds, setKinds] = useState<Record<string, Kind>>({ crimson: 'human', azure: 'ai' });
  const [maxTurns, setMaxTurns] = useState(30);
  const [radius, setRadius] = useState(4);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000));

  // Hero draft (humans only).
  const [heroes, setHeroes] = useState<Record<string, HeroId>>({});
  const [draftOrder, setDraftOrder] = useState<FactionId[]>([]);
  const [draftIndex, setDraftIndex] = useState(0);

  function toggle(id: FactionId) {
    setSelected((cur) => {
      if (cur.includes(id)) {
        if (cur.length <= 2) return cur;
        return cur.filter((p) => p !== id);
      }
      if (cur.length >= 4) return cur;
      setKinds((k) => ({ ...k, [id]: k[id] ?? 'ai' }));
      return [...cur, id];
    });
  }

  function setKind(id: FactionId, kind: Kind) {
    setKinds((k) => ({ ...k, [id]: kind }));
  }

  const humanCount = selected.filter((f) => (kinds[f] ?? 'ai') === 'human').length;

  function beginDraft() {
    const humans = selected.filter((f) => (kinds[f] ?? 'ai') === 'human');
    // AI factions get random unused heroes; humans draft the rest.
    const used = new Set<HeroId>();
    const assigned: Record<string, HeroId> = {};
    const pool = [...HEROES].sort(() => (seed % 2 ? 1 : -1)); // light shuffle by seed parity
    const aiFactions = selected.filter((f) => (kinds[f] ?? 'ai') === 'ai');
    let pi = 0;
    for (const f of aiFactions) {
      while (used.has(pool[pi % pool.length].id)) pi++;
      assigned[f] = pool[pi % pool.length].id;
      used.add(assigned[f]);
      pi++;
    }
    setHeroes(assigned);
    setDraftOrder(humans);
    setDraftIndex(0);
    setPhase('draft');
    if (humans.length === 0) finish(assigned);
  }

  function finish(assigned: Record<string, HeroId>) {
    const heroList = selected.map((f) => assigned[f]);
    const controllers = selected.map((f) => (kinds[f] ?? 'ai'));
    onStart(selected, heroList, controllers, seed, maxTurns, radius);
  }

  function pickHero(id: HeroId) {
    const faction = draftOrder[draftIndex];
    const assigned = { ...heroes, [faction]: id };
    setHeroes(assigned);
    if (draftIndex + 1 < draftOrder.length) {
      setDraftIndex(draftIndex + 1);
    } else {
      finish(assigned);
    }
  }

  if (phase === 'config') {
    const canNext = selected.length >= 2 && humanCount >= 1;
    return (
      <div className="setup">
        <h1>⬡ Hex Conquest</h1>
        <p className="sub">
          A randomly generated world of land, sea and mountains. Pick factions (human or AI) and
          legendary heroes, then fight for control. Pass &amp; play hotseat.
        </p>

        <h3>Factions <span className="hint">({selected.length}/4 — pick 2 to 4)</span></h3>
        <div className="power-grid">
          {FACTIONS.map((f) => {
            const idx = selected.indexOf(f.id);
            const on = idx >= 0;
            return (
              <div
                key={f.id}
                className={`power-card${on ? ' selected' : ''}`}
                style={{ ['--c' as string]: f.color }}
                onClick={() => toggle(f.id)}
                role="button"
              >
                <span className="power-dot" style={{ background: f.color }} />
                <span>{f.name}</span>
                {on && <span className="order">P{idx + 1}</span>}
              </div>
            );
          })}
        </div>

        <h3 style={{ marginTop: 16 }}>Players</h3>
        <div className="player-list">
          {selected.map((f) => {
            const fc = FACTION_BY_ID[f];
            const kind = kinds[f] ?? 'ai';
            return (
              <div className="player-row" key={f}>
                <span className="power-dot" style={{ background: fc.color }} />
                <span className="grow">{fc.name}</span>
                <div className="row">
                  <button className={kind === 'human' ? 'primary' : ''} onClick={() => setKind(f, 'human')}>🧑 Human</button>
                  <button className={kind === 'ai' ? 'primary' : ''} onClick={() => setKind(f, 'ai')}>🤖 AI</button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="field">
          <label>Map size</label>
          <div className="row">
            {SIZES.map((s) => (
              <button key={s.radius} className={radius === s.radius ? 'primary' : ''} onClick={() => setRadius(s.radius)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Game length</label>
          <div className="row">
            {[20, 30, 50].map((n) => (
              <button key={n} className={maxTurns === n ? 'primary' : ''} onClick={() => setMaxTurns(n)}>
                {n} turns
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Seed</label>
          <div className="row">
            <span className="hint" style={{ fontVariantNumeric: 'tabular-nums' }}>{seed}</span>
            <button className="ghost" onClick={() => setSeed(Math.floor(Math.random() * 1_000_000))}>🎲 Reroll</button>
          </div>
        </div>

        <button className="primary" style={{ width: '100%', marginTop: 12 }} disabled={!canNext} onClick={beginDraft}>
          {selected.length < 2 ? 'Pick at least 2 factions' : humanCount < 1 ? 'Need at least 1 human' : 'Next: choose heroes ▶'}
        </button>
      </div>
    );
  }

  // Draft phase (humans only)
  const faction = FACTION_BY_ID[draftOrder[draftIndex]];
  const taken = new Set(Object.values(heroes));
  return (
    <div className="setup">
      <h1>Choose a hero</h1>
      <p className="sub" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="power-dot" style={{ background: faction.color }} />
        <b>{faction.name}</b> (Human {draftIndex + 1} of {draftOrder.length}) — pick your leader.
      </p>
      <div className="hero-grid">
        {HEROES.map((h) => (
          <HeroCard key={h.id} hero={h} taken={taken.has(h.id)} accent={faction.color} onClick={() => pickHero(h.id)} />
        ))}
      </div>
      <button className="ghost" style={{ marginTop: 12 }} onClick={() => (draftIndex === 0 ? setPhase('config') : setDraftIndex(draftIndex - 1))}>
        ◀ Back
      </button>
    </div>
  );
}
