import { useState } from 'react';
import { FACTIONS } from '../engine';
import type { FactionId } from '../engine';

interface Props {
  onStart: (factions: FactionId[], seed: number, maxTurns: number, radius: number) => void;
}

const SIZES: { label: string; radius: number }[] = [
  { label: 'Small', radius: 3 },
  { label: 'Medium', radius: 4 },
  { label: 'Large', radius: 5 },
];

export function SetupScreen({ onStart }: Props) {
  const [selected, setSelected] = useState<FactionId[]>(['crimson', 'azure']);
  const [maxTurns, setMaxTurns] = useState(30);
  const [radius, setRadius] = useState(4);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000));

  function toggle(id: FactionId) {
    setSelected((cur) => {
      if (cur.includes(id)) {
        if (cur.length <= 2) return cur; // need at least 2
        return cur.filter((p) => p !== id);
      }
      if (cur.length >= 4) return cur;
      return [...cur, id];
    });
  }

  const canStart = selected.length >= 2;

  return (
    <div className="setup">
      <h1>⬡ Hex Conquest</h1>
      <p className="sub">
        A randomly generated world of land, sea and mountains. Each faction starts on a single tile
        with an equal budget — expand, research, and conquer. Pass &amp; play hotseat.
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

      <p className="hint">
        🪖 armies hold land · ⚓ navies hold sea · ✈️ air goes anywhere. Control 60% of the map — or
        lead when time runs out — to win.
      </p>

      <button
        className="primary"
        style={{ width: '100%', marginTop: 12 }}
        disabled={!canStart}
        onClick={() => onStart(selected, seed, maxTurns, radius)}
      >
        {canStart ? 'Generate map & start' : 'Pick at least 2 factions'}
      </button>
    </div>
  );
}
