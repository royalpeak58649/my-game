# Diplomacy and war — milestone 4 specification

No navy: armies only fight across **land borders** (`src/data/adjacency.json`, symmetric
`{ stateId: neighbourIds[] }`). Everything is deterministic: randomness comes from
`rng(seed)` = mulberry32 over `nameHash(seed)` (see `src/data/diplomacy/names.ts`), seeded with
war id, front id and tick. Constants live in `src/data/diplomacy/rules.ts`; 1836 data in
`src/data/diplomacy/start1836.ts`; types in `src/sim/diplomacy/types.ts`; `pairKey` in
`src/sim/diplomacy/pair.ts`.

Tick order (`src/sim/tick.ts`): `economyTick → politicsTick → diplomacyTick → warTick`.
Init order (`src/main.ts`, scripts): `withStartEconomy → initPolitics → initDiplomacy → initMilitary`.

A country "exists" if it owns at least one state in `state.economy.states`. Only existing
countries take part in anything below.

## Armies (part of `warTick`, module `src/sim/war/`)

Soldiers are a pop type employed by the **barracks** building (government-owned, 1 level =
1 battalion = `BATTALION_SIZE` soldiers, consumes small arms). Each week, per country:
- `battalions = Σ barracks.employed.soldiers / BATTALION_SIZE` over its states, `× MOBILIZATION_MULT`
  when `mobilized` (conscripts; the economy already doubles small-arms use and charges
  `MOBILIZED_UPKEEP` per battalion).
- `equipment = max(0.3, market.buyFill.small_arms)` of the country's market.
- `quality = equipment × (modifiers.armyQualityMult ?? 1)`; `strength = battalions × quality`.
- Generals: at init and whenever `generals.length < clamp(round(battalions / 60), 1, 6)`, add one:
  `id = "${tag}-${n}"`, `name = generalName(id)`, `skill = generalSkill(id)`, `trait = generalTrait(id)`.

## Diplomacy (`diplomacyTick`, module `src/sim/diplomacy/`)

### Init — `initDiplomacy(state)`
- `alliances` from `START_ALLIANCES`, `subjects` from `START_SUBJECTS`, rivals from `START_RIVALRIES`
  (only between existing countries).
- Relations: allies +60, subject–overlord +50, one-way rival −50 (mutual −60), else absent (0).
- Per country: `improving = []`, `prestigeBonus = 0`; then run the weekly steps 3–4 once.

