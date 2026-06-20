import { useState } from 'react';
import { POWERS } from '../engine';
import type { PowerId } from '../engine';

interface Props {
  onStart: (powers: PowerId[], seed: number, maxTurns: number) => void;
}

export function SetupScreen({ onStart }: Props) {
  // Pre-select the first two powers so a game is one tap away.
  const [selected, setSelected] = useState<PowerId[]>(['usa', 'china']);
  const [maxTurns, setMaxTurns] = useState(30);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000));

  function toggle(id: PowerId) {
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((p) => p !== id);
      if (cur.length >= 6) return cur;
      return [...cur, id];
    });
  }

  const canStart = selected.length >= 2;

  return (
    <div className="setup">
      <h1>🌍 Modern Conquest</h1>
      <p className="sub">
        A turn-by-turn struggle of present-day superpowers — a modern reskin of the
        classic <i>Colonial Conquest</i>. Pass &amp; play hotseat.
      </p>

      <h3>Choose powers <span className="hint">({selected.length}/6 — tap to add, order = turn order)</span></h3>
      <div className="power-grid">
        {POWERS.map((p) => {
          const idx = selected.indexOf(p.id);
          const on = idx >= 0;
          return (
            <div
              key={p.id}
              className={`power-card${on ? ' selected' : ''}`}
              style={{ ['--c' as string]: p.color }}
              onClick={() => toggle(p.id)}
              role="button"
            >
              <span className="power-dot" style={{ background: p.color }} />
              <span>{p.name}</span>
              {on && <span className="order">P{idx + 1}</span>}
            </div>
          );
        })}
      </div>

      <div className="field">
        <label>Game length</label>
        <div className="row">
          {[20, 30, 50].map((n) => (
            <button
              key={n}
              className={maxTurns === n ? 'primary' : ''}
              onClick={() => setMaxTurns(n)}
            >
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
        Unselected powers stay neutral and defend their home regions. First to control 60% of the
        world — or the leader when time runs out — wins.
      </p>

      <button
        className="primary"
        style={{ width: '100%', marginTop: 12 }}
        disabled={!canStart}
        onClick={() => onStart(selected, seed, maxTurns)}
      >
        {canStart ? 'Start game' : 'Pick at least 2 powers'}
      </button>
    </div>
  );
}
