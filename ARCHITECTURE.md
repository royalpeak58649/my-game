# Architecture

```
scripts/          data pipeline (Node): Natural Earth -> game map data
  build-map.mjs     merges admin-1 units into states, assigns 1836 owners, simplifies
  ownership-1836.mjs  hand-authored 1836 owners, countries, capitals, colors
src/data/         generated, committed static data
  world.topo.json   TopoJSON, object "states", geometry id = state id
  states.json       [{ id, name, owner, adm0, area, centroid }]
  countries.json    { TAG: { tag, name, color, capital } }
src/sim/          pure simulation — no DOM, deterministic, serializable
  types.ts          GameState and definitions
  state.ts          createGameState()
  tick.ts           tick(): advances one week
  queries.ts        read helpers
src/ui/           rendering and interaction
  store.ts          observable GameState + UI state
  clock.ts          drives tick() at the selected speed
  map/MapView.ts    canvas map: projection, pan/zoom, hit testing, borders, labels
  panels/           top bar, side panel
  StartScreen.ts, Tooltip.ts, keyboard.ts
src/main.ts       wires data, store, map and panels together
```

## Rules

- `src/sim` never imports from `src/ui` or touches the DOM. Every system is a pure
  function of `GameState`, so the game can be tested headlessly, saved as JSON and,
  later, run in a worker thread.
- The UI only reads `GameState` and calls sim functions; it never mutates state in place.
- Static definitions (map, countries, later goods/buildings/laws) live in `src/data` as
  JSON; mutable per-game values live in `GameState`.

## How upcoming systems plug in

Each system adds its data to `GameState`, a step to `tick()`, and its panels to `src/ui`.

1. **Economy** — pops per state (culture, religion, profession, wealth), buildings with
   production methods, goods and a market with supply/demand pricing, construction queue.
2. **Politics** — interest groups, legitimacy, laws, political movements, technology.
3. **Diplomacy & war** — relations, diplomatic plays, fronts, generals, mobilization
   (no navy).
4. **AI** for non-player countries.
