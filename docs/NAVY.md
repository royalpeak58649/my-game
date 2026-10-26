# Navy, convoys and naval invasions — milestone 5

Navies follow the **pre-"Great Wave" convoy model** of the genre: ports produce an abstract
pool of **convoys**. Overseas states, sea trade and armies overseas use convoys up, and enemy
fleets **raid** them. There are no individual transport ships. Fleets escort **naval invasions**
that land an army on an enemy coast, which opens an ordinary land front.

Constants live in `src/data/navy/rules.ts`; types in `src/sim/diplomacy/types.ts` (`Navy`,
`Invasion`, `MilitaryState.navies / invasions`); code in `src/sim/navy/`.

## Sea zones (`src/data/seas.json`, `npm run data:seas`)

`scripts/build-seas.mjs` builds about 90 sea zones:

1. It rasterises land at 0.5°. Narrow straits that the grid would close are carved open:
   Gibraltar, the Turkish Straits, the Danish straits, Kerch, Messina, Bab-el-Mandeb, Hormuz,
   Malacca, Juan de Fuca and Kanmon.
   Pack ice closes everything north of 72°N and south of 66°S, so there is no Northwest or
   Northeast Passage.
2. Seeds come from k-means over the shore points of coastal states. A small enclosed sea, such as
   the Caspian or an ice-locked gulf, gets a single zone.
3. Every water cell goes to the nearest seed by distance through water. Zones therefore never
   connect across land: there is no Suez or Panama canal in 1836, and London to Hong Kong
   (about 25,000 km) goes round the Cape.
4. Zones are neighbours where their water touches. A lane's length is the great-circle distance
   between the zone anchors.
5. Each zone is named after the Natural Earth marine polygon that most of its coast lies in.
   Duplicate names get "off <country>".

`stateZone` maps each coastal state to the zone it opens onto. `seaPath(from[], to)` is a
Dijkstra search over the lanes.

## Buildings

| building | where | per level | inputs |
|---|---|---|---|
| Naval Base | coastal states only | 1 flotilla = 500 sailors (soldier pops) | 0.8 wood |
| Port | coastal states only | `CONVOYS_PER_PORT` = 20 convoys | 1 wood; employs 1,500 laborers |

`BuildingDef.coastal` caps both buildings at 0 levels inland, through `buildingCap` (UI and
commands) and through the investment AI's `room`.

**1836:**
- Naval bases follow `START_NAVIES`, placed in each country's 3 most populous coastal states.
  The Royal Navy has 70 flotillas, France 35, Russia 25 and so on. An unlisted coastal country
  with more than 1M people gets 1.
- Ports are sized after the warm-up in `scripts/build-start.ts` (`seedPorts`) to 115% of each
  country's convoy needs.

**AI upkeep** (`investment.ts`):
- It keeps naval bases at the 1836 size scaled by population growth, ×1.25 at war.
- It queues a port whenever available convoys fall below 105% of needs.

## Weekly navy step (`navyStep`, in `warTick` after the armies)

Per country:

- `flotillas = Σ naval_base.employed.soldiers / 500`.
- `quality = max(0.4, sailor-weighted inputFill)`.
- Admirals: `clamp(round(flotillas / 20), 1, 4)` when the country has at least one flotilla.
  They are made like generals; the id is `${tag}-adm-${n}`.
- **Convoy capacity** = Σ port levels × 20 × staffing.
- **Overseas states** are states not land-connected to the capital through the country's own
  states. Each needs `0.5 + 0.25 × (km from the capital / 1000)` convoys.
- **Sea trade**: coastal countries need `Σ (exports + imports) × price / 2500` convoys.
- `convoysLost` (sunk) is repaired at 5% per week.
- `supply = min(1, (capacity − lost) / need)`.

`raidShare` is the share of the fleet sent raiding in wartime; the rest escorts and defends.
- The player sets it in the navy panel.
- The AI uses 0 at peace, 0.4 when its fleet is at least as strong as its enemies', and 0.7
  when weaker (guerre de course).

**Raiding.** For every country at war:
1. Its raiding strength = flotillas × raidShare × quality × (1 + 0.08 × best admiral skill).
2. That strength is split over its enemies by their convoy capacity.
3. Against one enemy: `effect = raid / (raid + 2 × escort)`, where escort is the enemy's
   non-raiding fleet strength.
