# Handover — state of the project (October 2026)

Read `AGENTS.md` first for commands, layout and rules. This page covers what exists, what is
undecided and what is known to be rough.

## Goal

1. Build a game as close as possible to Victoria 3 in how it plays, with its own UI, data and
   numbers (see "Originality" in AGENTS.md).
2. Then add the owner's own features on top. These are **not yet defined**; ask the owner before
   starting one.

## Done (milestones 1–5, all on `main`)

| # | system | spec |
|---|---|---|
| 1 | Whole-world 1836 map (1,434 states, 88 countries), map modes, pan and zoom, top bar, side panel, start screen | `ARCHITECTURE.md` |
| 2 | Economy: 10 pop types, 27 goods, buildings and production methods, national markets plus a world trade pool, construction queue, investment AI, pre-1836 calibration | `docs/ECONOMY.md` |
| 3 | Politics: 8 interest groups, clout and approval, legitimacy, laws and enactment, movements, 22 technologies that unlock buildings and methods | `docs/POLITICS.md` |
| 4 | Diplomacy and war: relations, alliances, subjects, rivals, prestige and the great-power ranking, diplomatic plays, armies and generals, land fronts, occupation, war score, exhaustion, peace | `docs/WAR.md` |
| 5 | Navy: sea zones, naval bases and ports, the convoy model from before Victoria 3's "Great Wave" update, convoy raiding, naval invasions, navy UI | `docs/NAVY.md` |

The UI also has a national strategic briefing (player chip or O) that prioritises live financial,
market, political, diplomatic and military signals and links to the relevant detailed panel.
It supports English, Korean, Japanese and Simplified Chinese from the start screen and top bar;
the browser remembers the selection. Geographic proper names remain in their source form.
Games can be saved to and loaded from versioned JSON files. Loading validates the file against
the current map and country data before replacing the running state.
Production deployment is packaged as a multi-stage Node/Nginx container that builds natively on
amd64 or ARM64; `docs/DEPLOY_ORACLE_ARM.md` covers Oracle Cloud Ampere A1 setup.

There are 107 tests, all passing. A 20-year soak run is stable: no NaN, and borders change
through AI wars.

## Not implemented (needs a design decision with the owner first)

- **Colonisation**: unclaimed land is drawn hatched and nobody can take it yet.
- **Culture and religion**: pops have no culture or religion yet.
- **Slavery**: deliberately left out until it is designed. It is a sensitive topic.
- Elections and parties, migration, pop growth beyond the basics, trade routes between specific
  countries (trade is one world pool), and events and journal entries.
- Unit-level fleets, ship types and naval technologies (the navy is abstract flotillas).

## Known rough edges

- **Tick time**: about 75 ms median per week. Fastest game speed is fine, but moving the
  simulation into a Web Worker is the planned next performance step. The sim is already pure
  and serialisable.
- **AI wars are uneven**: 0–4 wars per decade, mostly Ottoman–Egypt and Persia–Afghanistan.
  The AI only picks fights with its own rivals and rarely starts overseas wars (it needs a
  fleet 1.8× the target's).
- **Naval landings next to a big army are usually retaken quickly.** That is by design: the
  beachhead joins the normal land war. The AI only tries those landings for war goals.
- **Some sea zone names are broad**: one zone covers the Aegean and the Adriatic and is called
  "Adriatic Sea", and large ocean zones are named "… off <country>". The names are cosmetic.
  Overrides would go in `scripts/build-seas.mjs`.
- **`ARCHITECTURE.md` describes milestone 1 only.** The layout section of `AGENTS.md` is
  current.
- **The economy has a calibration bias**: about 40% of traded goods sit at the price ceiling in
  1836, mostly because of scarce industrial inputs. Rebalancing has to go through
  `npm run data:start`.
- **Construction now has 5 free base points per country and construction sectors cost 20 points.**
  This removes the zero-capacity trap for small countries, but rich AI countries expand capacity
  quickly over a decade; the current 10-year soak reaches roughly 329 points for Britain and 445
  for the United States.

## Where to start

- To learn the code, run `npm run dev`, play as the United Kingdom and move the map with WASD.
  Open panels with O briefing, P politics, L laws, T technology, Shift+D diplomacy, Shift+W war,
  N navy and M map mode.
- Then read `src/sim/tick.ts` and one system's doc alongside its code. `navy/` is the smallest
  complete system.
- To check a change end to end, use `npm run soak` and `scripts/scenario-invasion.ts`.
