# 1836

An original grand-strategy game set in 1836: guide a nation through economy, politics,
diplomacy and war on a map of the whole world. Built from scratch with open geographic
data; no assets, UI designs or data from any commercial game are used.

## Setup

```bash
npm install
npm run dev     # start the dev server (http://localhost:5173)
npm test        # unit tests
npm run build   # type-check and build for production
npm run data          # rebuild map data (downloads Natural Earth ~40 MB into data-raw/)
npm run data:economy  # 1836 population and resources per state
npm run data:start    # calibrated 1836 start economy (run after changing economy data)
```

## Controls

| Input | Action |
| --- | --- |
| Drag / wheel | Pan / zoom the map |
| Click a state | Open its panel |
| Space | Pause / resume |
| 1 – 5 | Game speed |
| M | Cycle map mode (political / population / states) |
| P / L / T | Politics / Laws / Technology |
| Esc | Close panel |

## What exists (milestone 1)

- Whole-world map: 1,434 states derived from Natural Earth admin-1 boundaries, 88 countries.
- Approximate political map of 1 January 1836 (see below).
- Start screen (pick a country or observe), top bar with date and speed, state and
  country panels, tooltip, country labels.
- Deterministic weekly simulation tick (`src/sim`), JSON-serializable game state.

## Milestone 2: economy

Pops by profession, buildings with production methods, a market per country linked by world
trade, wages/profits/taxes, construction, and an investment AI for the other countries. The top
bar shows your treasury and opens the Market and Construction views; clicking a state shows its
pops and buildings and lets you queue construction. See [docs/ECONOMY.md](docs/ECONOMY.md).

## Milestone 3: politics

Eight interest groups whose clout follows your franchise law and pops; a government you choose
and the legitimacy it gives you; eight law groups (governance, franchise, church, trade, labour,
taxation, education, press) that act on the economy; movements of angry groups; and a technology
tree that unlocks buildings, production methods and laws. The top bar shows legitimacy and
research. See [docs/POLITICS.md](docs/POLITICS.md).

## The 1836 map is approximate

States are built from modern first-level administrative units, so historical borders
that cut through a modern province are rounded to whichever owner held most of it.
Known simplifications include: Baden is merged into Württemberg and the smaller German
states into their larger neighbours; princely India is reduced to a handful of major
states; Texas is still part of Mexico (the revolution is under way on the start date);
the Oregon Country is unclaimed. Owners are defined in `scripts/ownership-1836.mjs`.

## Map data

Boundaries: [Natural Earth](https://www.naturalearthdata.com/) admin-1 states and
provinces, 1:10m (public domain). Processed by `scripts/build-map.mjs` into
`src/data/` (committed, so the pipeline only needs to run when the map changes).
