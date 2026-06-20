import { useMemo } from 'react';
import { FACTION_BY_ID, HERO_BY_ID } from '../engine';
import type { GameState } from '../engine';
import { HexMap } from './HexMap';

interface Props {
  game: GameState;
}

const EMPTY = new Set<string>();

/** Shown while an AI plays: the board updates (ownership is public) but all
 *  troop counts stay hidden as "?" so nothing private leaks to the watcher. */
export function AIScreen({ game }: Props) {
  const player = game.players[game.currentPlayerIndex];
  const faction = FACTION_BY_ID[player.faction];
  const hero = HERO_BY_ID[player.hero];
  const noop = useMemo(() => () => {}, []);

  return (
    <div className="game">
      <HexMap
        game={game}
        selectedId={null}
        validTargets={EMPTY}
        strikeTargets={EMPTY}
        visibleIds={EMPTY}
        onTap={noop}
      >
        <div className="hud-left">
          <span className="hud-chip" style={{ borderColor: faction.color }}>
            <span className="power-dot" style={{ background: faction.color }} />
            🤖 {faction.name}
          </span>
          <span className="hud-chip">⏳ {game.turn}/{game.config.maxTurns}</span>
        </div>
        <div className="ai-banner">
          {hero.emoji} {faction.name} (AI) is making its move…
        </div>
      </HexMap>
    </div>
  );
}