4. Sunk convoys = `raid × 0.3 × effect`.
5. Raiders lose `1% × (1 − effect)` of their flotillas. The loss comes out of the naval bases'
   sailors, which are re-hired over time.

## Effects of a convoy shortfall

- **Trade:** a coastal country with sea trade has its world-trade share multiplied by
  `0.3 + 0.7 × supply` (economy tick). Imports and exports shrink, so the trade need also falls.
- **Armies overseas:** on a front where none of the country's contact states is land-connected
  to its capital, its strength is multiplied by `0.4 + 0.6 × supply`. Landings use the same
  factor.
- **Blockade exhaustion:** each side's leader adds `0.3 × lost / capacity` war exhaustion per
  week.

## Naval invasions (`src/sim/navy/invasions.ts`)

`launchInvasion(state, tag, warId, stateId, battalions)` is valid when all of these hold:
- the target is a coastal state held by the enemy side in that war;
- the country has at least one flotilla and a coastal state it controls;
- there is a sea path;
- the country has no other invasion at sea in that war.

The battalions are taken out of the land war while at sea.
- **Voyage:** `1 + ceil(path km / 3000)` weeks from the nearest home zone.
- **Recall:** the troops can be recalled while at sea. Ending the war brings them home.

**On arrival** (`invasionStep`, before the land war):

1. **Naval battle**, if the enemy side has a fleet.
   - Escort = the invader's non-raiding fleet strength.
   - Enemy = the holder's non-raiding fleet plus 50% of its co-belligerents'.
   - The invader wins with probability `p = E² / (E² + D²)`.
   - The loser loses 15% of its committed flotillas. The winner loses 5%, scaled down by the
     strength ratio.
   - If the escort loses, 25% of the troops are lost and the invasion ends.
2. **Landing** against the garrison.
   - Garrison battalions = `max(2, army × min(0.25, 1.5 × the state's share of the holder's
     population))`, × quality, × `DEFENDER_BONUS` on its own soil.
   - Landing strength = battalions × quality × 0.7 × overseas supply.
   - The landing succeeds with the same `p` formula.
   - **Success:** the state is occupied (or liberated, if it is ours) and the landing force loses
     5%.
   - **Failure:** the landing force loses 20%.
3. A beachhead taken this week is neither counter-attacked nor liberated until the next week.
   After that the normal fronts take over: the new state borders the enemy, so a front appears
   and the battalions return to the country's pool.

Battles are recorded in `War.battles` with `kind: 'naval' | 'landing'` and `front` set to the
sea zone id. A war stays alive while it has land fronts or invasions at sea:
`War.lastFightTick` replaces the war's age in the no-front white-peace rule (`NO_FRONT_WEEKS`).

**War goals.** With at least one flotilla, `possibleWarGoals` also offers every coastal state of
the target the fleet can reach. The AI asks for an overseas state only when it has no border with
the target and its escort is more than 1.8× the target's.

**AI invasions** (every 4 weeks):

An AI country at war considers an invasion when all of these hold:
- it has at least 3 flotillas;
- it has no troops at sea;
- it made no landing in the last 13 weeks;
- it has no land front in that war, or holds a war goal that no state of its own borders.

If so, it sends 35% of its free battalions to the first target that meets all of these:
- its escort is at least 1.2× the enemy fleet;
- its landing force is at least 1.3× the garrison;
- the target is a war goal, an island, or a place where its free army is at least 60% of the
  holder's army.

Targets are tried in this order: war goals, then the enemy leader's states, then the nearest.

## Tick order

`warTick = aiPlays ∘ aiInvasions ∘ warStep ∘ invasionStep ∘ playStep ∘ navyStep ∘ armyStep`

## UI

- **Navy panel** (`N`, or the ⚓ pill in the top bar). It shows:
  - flotillas, readiness and admirals;
  - the raid/escort slider;
  - convoy capacity, losses, needs and supply;
  - naval bases and ports by state.
- **War panel:** troops at sea (with Recall) and an invasion planner. The planner lists targets
  with voyage time, fleet balance and garrison, and lets you send 25, 50 or 75% of your free
  battalions. Naval battles (⚓) and landings appear in the battle list.
- **Map:**
  - fleet badges (⚓ flotillas) at the home waters of the player and belligerents (else the 8
    largest navies);
  - dashed invasion routes with the troop convoy's position;
  - ⚔ / ⚑ markers for naval battles and landings of the last four weeks.
