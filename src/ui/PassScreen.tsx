import { POWER_BY_ID } from '../engine';
import type { GameState } from '../engine';

interface Props {
  game: GameState;
  onBegin: () => void;
}

/** Full-screen handoff between turns — hides the board until the next
 *  player taps to begin, preserving fog-of-war secrecy on one device. */
export function PassScreen({ game, onBegin }: Props) {
  const player = game.players[game.currentPlayerIndex];
  const power = POWER_BY_ID[player.power];

  return (
    <div className="pass" style={{ ['--c' as string]: power.color }}>
      <div className="pass-card">
        <div className="pass-turn">Turn {game.turn} / {game.config.maxTurns}</div>
        <span className="pass-dot" style={{ background: power.color }} />
        <h1>{power.name}</h1>
        <p className="pass-sub">Pass the device to this player.</p>
        <p className="hint">🔒 Keep the screen private — rival players shouldn't see your forces, treasury or tech.</p>
        <button className="primary pass-go" onClick={onBegin}>
          Start turn ▶
        </button>
      </div>
    </div>
  );
}
