# 🌍 Modern Conquest

A web-based, turn-by-turn strategy game — a **modern reskin of _Colonial Conquest_** (SSI,
Atari ST, 1985). Instead of 19th-century colonial empires, you command today's great powers
fighting for control of the present-day world.

- **Powers:** 🇺🇸 United States · 🇨🇳 China · 🇷🇺 Russia · 🇪🇺 European Union · 🇮🇳 India · 🇧🇷 Brazil
- **Map:** the contemporary world, divided into 31 regions across every continent, linked by land
  borders and sea lanes.
- **Multiplayer:** hotseat (pass &amp; play) — works great on **mobile** (touch, pan, pinch-zoom).
- **Goal:** control **60%** of the world's value, eliminate every rival, or be the leader when
  time runs out.

## Quick start

```bash
npm install
npm run dev      # open the printed localhost URL
```

Other scripts:

```bash
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build
npm test           # run the engine unit tests (Vitest)
npm run typecheck  # type-check only
```

## How to play

1. **Setup** — pick 2–6 powers (the order you pick them is the turn order). Unpicked powers stay
   neutral and defend their home regions. Choose a game length and seed, then **Start**.
2. On your turn you automatically **collect income** equal to the total value of the regions you
   hold.
3. Tap one of **your** regions to:
   - **Build** armies ($10) and, in coastal regions, navies ($30); or
   - **Move / attack** — adjacent regions glow; tap one to send forces.
4. **Land routes** (solid lines) move armies directly. **Sea routes** (dashed blue lines) need
   navies, and each navy can carry up to 4 armies. If the escorting fleet is sunk, the troops are
   lost at sea.
5. Combat is resolved round by round; defenders have a slight edge, and neutral garrisons are
   weaker. Take a region's last defender to capture it.
6. **Research** (Megalomania-style): instead of spending everything on troops, invest in three tech
   tracks — **⚔️ Weapons** (offense), **🛡️ Defenses**, and **🏭 Industry** (income multiplier) — that
   climb through six visual **Ages** (Conventional → Mechanized → Precision → Drone → Cyber-AI →
   Orbital). Weapons/Defenses shift combat odds in your favor; Industry compounds your economy. The
   constant tension: *strike now with what you have, or advance an age and fight from strength.*
7. **Missile strikes** 🚀: reach **Weapons L4 (Drone Age)** to bombard an *adjacent* enemy/neutral
   region — destroying troops without occupying, to soften it for a follow-up invasion. At **Weapons
   L6 (Orbital Age)** strikes go **global** and hit harder. Select one of your regions, tap **Strike**,
   then tap a highlighted ⊕ target.
8. Press **End turn** to pass the device to the next player.

## Architecture

The game logic lives in a **pure, deterministic, framework-free engine** so it can run unchanged
in the browser (hotseat today) and on an authoritative server (online play next).

```
src/engine/        # pure TypeScript game engine (no React, no DOM)
  rng.ts           #   seedable PRNG — every action is reproducible
  types.ts         #   data model & action types
  map.ts           #   the modern world: powers, 31 regions, adjacency
  game.ts          #   setup, income, combat, the apply() reducer, victory
  game.test.ts     #   17 unit tests (map integrity, combat, turns, victory)
src/ui/            # React components
  SetupScreen, GameScreen, WorldMap (SVG + pan/zoom/pinch), MoveModal, FinishedScreen
server/            # OPTIONAL WebSocket server scaffold for online multiplayer
```

Everything flows through one reducer:

```ts
const next = apply(state, action); // action = build | move | endTurn
```

Because `apply()` is pure and the RNG state is stored inside `GameState`, the same input always
produces the same output — which is what makes the online server (and the tests) simple.

## Roadmap

The stack was chosen to grow into full online play without rewrites:

- [x] Deterministic game engine + tests
- [x] Mobile-friendly hotseat UI with interactive world map
- [x] Real projected world map (continents from `world-atlas`)
- [x] Megalomania-style tech tree: three tracks (weapons/defenses/industry), six Ages, and
      age-gated missile/orbital strikes
- [ ] **Online multiplayer** — wire the React client to the WebSocket server in `server/`
      (rooms already broadcast authoritative state and enforce turn order)
- [ ] Lobby: choose powers, ready-up, reconnect
- [ ] Simple AI for empty seats
- [ ] More Colonial-Conquest mechanics: spies, sabotage, economic & military aid, fog of war

### Trying the server scaffold

```bash
cd server && npm install && npm run dev   # ws://localhost:8787
```

It imports the very same engine, owns one `GameState` per room, validates actions, enforces whose
turn it is, and broadcasts state to all clients. It's a starting point, not a finished lobby.

---

Inspired by SSI's _Colonial Conquest_. This is an original implementation with a contemporary theme.
