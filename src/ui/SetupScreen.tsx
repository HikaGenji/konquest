import { useState } from 'react';
import { FACTIONS, FACTION_BY_ID, HEROES } from '../engine';
import type { FactionId, HeroId } from '../engine';
import { HeroCard } from './HeroCard';

interface Props {
  onStart: (
    factions: FactionId[],
    heroes: HeroId[],
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
  const [maxTurns, setMaxTurns] = useState(30);
  const [radius, setRadius] = useState(4);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000));

  // Hero draft state.
  const [heroes, setHeroes] = useState<(HeroId | null)[]>([]);
  const [draftIndex, setDraftIndex] = useState(0);

  function toggle(id: FactionId) {
    setSelected((cur) => {
      if (cur.includes(id)) {
        if (cur.length <= 2) return cur;
        return cur.filter((p) => p !== id);
      }
      if (cur.length >= 4) return cur;
      return [...cur, id];
    });
  }

  function beginDraft() {
    setHeroes(selected.map(() => null));
    setDraftIndex(0);
    setPhase('draft');
  }

  function pickHero(id: HeroId) {
    const next = [...heroes];
    next[draftIndex] = id;
    setHeroes(next);
    if (draftIndex + 1 < selected.length) {
      setDraftIndex(draftIndex + 1);
    } else {
      onStart(selected, next as HeroId[], seed, maxTurns, radius);
    }
  }

  if (phase === 'config') {
    const canNext = selected.length >= 2;
    return (
      <div className="setup">
        <h1>⬡ Hex Conquest</h1>
        <p className="sub">
          A randomly generated world of land, sea and mountains. Pick your factions and legendary
          heroes, then fight for control. Pass &amp; play hotseat.
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
            <button className="ghost" onClick={() => setSeed(Math.floor(Math.random() * 1_000_000))}>
              🎲 Reroll
            </button>
          </div>
        </div>

        <button className="primary" style={{ width: '100%', marginTop: 12 }} disabled={!canNext} onClick={beginDraft}>
          {canNext ? 'Next: choose heroes ▶' : 'Pick at least 2 factions'}
        </button>
      </div>
    );
  }

  // Draft phase
  const faction = FACTION_BY_ID[selected[draftIndex]];
  const taken = new Set(heroes.filter(Boolean) as HeroId[]);
  return (
    <div className="setup">
      <h1>Choose a hero</h1>
      <p className="sub" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="power-dot" style={{ background: faction.color }} />
        <b>{faction.name}</b> (Player {draftIndex + 1} of {selected.length}) — pick your leader.
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
