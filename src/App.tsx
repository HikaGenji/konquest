import { useState } from 'react';
import { apply, createGame } from './engine';
import type { FactionId, GameState, HeroId } from './engine';
import { SetupScreen } from './ui/SetupScreen';
import { GameScreen } from './ui/GameScreen';
import { FinishedScreen } from './ui/FinishedScreen';
import { PassScreen } from './ui/PassScreen';

export function App() {
  const [game, setGame] = useState<GameState | null>(null);
  // Between turns we show a handoff screen so the next player taps to begin —
  // this keeps each player's fog-of-war view private on a shared device.
  const [awaitingHandoff, setAwaitingHandoff] = useState(false);

  function start(
    factions: FactionId[],
    heroes: HeroId[],
    seed: number,
    maxTurns: number,
    radius: number,
  ) {
    setGame(createGame({ factions, heroes, seed, maxTurns, radius }));
    setAwaitingHandoff(true);
  }

  function endTurn() {
    if (!game) return;
    const next = apply(game, { type: 'endTurn' });
    setGame(next);
    if (next.status !== 'finished') setAwaitingHandoff(true);
  }

  function quit() {
    setGame(null);
    setAwaitingHandoff(false);
  }

  let screen;
  if (!game) {
    screen = <SetupScreen onStart={start} />;
  } else if (game.status === 'finished') {
    screen = <FinishedScreen game={game} onRestart={quit} />;
  } else if (awaitingHandoff) {
    screen = <PassScreen game={game} onBegin={() => setAwaitingHandoff(false)} />;
  } else {
    screen = <GameScreen game={game} setGame={setGame} onEndTurn={endTurn} onQuit={quit} />;
  }

  return <div className="app">{screen}</div>;
}
