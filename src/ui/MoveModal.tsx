import { useState } from 'react';
import {
  AIR_CAPACITY,
  canHold,
  FACTION_BY_ID,
  NAVY_CAPACITY,
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

  const isLand = toTile.type === 'land';
  const navyOk = canHold(toTile.type, 'navy'); // sea only

  const [counts, setCounts] = useState<Record<UnitType, number>>({ army: 0, navy: 0, air: 0 });

  // Transport capacity for armies given the currently-selected escorts.
  function capacityFor(navy: number, air: number): number {
    if (isLand) return src.army;
    return (navyOk ? navy * NAVY_CAPACITY : 0) + air * AIR_CAPACITY;
  }
  const armyMax = Math.min(src.army, capacityFor(counts.navy, counts.air));

  function setArmy(v: number) {
    setCounts((c) => {
      const max = Math.min(src.army, capacityFor(c.navy, c.air));
      return { ...c, army: Math.max(0, Math.min(max, v)) };
    });
  }
  function setNavy(v: number) {
    setCounts((c) => {
      const navy = Math.max(0, Math.min(src.navy, v));
      return { ...c, navy, army: Math.min(c.army, Math.min(src.army, capacityFor(navy, c.air))) };
    });
  }
  function setAir(v: number) {
    setCounts((c) => {
      const air = Math.max(0, Math.min(src.air, v));
      return { ...c, air, army: Math.min(c.army, Math.min(src.army, capacityFor(c.navy, air))) };
    });
  }

  // Which unit rows to show.
  const showNavy = src.navy > 0 && navyOk;
  const showAir = src.air > 0;
  const canCarry = isLand || (navyOk && src.navy > 0) || src.air > 0;
  const showArmy = src.army > 0 && canCarry;

  const total = counts.army + counts.navy + counts.air;
  const verb = friendly ? 'Reinforce' : 'Attack';
  const defLabel = dst.owner ? FACTION_BY_ID[dst.owner].name : 'Neutral';

  const rows: { u: UnitType; show: boolean; max: number; set: (d: number) => void }[] = [
    { u: 'army', show: showArmy, max: armyMax, set: setArmy },
    { u: 'navy', show: showNavy, max: src.navy, set: setNavy },
    { u: 'air', show: showAir, max: src.air, set: setAir },
  ];

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
        {!isLand && (
          <p className="hint">
            {toTile.type === 'sea' ? '🌊 Sea' : '⛰️ Mountain'} — armies must be carried.{' '}
            {toTile.type === 'sea'
              ? `Each ⚓ navy lifts ${NAVY_CAPACITY}, each ✈️ air ${AIR_CAPACITY}.`
              : `Each ✈️ air lifts ${AIR_CAPACITY}.`}{' '}
            Transport capacity: <b>{capacityFor(counts.navy, counts.air)}</b>.
          </p>
        )}

        {rows.filter((r) => r.show).length === 0 ? (
          <p className="hint">No units here can enter {toTile.type} (build navy/air, or bring transport).</p>
        ) : (
          rows
            .filter((r) => r.show)
            .map((r) => (
              <div className="build-row" key={r.u}>
                <span>
                  {UNIT[r.u].glyph} {UNIT[r.u].label} <span className="hint">({src[r.u]} here)</span>
                </span>
                <div className="stepper">
                  <button onClick={() => r.set(counts[r.u] - 1)}>−</button>
                  <span className="num">{counts[r.u]}</span>
                  <button disabled={counts[r.u] >= r.max} onClick={() => r.set(counts[r.u] + 1)}>+</button>
                  <button className="ghost" onClick={() => r.set(r.max)}>All</button>
                </div>
              </div>
            ))
        )}

        <div className="actions" style={{ justifyContent: 'flex-end' }}>
          <button className="ghost" onClick={onCancel}>Cancel</button>
          <button className="primary" disabled={total === 0} onClick={() => onConfirm(counts.army, counts.navy, counts.air)}>
            {verb} ({total})
          </button>
        </div>
      </div>
    </div>
  );
}
