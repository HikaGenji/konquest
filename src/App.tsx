import { useState } from 'react';
import { createGame } from './engine';
import type { GameState, PowerId } from './engine';
import { SetupScreen } from './ui/SetupScreen';
import { GameScreen } from './ui/GameScreen';
import { FinishedScreen } from './ui/FinishedScreen';

export function App() {
  const [game, setGame] = useState<GameState | null>(null);

  function start(powers: PowerId[], seed: number, maxTurns: number) {
    setGame(createGame({ powers, seed, maxTurns }));
  }

  if (!game) {
    return (
      <div className="app">
        <SetupScreen onStart={start} />
      </div>
    );
  }

  return (
    <div className="app">
      {game.status === 'finished' ? (
        <FinishedScreen game={game} onRestart={() => setGame(null)} />
      ) : (
        <GameScreen game={game} setGame={setGame} onQuit={() => setGame(null)} />
      )}
    </div>
  );
}