### Weekly
1. **Relations**: for every pair with a stored value or an improvement: if A improves B (or B
   improves A) add `IMPROVE_PER_WEEK` per improver; then drift by `RELATION_DRIFT` towards the
   baseline (+`ALLY_BASELINE` for allies or subject–overlord, `RIVAL_BASELINE` if either is the
   other's rival, −50 if at war, else 0). Clamp to ±100; delete values that reach exactly 0.
2. **Truces**: decrement; delete at 0.
3. **Influence**: `influence = INFLUENCE_BASE + floor(pop / 10M) × INFLUENCE_PER_10M + (great power ? GREAT_POWER_INFLUENCE : 0)`;
   `influenceUsed = #alliances + #improving`. If used > influence, drop the last entries of `improving`.
4. **Prestige**: `prestigeBonus *= 0.99`; `prestige = gdp/PRESTIGE_GDP_DIV + battalions × PRESTIGE_PER_BATTALION + #techs × PRESTIGE_PER_TECH + prestigeBonus`
   (gdp from `src/sim/economy/queries.ts`, battalions from `state.military.armies`). `ranking` = existing
   tags by prestige desc (ties by tag). Great powers = first `GREAT_POWER_COUNT`.
5. **AI** (not `state.player`), each country every 26 weeks on `(tickCount + tagParity) % 26 === 0`
   where tagParity = Σ char codes % 26:
   - drop alliances with relations < 0 or with a rival;
   - great powers with no rival pick the great power they border (land) with the lowest relations,
     else the lowest-relations great power;
   - propose an alliance to the highest-relations country with relations ≥ `ALLIANCE_MIN_RELATIONS`
     that shares a rival or borders it, if both have influence left and it accepts (rule below);
   - fill free influence with improvements towards: allies below 60, then neighbours that are
     not rivals, ordered by prestige desc.

### Commands — `src/sim/diplomacy/commands.ts` (pure; same state if invalid)
- `setImproving(state, tag, target, on)` — needs free influence to turn on; not towards rivals.
- `proposeAlliance(state, tag, target)` — accepted if `allianceAcceptance(...).accepts`.
- `breakAlliance(state, tag, target)` — relations −20.
- `setRival(state, tag, target, on)` — at most 3 rivals; turning on breaks an alliance with them.

### Queries — `src/sim/diplomacy/queries.ts`
`relationsOf(state, a, b)`, `alliesOf(state, tag)`, `subjectsOf(state, tag)`, `overlordOf(state, tag)`,
`isGreatPower(state, tag)`, `rankOf(state, tag)` (1-based), `existingCountries(state)`,
`borders(state, a, b)` (any adjacency between their states), `neighboursOf(state, tag)`,
`allianceAcceptance(state, from, to)` → `{ accepts: boolean; reasons: string[] }`
(rules: relations ≥ `ALLIANCE_MIN_RELATIONS`, not rivals either way, not at war with each other,
both have free influence, `to` is not the subject of a third country).

## Diplomatic plays (part of `warTick`, `src/sim/war/plays.ts`)

`startPlay(state, tag, target, goals)` — valid if both exist, differ, are not allied, neither is
the other's subject or overlord, no truce or war between them, `tag` is not a subject, 1–3 goals
from `possibleWarGoals(state, tag, target)`, and neither is already in a play. Creates a play with
`weeksLeft = PLAY_WEEKS`.

`possibleWarGoals(state, tag, target)`: `humiliate`; `make_subject` (if target is not a great power
and not already anyone's subject); `conquer_state` for each state of the target adjacent to a state
of `tag` (land) — all with `holder = tag`, `target = target`.

Weekly, per play:
1. **Joining** (countries that are not leaders, not already on a side, not the player):
   subjects join their overlord's side; overlords join the side opposing anyone attacking their subject;
   allies of exactly one leader join that leader; a great power that is a rival of one leader and has
   relations ≥ 20 with the other joins the other.
   The player joins only via `joinPlay(state, tag, playId, side)`.
2. `weeksLeft -= 1`. At 0 resolve:
   - side strength = Σ army strength of leader + supporters (unmobilised).
   - if the target is AI and target side < `BACK_DOWN_RATIO` × initiator side → target backs down:
     goals are enforced at once (see Peace), truce, initiator `prestigeBonus += PRESTIGE_WAR_WIN / 2`;
   - else if the initiator is AI and initiator side < 0.8 × target side → initiator backs down:
     `prestigeBonus −= 10`, truce;
   - else **war** (`startWar`): attackers = initiator + its supporters, defenders = target + its
     supporters, goals from the play; every participant is mobilised.
- `backDown(state, tag, playId)` — leader only, same effects as above for that side.

AI plays: an AI country not in a play or war, on `(tickCount + tagParity) % AI_PLAY_INTERVAL === 0`
and `rng(tag + tickCount) < 0.3`, looks at neighbours it can start a play against; it picks the
weakest whose side (target + allies + overlord) strength × `AI_PLAY_STRENGTH_RATIO` < its own side
(itself + subjects), preferring rivals and relations < −20; goal: `conquer_state` of the most
populous adjacent state of the target (if the target is decentralised land it is skipped).

## Wars (`src/sim/war/`)

`War` (types.ts). Control of a state: `occupation[stateId] ?? state.states[stateId].owner`.
A side "holds" a state if its controller is on that side.

Weekly, per war (wars in id order):
1. **Fronts**: for each attacker `a` and defender `d`, a front `a|d` exists if a state controlled by
   `a` is land-adjacent to a state controlled by `d`. Contact states of the front = states controlled
   by `d` adjacent to `a`-controlled states (and vice versa for `d`'s view).
2. **Allocation**: each country splits its battalions over all its fronts in all wars proportionally
   to contact-state count (no fronts → 0 committed). Each front's general = the country's best
   unassigned general (by skill), else null.
3. **Battle** per front: `S = committed × quality × (1 + GENERAL_SKILL_BONUS × skill)`; the side on its own
   soil (the defending front side when the contested state is its own or an ally's) gets
   `× DEFENDER_BONUS`. The stronger side (by S) attacks; skip if both 0. If the defending side has 0
   battalions, the attacker takes a contact state without a battle every other week.
   Otherwise `p = S_att² / (S_att² + S_def²)`; win if `rng("${war.id}:${front.id}:${tick}") < p`.
   Loser loses `LOSER_CASUALTIES`, winner `WINNER_CASUALTIES` of committed battalions. On an attacker
   win, it first liberates its own side's occupied state adjacent to its control, else occupies the
   least populous contact state. Log the battle (keep 12).
4. **Casualties** remove soldiers: `losses × BATTALION_SIZE` taken from the country's states' barracks
   (`employed.soldiers` and `pops.soldiers`, proportionally; never below 0). Barracks re-hire normally.
5. **War score** = (Σ population of defender-owned states occupied by attackers / defenders' total
   population − the same for attackers) × 100, clamped ±100.
6. **Exhaustion** per side += `EXHAUSTION_BASE + EXHAUSTION_PER_LOSS × (losses / side battalions × 100) +
   EXHAUSTION_PER_OCCUPIED × (occupied own population %)`; clamp 0..100.
7. **Peace**: defenders ≥ `CAPITULATION_EXHAUSTION` → defenders capitulate → enforce all goals;
   attackers ≥ it → attackers capitulate → no goals, attacker leader `prestigeBonus −= 10`;
   both, or war older than `MAX_WAR_WEEKS` → white peace. `capitulate(state, tag, warId)` (leader) and
   `offerWhitePeace(state, tag, warId)` (accepted by an AI leader whose exhaustion ≥ 50 or whose
   war score ≤ 0 from its own side's view) end it too.

**Enforcing goals** (peace or back-down): `conquer_state` — if `target` still owns it, set
`state.states[id].owner = holder`, increment `state.ownershipVersion`, drop queue items for that state
from the old owner's construction queue; `make_subject` — `subjects[target] = holder` (and remove the
target's alliances); `humiliate` — holder `prestigeBonus += PRESTIGE_WAR_WIN / 2`, target `−= that`.
After any peace: winner leader `prestigeBonus += PRESTIGE_WAR_WIN`, clear occupation, truces for all
attacker–defender pairs (`TRUCE_WEEKS`), and AI participants not in another war demobilise.

### Commands — `src/sim/war/commands.ts`
`startPlay`, `backDown`, `joinPlay`, `setMobilized(state, tag, on)`, `capitulate`, `offerWhitePeace`.

### Queries — `src/sim/war/queries.ts`
`armyOf(state, tag)`, `armyStrength(state, tag)`, `possibleWarGoals(state, tag, target)`,
`playsOf(state, tag)`, `warsOf(state, tag)`, `isAtWar(state, a, b)`, `sideOf(war, tag)`,
`controllerOf(state, stateId)` (across all wars), `playSideStrength(state, play, side)`.
