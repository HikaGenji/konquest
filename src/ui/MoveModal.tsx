import { useState } from 'react';
import { edgeType, RULES, TERRITORY_BY_ID, POWER_BY_ID } from '../engine';
import type { GameState } from '../engine';

interface Props {
  game: GameState;
  from: string;
  to: string;
  onConfirm: (armies: number, navies: number) => void;
  onCancel: () => void;
}

export function MoveModal({ game, from, to, onConfirm, onCancel }: Props) {
  const type = edgeType(from, to)!;
  const isSea = type === 'sea';
  const src = game.territories[from];
  const dst = game.territories[to];
  const friendly = dst.owner === game.players[game.currentPlayerIndex].power;

  const [navies, setNavies] = useState(isSea ? Math.min(1, src.navies) : 0);
  const maxArmiesBySea = isSea ? navies * RULES.CARRY_PER_NAVY : src.armies;
  const armyCap = Math.min(src.armies, maxArmiesBySea);
  const [armies, setArmies] = useState(armyCap);

  // Keep army selection within the (navy-dependent) cap.
  const clampedArmies = Math.min(armies, armyCap);

  const fromName = TERRITORY_BY_ID[from].name;
  const toName = TERRITORY_BY_ID[to].name;
  const verb = friendly ? 'Reinforce' : 'Attack';
  const defLabel = dst.owner ? POWER_BY_ID[dst.owner].name : 'Neutral';

  const canGo = clampedArmies > 0 || (isSea && friendly && navies > 0);

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>
          {verb}: {fromName} → {toName}
        </h3>
        <p className="meta">
          {isSea ? 'Sea crossing' : 'Land route'} · Defender: {friendly ? 'You' : defLabel} (
          {dst.armies} armies{dst.navies > 0 ? `, ${dst.navies} navies` : ''})
        </p>

        {isSea && (
          <div className="build-row">
            <span>Navies (carry {RULES.CARRY_PER_NAVY} armies each)</span>
            <div className="row">
              <input
                type="range"
                min={1}
                max={Math.max(1, src.navies)}
                value={navies}
                onChange={(e) => setNavies(Number(e.target.value))}
                style={{ width: 140 }}
              />
              <b style={{ minWidth: 24, textAlign: 'right' }}>{navies}</b>
            </div>
          </div>
        )}

        <div className="build-row">
          <span>Armies</span>
          <div className="row">
            <input
              type="range"
              min={0}
              max={Math.max(0, armyCap)}
              value={clampedArmies}
              onChange={(e) => setArmies(Number(e.target.value))}
              style={{ width: 140 }}
            />
            <b style={{ minWidth: 24, textAlign: 'right' }}>{clampedArmies}</b>
          </div>
        </div>

        <p className="hint">
          {isSea
            ? `Up to ${armyCap} armies can embark on ${navies} ${navies === 1 ? 'navy' : 'navies'}.`
            : `Leaving ${src.armies - clampedArmies} armies to hold ${fromName}.`}
        </p>

        <div className="actions" style={{ justifyContent: 'flex-end' }}>
          <button className="ghost" onClick={onCancel}>Cancel</button>
          <button className="primary" disabled={!canGo} onClick={() => onConfirm(clampedArmies, isSea ? navies : 0)}>
            {verb}
          </button>
        </div>
      </div>
    </div>
  );
}
