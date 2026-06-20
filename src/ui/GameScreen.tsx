import { useMemo, useState } from 'react';
import {
  ageFor,
  apply,
  canStrike,
  FACTION_BY_ID,
  hasGlobalStrike,
  incomeFor,
  MAX_TECH,
  neighborsOf,
  ownedTiles,
  ownedValue,
  researchCost,
  revealedTo,
  RULES,
  strikeTargets,
  TERRAIN,
  tileById,
  totalValue,
  UNIT,
  unitsForTerrain,
} from '../engine';
import type { GameState, UnitType } from '../engine';
import { HexMap } from './HexMap';
import { MoveModal } from './MoveModal';
import { TechBar } from './TechBar';

interface Props {
  game: GameState;
  setGame: (g: GameState) => void;
  onEndTurn: () => void;
  onQuit: () => void;
}

type Counts = Record<UnitType, number>;
const ZERO: Counts = { army: 0, navy: 0, air: 0 };

export function GameScreen({ game, setGame, onEndTurn, onQuit }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ from: string; to: string } | null>(null);
  const [build, setBuild] = useState<Counts>(ZERO);
  const [strikeMode, setStrikeMode] = useState(false);

  const player = game.players[game.currentPlayerIndex];
  const faction = FACTION_BY_ID[player.faction];
  const isOwn = (id: string | null) => !!id && game.tiles[id].owner === player.faction;

  const validTargets = useMemo(() => {
    if (strikeMode || !isOwn(selectedId)) return new Set<string>();
    return new Set(neighborsOf(game, selectedId!));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, game, strikeMode]);

  const strikeOptions = useMemo(() => {
    if (!strikeMode || !isOwn(selectedId)) return new Set<string>();
    return strikeTargets(game, selectedId!, player.offense);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, game, strikeMode]);

  const visibleIds = useMemo(() => revealedTo(game), [game]);

  function handleTap(id: string) {
    if (strikeMode && selectedId && strikeOptions.has(id)) {
      setGame(apply(game, { type: 'strike', from: selectedId, to: id }));
      setStrikeMode(false);
      return;
    }
    if (selectedId && id !== selectedId && isOwn(selectedId) && validTargets.has(id)) {
      setPendingMove({ from: selectedId, to: id });
      return;
    }
    setStrikeMode(false);
    setSelectedId(id);
    setBuild(ZERO);
  }

  function doBuild() {
    if (!selectedId) return;
    setGame(apply(game, { type: 'build', tileId: selectedId, ...build }));
    setBuild(ZERO);
  }
  function doMove(army: number, navy: number, air: number) {
    if (!pendingMove) return;
    setGame(apply(game, { type: 'move', from: pendingMove.from, to: pendingMove.to, army, navy, air }));
    setPendingMove(null);
    setSelectedId(null);
  }
  function doResearch(track: 'offense' | 'defense' | 'industry') {
    setGame(apply(game, { type: 'research', track }));
  }
  function doSpy(tileId: string) {
    setGame(apply(game, { type: 'spy', tileId }));
  }

  const sel = selectedId ? game.tiles[selectedId] : null;
  const selTile = selectedId ? tileById(game, selectedId) : null;
  const selVisible = !!selectedId && visibleIds.has(selectedId);
  const selOwner = sel && sel.owner ? game.players.find((p) => p.faction === sel.owner) : undefined;

  const sharePct = Math.round((ownedValue(game, player.faction) / totalValue(game)) * 100);
  const age = ageFor(player.offense, player.defense, player.industry);
  const offCost = researchCost(player.offense);
  const defCost = researchCost(player.defense);
  const indCost = researchCost(player.industry);
  const projectedIncome = incomeFor(game, player);

  const buildUnits: UnitType[] = selTile ? unitsForTerrain(selTile.type) : [];
  const buildCost = build.army * UNIT.army.cost + build.navy * UNIT.navy.cost + build.air * UNIT.air.cost;

  const recentVisible = game.log
    .filter((e) => e.faction === player.faction || e.faction === null)
    .slice(-6)
    .reverse();

  return (
    <div className="game">
      <div className="topbar">
        <div className="turn-power">
          <span className="power-dot" style={{ background: faction.color }} />
          {faction.name}
        </div>
        <span className="age-chip" style={{ borderColor: age.color, color: age.color }}>
          {age.icon} {age.name}
        </span>
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
          <span className="k">Map</span>
          <span className="v">{sharePct}%</span>
        </div>
        <button className="primary" onClick={onEndTurn}>End turn</button>
      </div>

      <HexMap
        game={game}
        selectedId={selectedId}
        validTargets={validTargets}
        strikeTargets={strikeOptions}
        visibleIds={visibleIds}
        onTap={handleTap}
      />

      <div className="panel">
        <div className="research">
          <TechBar player={player} />
          <div className="actions">
            <button disabled={player.offense >= MAX_TECH || offCost > player.treasury} onClick={() => doResearch('offense')}>
              ⚔️ {player.offense >= MAX_TECH ? 'Weapons maxed' : `Weapons → L${player.offense + 1} ($${offCost})`}
            </button>
            <button disabled={player.defense >= MAX_TECH || defCost > player.treasury} onClick={() => doResearch('defense')}>
              🛡️ {player.defense >= MAX_TECH ? 'Defenses maxed' : `Defenses → L${player.defense + 1} ($${defCost})`}
            </button>
            <button disabled={player.industry >= MAX_TECH || indCost > player.treasury} onClick={() => doResearch('industry')}>
              🏭 {player.industry >= MAX_TECH ? 'Industry maxed' : `Industry → L${player.industry + 1} ($${indCost})`}
            </button>
          </div>
          <p className="hint">
            Income <b>${projectedIncome}/turn</b>.{' '}
            {canStrike(player.offense)
              ? `🚀 ${hasGlobalStrike(player.offense) ? 'Orbital strikes hit anywhere' : 'Missile strikes hit adjacent tiles'}.`
              : 'Reach Weapons L4 (Drone Age) for 🚀 strikes.'}
          </p>
        </div>

        {!sel && (
          <>
            <h3>{faction.name}'s turn</h3>
            <p className="meta">
              Tap one of your tiles to build or move. 🪖 armies hold land · ⚓ navies hold sea · ✈️ air
              goes anywhere. Capture tiles to grow your income.
            </p>
          </>
        )}

        {sel && selTile && (
          <>
            <h3>
              <span
                className="power-dot"
                style={{ background: sel.owner ? FACTION_BY_ID[sel.owner].color : '#5b6b82', width: 14, height: 14 }}
              />
              {TERRAIN[selTile.type].glyph} {TERRAIN[selTile.type].label} ({selTile.q},{selTile.r})
            </h3>
            <p className="meta">
              value {selTile.value} · {sel.owner ? FACTION_BY_ID[sel.owner].name : 'Neutral'}
            </p>

            {selVisible ? (
              <p className="meta">
                Forces: 🪖 {sel.army} · ⚓ {sel.navy} · ✈️ {sel.air}
                {selOwner ? ` · ${ageFor(selOwner.offense, selOwner.defense, selOwner.industry).unit}` : ''}
              </p>
            ) : (
              <div className="build-row">
                <span>🕵️ Forces hidden — intel required</span>
                <button disabled={player.treasury < RULES.SPY_COST} onClick={() => doSpy(selectedId!)}>
                  Spy (${RULES.SPY_COST})
                </button>
              </div>
            )}

            {isOwn(selectedId) ? (
              <>
                {buildUnits.map((u) => (
                  <div className="build-row" key={u}>
                    <span>
                      {UNIT[u].glyph} {UNIT[u].label} <span className="hint">(${UNIT[u].cost})</span>
                    </span>
                    <div className="stepper">
                      <button onClick={() => setBuild((b) => ({ ...b, [u]: Math.max(0, b[u] - 1) }))}>−</button>
                      <span className="num">{build[u]}</span>
                      <button onClick={() => setBuild((b) => ({ ...b, [u]: b[u] + 1 }))}>+</button>
                    </div>
                  </div>
                ))}
                <div className="actions">
                  <button className="primary" disabled={buildCost === 0 || buildCost > player.treasury} onClick={doBuild}>
                    Build — ${buildCost}
                  </button>
                  {canStrike(player.offense) && (
                    <button
                      className={strikeMode ? 'primary' : ''}
                      disabled={!strikeMode && (player.treasury < RULES.STRIKE_COST || strikeTargets(game, selectedId!, player.offense).size === 0)}
                      onClick={() => setStrikeMode((s) => !s)}
                    >
                      {strikeMode ? '✖ Cancel strike' : `🚀 Strike ($${RULES.STRIKE_COST})`}
                    </button>
                  )}
                </div>
                <span className="hint">
                  {strikeMode ? 'Tap a highlighted target to bombard it.' : 'Tap a highlighted neighbor to move / attack.'}
                </span>
              </>
            ) : (
              <p className="hint">Not yours. Select one of your adjacent tiles, then tap here to attack.</p>
            )}
          </>
        )}

        <div className="log">
          {recentVisible.map((e, i) => (
            <div className="entry" key={i}>
              <b>T{e.turn}</b> {e.message}
            </div>
          ))}
        </div>

        <div className="actions" style={{ marginTop: 10 }}>
          <button className="ghost" onClick={onQuit}>Quit to menu</button>
          <span className="hint">You hold {ownedTiles(game, player.faction).length} tiles.</span>
        </div>
      </div>

      {pendingMove && (
        <MoveModal
          game={game}
          from={pendingMove.from}
          to={pendingMove.to}
          known={visibleIds.has(pendingMove.to)}
          onConfirm={doMove}
          onCancel={() => setPendingMove(null)}
        />
      )}
    </div>
  );
}
