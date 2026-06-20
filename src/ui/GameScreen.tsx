import { useMemo, useState } from 'react';
import {
  apply,
  neighbors,
  ownedTerritories,
  ownedValue,
  POWER_BY_ID,
  RULES,
  TERRITORY_BY_ID,
  TOTAL_MAP_VALUE,
} from '../engine';
import type { GameState } from '../engine';
import { WorldMap } from './WorldMap';
import { MoveModal } from './MoveModal';

interface Props {
  game: GameState;
  setGame: (g: GameState) => void;
  onQuit: () => void;
}

export function GameScreen({ game, setGame, onQuit }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ from: string; to: string } | null>(null);
  const [buildArmies, setBuildArmies] = useState(0);
  const [buildNavies, setBuildNavies] = useState(0);

  const player = game.players[game.currentPlayerIndex];
  const power = POWER_BY_ID[player.power];
  const isOwn = (id: string | null) => !!id && game.territories[id].owner === player.power;

  const validTargets = useMemo(() => {
    if (!isOwn(selectedId)) return new Set<string>();
    return new Set(Object.keys(neighbors(selectedId!)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, game]);

  function resetSelectionBuild() {
    setBuildArmies(0);
    setBuildNavies(0);
  }

  function handleTap(id: string) {
    if (selectedId && id !== selectedId && isOwn(selectedId) && validTargets.has(id)) {
      setPendingMove({ from: selectedId, to: id });
      return;
    }
    setSelectedId(id);
    resetSelectionBuild();
  }

  function doBuild() {
    if (!selectedId) return;
    setGame(apply(game, { type: 'build', territoryId: selectedId, armies: buildArmies, navies: buildNavies }));
    resetSelectionBuild();
  }

  function doMove(armies: number, navies: number) {
    if (!pendingMove) return;
    setGame(apply(game, { type: 'move', from: pendingMove.from, to: pendingMove.to, armies, navies }));
    setPendingMove(null);
    setSelectedId(null);
  }

  function endTurn() {
    setGame(apply(game, { type: 'endTurn' }));
    setSelectedId(null);
    resetSelectionBuild();
  }

  const sel = selectedId ? game.territories[selectedId] : null;
  const selTerr = selectedId ? TERRITORY_BY_ID[selectedId] : null;
  const sharePct = Math.round((ownedValue(game, player.power) / TOTAL_MAP_VALUE) * 100);
  const buildCost = buildArmies * RULES.ARMY_COST + buildNavies * RULES.NAVY_COST;
  const recent = game.log.slice(-6).reverse();

  return (
    <div className="game">
      <div className="topbar">
        <div className="turn-power">
          <span className="power-dot" style={{ background: power.color }} />
          {power.name}
        </div>
        <div className="spacer" />
        <div className="stat">
          <span className="k">Treasury</span>
          <span className="v">${player.treasury}</span>
        </div>
        <div className="stat">
          <span className="k">Turn</span>
          <span className="v">{game.turn}/{game.config.maxTurns}</span>
        </div>
        <div className="stat">
          <span className="k">World</span>
          <span className="v">{sharePct}%</span>
        </div>
        <button className="primary" onClick={endTurn}>End turn</button>
      </div>

      <WorldMap game={game} selectedId={selectedId} validTargets={validTargets} onTap={handleTap} />

      <div className="panel">
        {!sel && (
          <>
            <h3>{power.name}'s turn</h3>
            <p className="meta">
              Tap one of your regions to build forces or launch a move. Solid lines are land routes;
              dashed blue lines are sea routes (need navies). Reach 60% of world value to win.
            </p>
          </>
        )}

        {sel && selTerr && (
          <>
            <h3>
              <span
                className="power-dot"
                style={{ background: sel.owner ? POWER_BY_ID[sel.owner].color : '#5b6b82', width: 14, height: 14 }}
              />
              {selTerr.name}
            </h3>
            <p className="meta">
              {selTerr.continent} · value {selTerr.value} · {sel.armies} armies
              {sel.navies > 0 ? `, ${sel.navies} navies` : ''} ·{' '}
              {sel.owner ? POWER_BY_ID[sel.owner].name : 'Neutral'}
              {selTerr.coastal ? ' · coastal' : ' · landlocked'}
            </p>

            {isOwn(selectedId) ? (
              <>
                <div className="build-row">
                  <span>Armies (${RULES.ARMY_COST} each)</span>
                  <div className="stepper">
                    <button onClick={() => setBuildArmies((n) => Math.max(0, n - 1))}>−</button>
                    <span className="num">{buildArmies}</span>
                    <button onClick={() => setBuildArmies((n) => n + 1)}>+</button>
                  </div>
                </div>
                <div className="build-row">
                  <span>
                    Navies (${RULES.NAVY_COST} each){!selTerr.coastal && <span className="hint"> — coastal only</span>}
                  </span>
                  <div className="stepper">
                    <button
                      disabled={!selTerr.coastal}
                      onClick={() => setBuildNavies((n) => Math.max(0, n - 1))}
                    >
                      −
                    </button>
                    <span className="num">{buildNavies}</span>
                    <button
                      disabled={!selTerr.coastal}
                      onClick={() => setBuildNavies((n) => n + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="actions">
                  <button
                    className="primary"
                    disabled={buildCost === 0 || buildCost > player.treasury}
                    onClick={doBuild}
                  >
                    Build — ${buildCost}
                  </button>
                  {buildCost > player.treasury && <span className="hint">Not enough money</span>}
                  <span className="hint">Tap a highlighted neighbor to move / attack.</span>
                </div>
              </>
            ) : (
              <p className="hint">
                This region isn't yours. Select one of your adjacent regions, then tap here to attack.
              </p>
            )}
          </>
        )}

        <div className="log">
          {recent.map((e, i) => (
            <div className="entry" key={i}>
              <b>T{e.turn}</b> {e.message}
            </div>
          ))}
        </div>

        <div className="actions" style={{ marginTop: 10 }}>
          <button className="ghost" onClick={onQuit}>Quit to menu</button>
          <span className="hint">
            You hold {ownedTerritories(game, player.power).length} regions.
          </span>
        </div>
      </div>

      {pendingMove && (
        <MoveModal
          game={game}
          from={pendingMove.from}
          to={pendingMove.to}
          onConfirm={doMove}
          onCancel={() => setPendingMove(null)}
        />
      )}
    </div>
  );
}
