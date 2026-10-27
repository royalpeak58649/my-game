# AGENTS.md — working on this repository

A browser grand-strategy game set from 1836, in the spirit of Victoria 3. It is built in
TypeScript with plain DOM and a canvas map, and has no framework. This file is the operating
manual for coding agents (Codex, Claude Code) and for people.

## Commands

```bash
npm install
npm run dev            # Vite dev server, http://localhost:5173
npm test               # Vitest; must pass before every commit (about 15 s)
npm run build          # tsc (strict) + vite build; must pass before every commit
npm run soak -- 520    # headless 10-year run: wars, peace, navies, tick time, world goods
npx vite-node scripts/navy-report.ts            # fleets and convoys at the start
npx vite-node scripts/scenario-invasion.ts      # Britain vs Qing over Hong Kong (naval war)
WAR=FRA,GBR,GBR_04 npx vite-node scripts/scenario-invasion.ts   # any attacker,target,goal state
docker compose up -d --build                    # production Nginx container (amd64/arm64)
```

Node 22. In dev builds the store is exposed as `window.__store`, for scripted UI checks with
Playwright: `__store.get()`, `__store.set(state)` and `__store.setUi({...})`.

## Layout

```
src/sim/            pure simulation (no DOM): every function GameState -> GameState
  tick.ts             one week = economyTick -> politicsTick -> diplomacyTick -> warTick
  types.ts, state.ts  GameState, createGameState
  aggregates.ts       countryStats(): cached per-country population / GDP (use it, don't rescan)
  economy/            pops, buildings, markets, world trade, construction, investment AI
  politics/           interest groups, laws, movements, technology, modifiers read by the economy
  diplomacy/          relations, alliances, subjects, rivals, prestige; types.ts also holds military types
  war/                armies, diplomatic plays, fronts, battles, occupation, peace
  navy/               sea zones, fleets, convoys and raiding, naval invasions
src/data/           static data; the *.json files are GENERATED (see "Data pipeline")
  economy/ politics/ diplomacy/ navy/   hand-written rules, constants and 1836 setup (.ts)
src/ui/             DOM panels + canvas map; reads GameState and calls sim commands
  i18n.ts             English/Korean/Japanese/Chinese DOM translation and language persistence
  saveGame.ts         versioned JSON save/load, validation and file download
  map/MapView.ts      projection, borders, labels, occupation stripes, naval overlay
  panels/             TopBar, SidePanel (overview/state/country/market/construction/politics/laws/tech),
                      diplomacyViews (diplomacy, war), navyViews (navy, invasion planner)
scripts/            Node data pipeline + soak/scenario tools
docs/               the rules of each system: ECONOMY, POLITICS, WAR, NAVY
```

Initialisation order, used in `src/main.ts`, the tests and the scripts:
`initMilitary(initDiplomacy(initPolitics(withStartEconomy(createGameState(states, countries, player)))))`

## Rules of the codebase

- **The simulation is pure and deterministic.**
  - Never use `Math.random()`, `Date.now()` or iteration order you have not sorted.
  - Randomness comes from `rng(seed)` in `src/sim/war/wars.ts`, seeded from ids and `tickCount`.
  - Iterate countries and states in sorted order.
  - Return new objects; never mutate the input state. Exception: functions documented as
    mutating a fresh copy, such as the economy tick's `cloneEconomy`.
- **`src/sim` never imports from `src/ui`.** The UI never mutates state; it calls command
  functions (`*/commands.ts`) through the store. A command returns the same state object when
  the order is invalid.
- **No NaN or Infinity in the state.** Guard divisions and use the local `fin()` helpers. Tests
  walk the state to check this.
- **Performance budget.** A full tick takes about 75 ms median (economy about 55 ms). The economy
  tick uses typed arrays on purpose. Do not add O(countries × states) scans per tick; use
  `countryStats` or precompute per tick. Check with `npm run soak`.
- **Tunable numbers live in data files:** `src/data/*/rules.ts`, `buildings.ts`, `goods.ts`
  and so on, not inline in the sim code.
- **Documentation is part of the change.** When you change a rule, update the matching
  `docs/*.md`. The docs are written as specifications: formulas, constants, order of steps.
- **Originality is a hard requirement.** The game is inspired by Victoria 3 but must not copy
  Paradox's UI art, icons, text, data tables or numbers. All names, numbers and visuals are our
  own. Historical facts (1836 borders, populations, alliances) are fine. Do not add assets or
  data taken from Paradox games or their wikis.
- TypeScript is strict (`exactOptionalPropertyTypes`, `noUnusedLocals` and more). Keep it
  compiling.

## Data pipeline

Generated files in `src/data/` are committed. Regenerate them in this order. Each step needs the
ones before it.

| command | output | inputs |
|---|---|---|
| `npm run data` | `world.topo.json`, `states.json`, `countries.json` | Natural Earth admin-1 (auto-downloaded to `data-raw/`), `scripts/ownership-1836.mjs` |
| `npm run data:economy` | `stateEconomy.json` (population, coastal, resources) | populated places + admin-0 (auto-downloaded), `scripts/population-1836.mjs` |
| `npm run data:adjacency` | `adjacency.json` (land borders) | `world.topo.json` |
| `npm run data:seas` | `seas.json` (sea zones, lanes, state → zone) | `data-raw/ne_10m_geography_marine_polys.geojson` (download manually, see below) |
| `npm run data:start` | `start1836.json` (calibrated 1836 economy, about 35 s) | everything above + `src/data/economy/*` |

`data-raw/` is git-ignored. The marine polygons are not auto-downloaded; get them from
`https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_geography_marine_polys.geojson`.

**Run `npm run data:start` again after any change** to buildings, goods, pops, production
methods, development levels, 1836 armies or navies, or anything that `initEconomy` seeds. The
game loads `start1836.json` instead of seeding at runtime. If you skip this, the game starts
from a stale economy.

Changing `npm run data` (map or ownership) changes state ids and invalidates everything
downstream: re-run all the steps, then check the hard-coded state ids in tests and in
`src/data/*/start1836.ts`.

Never open the large generated JSON files to read them. They are megabytes of numbers. Query
them with a short `node -e` script instead.

## Testing

- Tests sit next to the code (`*.test.ts`). They build the real 1836 world once in `beforeAll`
  (about 0.5 s).
- Add tests for every new rule: invariants (finite, bounded, deterministic) plus one behavioural
  scenario.
- For balance changes, also run `npm run soak -- 520` and compare these with the previous run:
  - wars, peaces and ownership changes;
  - navies and convoys;
  - tick time;
  - world goods: supply and demand, and the share of goods at the price floor or ceiling.

## Commits

Use small, focused commits with descriptive messages. Do larger features on a branch and merge
them with a PR. History so far: one commit per milestone design, then one per implementation
(`git log`).
