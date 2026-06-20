import { useState } from 'react';
import { aiTakeTurn, apply, createGame, currentPlayer } from './engine';
import type { FactionId, GameAction, GameState, HeroId } from './engine';
import { SetupScreen } from './ui/SetupScreen';
import { GameScreen } from './ui/GameScreen';
import { FinishedScreen } from './ui/FinishedScreen';
import { PassScreen } from './ui/PassScreen';
import { AIScreen } from './ui/AIScreen';

const AI_TURN_MS = 600;

export function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [awaitingHandoff, setAwaitingHandoff] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);

  function start(
    factions: FactionId[],
    heroes: HeroId[],
    controllers: ('human' | 'ai')[],
    seed: number,
    maxTurns: number,
    radius: number,
  ) {
    afterTurnEnd(createGame({ factions, heroes, controllers, seed, maxTurns, radius }));
  }

  /** Route to the right screen at the start of a (new) player's turn. */
  function afterTurnEnd(s: GameState) {
    setGame(s);
    if (s.status === 'finished') {
      setAiThinking(false);
      setAwaitingHandoff(false);
      return;
    }
    if (currentPlayer(s).isAI) {
      setAwaitingHandoff(false);
      setAiThinking(true);
      // Let the board paint, then run the AI turn and continue the chain.
      setTimeout(() => afterTurnEnd(aiTakeTurn(s)), AI_TURN_MS);
    } else {
      setAiThinking(false);
      setAwaitingHandoff(true);
    }
  }

  /** A human action — auto-ends the turn once the action budget is spent. */
  function dispatch(action: GameAction) {
    if (!game) return;
    if (action.type === 'endTurn') {
      afterTurnEnd(apply(game, action));
      return;
    }
    const next = apply(game, action);
    if (next.status === 'playing' && next.actionsLeft <= 0) {
      afterTurnEnd(apply(next, { type: 'endTurn' }));
    } else {
      setGame(next);
    }
  }

  function quit() {
    setGame(null);
    setAwaitingHandoff(false);
    setAiThinking(false);
  }

  let screen;
  if (!game) {
    screen = <SetupScreen onStart={start} />;
  } else if (game.status === 'finished') {
    screen = <FinishedScreen game={game} onRestart={quit} />;
  } else if (aiThinking) {
    screen = <AIScreen game={game} />;
  } else if (awaitingHandoff) {
    screen = <PassScreen game={game} onBegin={() => setAwaitingHandoff(false)} />;
  } else {
    screen = <GameScreen game={game} onAction={dispatch} onQuit={quit} />;
  }

  return <div className="app">{screen}</div>;
}
