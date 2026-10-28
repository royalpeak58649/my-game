# 1836

> Working on the code? Start with [AGENTS.md](AGENTS.md) (commands, layout, rules) and
> [docs/HANDOVER.md](docs/HANDOVER.md) (current state, open questions).

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

## Deployment

The repository includes an ARM64-compatible multi-stage Docker build and Nginx configuration.
For an Oracle Cloud Ampere A1 Always Free instance, follow
[docs/DEPLOY_ORACLE_ARM.md](docs/DEPLOY_ORACLE_ARM.md).

## Controls

| Input | Action |
| --- | --- |
| Drag / wheel | Pan / zoom the map |
| W / A / S / D | Pan the map |
| Left-click a state | Open its details and construction controls |
| Space | Pause / resume |
| 1 – 5 | Game speed |
| M | Cycle map mode (political / diplomacy / population / states) |
| O | Open the national strategic briefing |
| P / L / T | Politics / Laws / Technology |
| Shift+D / Shift+W | Diplomacy / War |
| Esc | Close panel |

The language selector on the start screen and top bar supports English, Korean, Japanese and
Simplified Chinese. The selected language is saved in the browser. Historical country and state
names remain in their source form.

The left navigation rail mirrors the panel shortcuts, so the strategic briefing, politics, laws,
technology, diplomacy, war, navy and map modes can all be opened with one click.

Use Load Game on the start screen, or Save and Load in the top bar, to exchange versioned JSON
save files. Loading pauses the simulation and restores the player, date, economy, politics,
diplomacy, military and current borders.

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

## Milestone 4: diplomacy and war

Relations, defensive alliances, rivals and subjects (starting from the 1836 pacts); prestige and
the great-power ranking; diplomatic plays where third parties take sides before the target yields
or war breaks out; armies of soldiers in barracks, generals and mobilisation; land fronts, weekly
battles, occupation, war exhaustion and peace terms that move borders. See [docs/WAR.md](docs/WAR.md).

## Milestone 5: navy

Sea zones and sea lanes generated from the coastlines (no canals in 1836, Arctic iced over);
naval bases raise flotillas and admirals; ports produce convoys that overseas states, sea trade
and armies abroad use up (the classic convoy model, before transport ships became units); fleets
split between raiding enemy convoys and escorting their own; naval invasions sail, fight the enemy
fleet and land against the garrison to open a front overseas. The navy panel (N), an invasion
planner in the war panel and fleet / route markers on the map. See [docs/NAVY.md](docs/NAVY.md).

## Strategic briefing

Click the player country in the top bar or press O to open a national overview. It combines
finances, markets, politics, research, diplomacy and military logistics into prioritised signals,
with direct links to the detailed panel for each issue.

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
