import { ageFor, ownedTerritories, ownedValue, POWER_BY_ID, TOTAL_MAP_VALUE } from '../engine';
import type { GameState } from '../engine';

interface Props {
  game: GameState;
  onRestart: () => void;
}

export function FinishedScreen({ game, onRestart }: Props) {
  const ranked = [...game.players].sort(
    (a, b) => ownedValue(game, b.power) - ownedValue(game, a.power),
  );
  const winner = game.winner ? POWER_BY_ID[game.winner] : null;

  return (
    <div className="finished">
      <div className="crown">{winner ? '👑' : '🏳️'}</div>
      <h1>{winner ? `${winner.name} wins!` : 'Stalemate'}</h1>
      <p className="hint">Final standings after {game.turn} turns</p>

      <div className="scoreboard">
        {ranked.map((p) => {
          const power = POWER_BY_ID[p.power];
          const val = ownedValue(game, p.power);
          const pct = Math.round((val / TOTAL_MAP_VALUE) * 100);
          const age = ageFor(p.offense, p.defense, p.industry);
          return (
            <div className="row-s" key={p.power}>
              <span className="power-dot" style={{ background: power.color }} />
              <span className="grow">
                {power.name} {!p.alive && '☠️'}
              </span>
              <span className="hint" title={`${age.name} Age`}>{age.icon}</span>
              <span className="hint">{ownedTerritories(game, p.power).length} regions</span>
              <b style={{ minWidth: 44, textAlign: 'right' }}>{pct}%</b>
            </div>
          );
        })}
      </div>

      <button className="primary" style={{ marginTop: 22 }} onClick={onRestart}>
        New game
      </button>
    </div>
  );
}
