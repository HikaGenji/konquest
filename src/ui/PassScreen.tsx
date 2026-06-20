import { FACTION_BY_ID, HERO_BY_ID } from '../engine';
import type { GameState } from '../engine';
import { HeroCard } from './HeroCard';

interface Props {
  game: GameState;
  onBegin: () => void;
}

/** Full-screen handoff between turns — shows the next player's hero profile
 *  and hides the board until they tap to begin (fog-of-war secrecy). */
export function PassScreen({ game, onBegin }: Props) {
  const player = game.players[game.currentPlayerIndex];
  const faction = FACTION_BY_ID[player.faction];
  const hero = HERO_BY_ID[player.hero];

  return (
    <div className="pass" style={{ ['--c' as string]: faction.color }}>
      <div className="pass-card">
        <div className="pass-turn">Turn {game.turn} / {game.config.maxTurns}</div>
        <span className="pass-dot" style={{ background: faction.color }} />
        <h1>{faction.name}</h1>
        <div style={{ width: '100%', maxWidth: 340 }}>
          <HeroCard hero={hero} accent={faction.color} />
        </div>
        <p className="hint">🔒 Keep the screen private — rivals shouldn't see your forces, treasury or tech.</p>
        <button className="primary pass-go" onClick={onBegin}>
          Start turn ▶
        </button>
      </div>
    </div>
  );
}
