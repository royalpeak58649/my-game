# Economy — milestone 2 specification

Everything here is deterministic (no randomness in the tick) and lives in `src/sim/economy/`.
Static definitions are in `src/data/economy/` and `src/data/stateEconomy.json`; the dynamic state
is `GameState.economy: EconomyState` (see `src/sim/economy/types.ts`). Amounts are per week.

## Concepts

- **Pops**: each owned state has a population split by pop type (`pops[type]`, persons).
  Peasants are everyone not working in a building.
- **Buildings**: per state, keyed by building id, with a `level` and one active production
  method. One level offers the method's `employment` jobs and, when fully staffed and supplied,
  consumes `inputs` and produces `outputs` (or `construction` points).
- **Markets**: one per country (`markets[tag]`). All buildings and pops in the country's states
  buy and sell there. Decentralized (ownerless) states have no economy at all.
- **Money**: buildings earn revenue, pay for inputs and wages; profit goes to the owner pop type
  (aristocrats / capitalists) in the same state; government buildings are paid by the treasury.
  Pops pay income tax and spend the rest on their needs basket.

## Initialisation — `initEconomy(state: GameState): GameState`

For every state with an owner, using `stateEconomy.json` (population, resources, urbanCap,
coastal) and the owner's `DEVELOPMENT` (or `DEFAULT_DEVELOPMENT`):

1. `employed = population × employment`.
2. Split `employed` into sectors: `industry` share → industry; 6% extraction; 6% urban;
   the remainder agriculture.
3. Buildings (all levels integers ≥ 0; skip levels of 0):
   - **Capital state only**: `administration` levels = max(1, round(countryPop / 2.5M));
     `construction_sector` levels = max(1, round(countryPop × employment / 400k)).
   - **Agriculture**: plantations first — for each crop resource r present, level =
     min(resource[r], round(agri × 0.15 / 3800)); remaining agricultural workers / 3600 → farm
     levels; 75% of those as `farm`, 25% as `ranch`; farm + ranch ≤ resources.arable.
   - **Extraction**: workers split evenly over `logging_camp` (wood), `fishing_wharf` (fish),
     `coal_mine` (coal), `iron_mine` (iron) among those the state has; each level = workers / 3600
     capped by the resource.
   - **Industry**: industry workers / 3000 = total factory levels, distributed by weight
     textile_mill 3, food_industry 3, garment_works 2, furniture_workshop 2, tool_workshop 1.5,
     paper_mill 1, glassworks 1, steel_mill 0.5, arms_workshop 0.5 (largest-remainder rounding).
   - **Urban**: `urban_center` levels = min(urbanCap, round(urban / 3000)).
   - Every building starts with its first production method.
4. Pops: create exactly the pops needed to fill all jobs (`employed` = full jobs). If total jobs
   exceed 90% of the population, scale all levels down proportionally first. Everyone else is
   `peasants`. `income` and `sol` start from step 7 of a dry run or simply 0 / 10.
5. Markets: `prices[g] = basePrice`, supply/demand 0, `buyFill = sellFill = 1`.
6. Countries: `treasury = countryPop × TREASURY_PER_CAPITA`, `incomeTaxRate = DEFAULT_INCOME_TAX`,
   empty queue.

## Weekly tick — `economyTick(state: GameState): GameState`

Called from `tick()` after the date advances. Order matters; each step uses values from the
steps before it and last week's stored values where noted.

1. **Employment** (per building): `jobs[t] = level × employment[t]`.
   - If `lastProfit < 0` (and the building is not government-owned), fire 5% of every employed
     type (rounded down), returning them to peasants.
   - Otherwise hire into open jobs: `hire = min(open[t], ceil(open[t] × hireRate[t]), peasants)`,
     moving people from peasants to type t. Owners (aristocrats, capitalists) are hired the same way.
   - `staffing = Σ employed / Σ jobs` (0 if no jobs).
2. **Production** (per building): `inputNeed[g] = level × inputs[g] × staffing`. Output and
   construction scale with `staffing × inputFill`, where `inputFill` is the minimum over the
   building's inputs of the market's **last week** `buyFill[g]` (1 if no inputs).
