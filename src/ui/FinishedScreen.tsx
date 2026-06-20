import { ageFor, FACTION_BY_ID, ownedTiles, ownedValue, totalValue } from '../engine';
import type { GameState } from '../engine';

interface Props {
  game: GameState;
  onRestart: () => void;
}

export function FinishedScreen({ game, onRestart }: Props) {
  const total = totalValue(game);
  const ranked = [...game.players].sort(
    (a, b) => ownedValue(game, b.faction) - ownedValue(game, a.faction),
  );
  const winner = game.winner ? FACTION_BY_ID[game.winner] : null;

  return (
    <div className="finished">
      <div className="crown">{winner ? '👑' : '🏳️'}</div>
      <h1>{winner ? `${winner.name} wins!` : 'Stalemate'}</h1>
      <p className="hint">Final standings after {game.turn} turns</p>

      <div className="scoreboard">
        {ranked.map((p) => {
          const f = FACTION_BY_ID[p.faction];
          const pct = Math.round((ownedValue(game, p.faction) / total) * 100);
          const age = ageFor(p.offense, p.defense, p.industry);
          return (
            <div className="row-s" key={p.faction}>
              <span className="power-dot" style={{ background: f.color }} />
              <span className="grow">
                {f.name} {!p.alive && '☠️'}
              </span>
              <span className="hint" title={`${age.name} Age`}>{age.icon}</span>
              <span className="hint">{ownedTiles(game, p.faction).length} tiles</span>
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
