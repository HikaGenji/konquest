# ⬡ Hex Conquest

A web-based, turn-by-turn strategy game on a **procedurally generated hex map**. Each faction starts
on a single tile with an equal budget and fights to dominate a random world of land, sea and
mountains. (Evolved from a *Colonial Conquest* reskin into its own hex-based game.)

- **Factions:** 2–4 generic powers — 🔴 Crimson, 🔵 Azure, 🟢 Verdant, 🟡 Amber.
- **Map:** a randomly generated hexagon board (Small/Medium/Large) of three terrains —
  🌲 **land**, 🌊 **sea**, ⛰️ **mountain**.
- **Units & terrain:** 🪖 **armies** hold land · ⚓ **navies** hold sea · ✈️ **air** goes anywhere.
  Navies and air also **transport armies** — each navy ferries 2 armies over sea, each air lifts 1
  army over sea or mountain — so you can stage amphibious and airborne assaults.
- **Multiplayer:** hotseat (pass &amp; play) with a handoff screen and fog of war — works on **mobile**
  (touch, pan, pinch-zoom).
- **Goal:** control **60%** of the map's value, eliminate every rival, or lead when time runs out.

## Quick start

```bash
npm install
npm run dev        # open the printed localhost URL
```

`npm run build` · `npm run preview` · `npm test` · `npm run typecheck`

## How to play

1. **Setup** — pick 2–4 factions and mark each **Human or 🤖 AI**, choose a map size and seed, then each
   human drafts one of **10 legendary heroes** (Caesar, Attila, Leonidas, Genghis Khan, Napoleon,
   Alexander, Cleopatra, Sun Tzu, Hannibal, Saladin); AI players get random heroes. Your hero is your
   profile and gives a unique passive — e.g. +attack, cheaper research, bonus income, free spying,
   discounted units, or stronger strikes. Each faction starts on one land tile with the same budget.
2. Each turn you **collect income** equal to the value of the tiles you hold (×Industry bonus), and
   get **3 actions** to spend — build, move, research, strike or spy each cost one. The ⚡ counter in
   the HUD shows how many remain, and the **turn ends automatically** once all three are used (you can
   also end early). **AI factions** take their turns on their own.
3. Tap one of **your** tiles to:
   - **Build** units the terrain allows (🪖 on land, ⚓ on sea, ✈️ anywhere); or
   - **Move / attack** — adjacent tiles glow; tap one and choose which units to send. To put armies
     onto sea or mountain tiles, include enough **transport** (⚓ navy carries 2 each over sea, ✈️ air
     lifts 1 each over sea/mountain); the move dialog shows your live transport capacity.
4. **Research** three tech tracks — **⚔️ Weapons**, **🛡️ Defenses**, **🏭 Industry** — that climb
   through six **Ages** (Conventional → … → Orbital). Weapons/Defenses tilt combat; Industry compounds
   income. *Strike now, or advance an age and fight from strength.*
5. **🚀 Strikes** unlock at Weapons L4 (Drone Age): bombard an adjacent tile (global at L6, Orbital
   Age) to destroy units without occupying.
6. **🌫️ Fog of war** — you see exact unit counts only on your own tiles; everywhere else shows `?`.
   **🕵️ Spy** (paid) reveals one tile's forces for your turn. Treasury, tech and your log stay private.
7. **End turn** shows a **handoff screen** so the next player taps to begin — no peeking on a shared
   device.

## Architecture

A pure, deterministic, framework-free engine drives everything (so it can later run on an
authoritative server for online play):

```
src/engine/
  hex.ts      # axial hex math: neighbours, board generation, pixel layout
  rng.ts      # seedable PRNG — fully reproducible
  types.ts    # factions, tiles, units, actions
  map.ts      # terrain rules, random map generation, faction placement
  tech.ts     # six Ages, research, strike gating
  game.ts     # setup, income, combat, the apply() reducer, fog, victory
  game.test.ts# 22 unit tests
src/ui/       # React: SetupScreen, HexMap (SVG + pan/zoom), GameScreen,
              # MoveModal, TechBar, PassScreen, FinishedScreen
server/       # optional WebSocket scaffold for future online multiplayer
```

Everything flows through one reducer: `const next = apply(state, action)` where an action is
build / move / research / strike / spy / endTurn. Pure + seeded RNG ⇒ identical input always yields
identical output (which is what makes the tests and a future server simple).

## Roadmap

- [x] Deterministic engine + tests
- [x] Mobile-friendly hotseat UI
- [x] Procedural hex map (land/sea/mountain) with terrain-gated unit types
- [x] Tech tree: weapons/defenses/industry, six Ages, age-gated strikes
- [x] Fog of war, spies, and a between-turns handoff screen
- [x] 10 historical heroes with unique passive abilities (player profiles)
- [x] 3 actions per turn (auto-ends) and heuristic AI opponents
- [x] AI uses combat-odds estimates, transports (amphibious/airborne), and strikes
- [ ] Online multiplayer (wire the client to `server/`)
- [ ] AI difficulty levels &amp; fog handicap
- [ ] Terrain clustering / richer map generation, more unit types
