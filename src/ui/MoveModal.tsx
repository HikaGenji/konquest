import { useState } from 'react';
import {
  canHold,
  FACTION_BY_ID,
  tileById,
  tileTotal,
  UNIT,
} from '../engine';
import type { GameState, UnitType } from '../engine';

interface Props {
  game: GameState;
  from: string;
  to: string;
  known: boolean;
  onConfirm: (army: number, navy: number, air: number) => void;
  onCancel: () => void;
}

export function MoveModal({ game, from, to, known, onConfirm, onCancel }: Props) {
  const src = game.tiles[from];
  const dst = game.tiles[to];
  const toTile = tileById(game, to)!;
  const fromTile = tileById(game, from)!;
  const faction = game.players[game.currentPlayerIndex].faction;
  const friendly = dst.owner === faction;

  // Units present at the source that may legally enter the destination terrain.
  const movable = (['army', 'navy', 'air'] as UnitType[]).filter(
    (u) => src[u] > 0 && canHold(toTile.type, u),
  );

  const [counts, setCounts] = useState<Record<UnitType, number>>({
    army: 0,
    navy: 0,
    air: 0,
  });

  function set(u: UnitType, v: number) {
    setCounts((c) => ({ ...c, [u]: Math.max(0, Math.min(src[u], v)) }));
  }

  const total = counts.army + counts.navy + counts.air;
  const verb = friendly ? 'Reinforce' : 'Attack';
  const defLabel = dst.owner ? FACTION_BY_ID[dst.owner].name : 'Neutral';

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>
          {verb}: {fromTile.type} → {toTile.type}
        </h3>
        <p className="meta">
          Target: {friendly ? 'You' : defLabel}{' '}
          {friendly || known
            ? `(${tileTotal(dst)} units)`
            : '(🕵️ strength unknown — spy to scout first)'}
        </p>

        {movable.length === 0 ? (
          <p className="hint">
            You have no units here that can enter {toTile.type}.{' '}
            {toTile.type === 'sea' ? 'Build navies or air.' : toTile.type === 'mountain' ? 'Only air can.' : ''}
          </p>
        ) : (
          movable.map((u) => (
            <div className="build-row" key={u}>
              <span>
                {UNIT[u].glyph} {UNIT[u].label} <span className="hint">({src[u]} here)</span>
              </span>
              <div className="stepper">
                <button onClick={() => set(u, counts[u] - 1)}>−</button>
                <span className="num">{counts[u]}</span>
                <button onClick={() => set(u, counts[u] + 1)}>+</button>
                <button className="ghost" onClick={() => set(u, src[u])}>All</button>
              </div>
            </div>
          ))
        )}

        <div className="actions" style={{ justifyContent: 'flex-end' }}>
          <button className="ghost" onClick={onCancel}>Cancel</button>
          <button
            className="primary"
            disabled={total === 0}
            onClick={() => onConfirm(counts.army, counts.navy, counts.air)}
          >
            {verb} ({total})
          </button>
        </div>
      </div>
    </div>
  );
}