3. **Pop demand** (per state, per pop type, using last week's `income` and current prices):
   `basketCost = Σ NEEDS[tier][g] × price[g]`, `scale = min(MAX_CONSUMPTION_SCALE, income / basketCost)`,
   `demand[g] += pops[t] × NEEDS[tier][g] × scale`.
4. **Market clearing** (per country): `supply[g] = Σ outputs`, `demand[g] = Σ inputNeed + pop demand`.
   `buyFill = D > 0 ? min(1, S / D) : 1`; `sellFill = S > 0 ? min(1, D / S) : 1`.
   New price: `target = base × clamp(1 + PRICE_ELASTICITY × (D − S) / max(D, S, 1), MIN, MAX)`,
   `price += (target − price) × PRICE_SMOOTHING`, then clamp to `[MIN, MAX] × base`.
5. **Money** (per building, with the new prices and fills):
   `revenue = Σ outputs[g] × sellFill[g] × price[g]`;
   `inputCost = Σ inputNeed[g] × buyFill[g] × price[g]`;
   `wages = Σ employed[t] × baseWage[t]`;
   `profit = revenue − inputCost − wages`. Store `lastRevenue`, `lastCosts`, `lastProfit`, `inputFill`.
   - Owner buildings: wages go to the employed pops of the state; **positive** profit goes to the
     state's owner pop type (`aristocrats` or `capitalists`). A building running at a loss pays
     only what it earns: wages are cut pro rata to `max(0, revenue − inputCost)` so no money is
     created; `lastProfit` still uses the full wage bill, so it keeps firing until profitable.
   - Government buildings: revenue is 0; `inputCost + wages` is paid from the treasury.
6. **Pop income** (per state, per type): `gross = (wages + dividends) / pops[t]` for employed types;
   peasants get `subsistenceIncome`. Tax: `tax = gross × incomeTaxRate` (not on peasants);
   `income[t] = gross − tax`; tax goes to the treasury. `sol[t] = standardOfLiving(scale)` using
   this week's income and prices.
7. **Government**: `lastIncome = Σ tax`, `lastExpenses = Σ government building costs`,
   `treasury += lastIncome − lastExpenses`. If the treasury is negative, government buildings run at
   50% staffing the next week (fire down to half) until it is positive again.
8. **Construction**: `constructionPoints = Σ construction output`. Walk the queue in order; each
   item takes up to `MAX_POINTS_PER_PROJECT` until points run out. When `progress ≥ cost`, add one
   level (with the default method) and remove the item.
9. **Population growth** (per state): `peasants += pops_total × yearlyGrowth(avg sol) / 52`
   (rounded), so new people enter as peasants.

## Commands — `src/sim/economy/commands.ts`

Pure functions returning a new GameState (or the same one if invalid):

- `queueConstruction(state, tag, stateId, buildingId)` — valid if the state is owned by `tag` and
  the building's cap (resource / urbanCap; farm + ranch share `arable`) is not reached counting
  levels already queued.
- `cancelConstruction(state, tag, index)`
- `setProductionMethod(state, stateId, buildingId, methodId)`
- `setIncomeTax(state, tag, rate)` — clamp to [0, 0.5].

## Queries — `src/sim/economy/queries.ts` (used by the UI)

- `stateEconomy(state, stateId): StateEconomy | undefined`
- `marketOf(state, tag): Market | undefined`
- `countryEconomy(state, tag): CountryEconomy | undefined`
- `totalPopulation(state, stateId): number`, `countryPopulation(state, tag): number`
- `buildingJobs(def, inst): number`, `buildingStaffing(inst, def): number`
- `buildingCap(state, stateId, buildingId): number | null` (null = uncapped)
- `buildableBuildings(state, tag, stateId): { def: BuildingDef; current: number; queued: number; cap: number | null }[]`
- `gdp(state, tag): number` — Σ revenue of owner buildings last week.

## Performance

`economyTick` must run in well under 30 ms for the whole world (≈1,400 states, ≈10k
building instances). Avoid per-tick allocations of large intermediate maps where simple loops do.
