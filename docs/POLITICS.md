# Politics — milestone 3 specification

Deterministic, pure, in `src/sim/politics/`. Static data in `src/data/politics/`
(`igs.ts`, `laws.ts`, `techs.ts`, `start1836.ts`); dynamic state is
`GameState.politics: PoliticsState` (types in `src/sim/politics/types.ts`).
`politicsTick` runs every week **after** `economyTick` (see `src/sim/tick.ts`).
The economy reads `CountryPolitics.modifiers` and tech unlocks (see "Economy hooks").

## Concepts

- **Interest groups (IGs)** — eight per country. Every pop type's political strength is split
  between IGs by `POP_AFFINITY` (rows sum to 1).
- **Clout** — an IG's share of the country's political strength (0..1, sums to 1).
- **Approval** — −10..+10. ≥ +5 is *content*, ≤ −5 is *angry*.
- **Government** — the IGs the ruler governs with. **Legitimacy** (0..100) is mostly the clout of
  the government.
- **Laws** — one law per law group is in force. Changing one is an *enactment* that takes time.
- **Movements** — angry, influential IGs organise around a law they demand; radicalism grows.
- **Technology** — research points accumulate towards one tech at a time; techs unlock laws,
  buildings and production methods and grant modifiers.

Stance of IG `i` to law `l`: `stance(i, l) = STANCES[i][l] ?? 0` (−2..+2).

## Initialisation — `initPolitics(state: GameState): GameState`

For every country that owns at least one state in `state.economy.states`:
- `laws` = `DEFAULT_LAWS` overridden by `START_LAWS[tag]`; `techs` = `START_TECHS[tag] ?? []`.
- Run steps 0–1 below, set each IG's `approval` directly to its target (step 2, no smoothing),
  choose the government with the AI rule (step 8a), compute legitimacy (step 3).
- `enacting = null`, `movements = []`, `researchProgress = 0`, `researching` = AI pick (step 8b)
  for every country (the player may change it).

## Weekly tick — `politicsTick(state: GameState): GameState`

Per country, in this order:

0. **Modifiers** from current laws, known techs and last week's movements. Multiplicative
   fields (`researchMult, taxEfficiency, upkeepMult, hireRateMult, wageMult, outputMult,
   industryOutputMult, radicalismMult`) multiply; `legitimacyAdd` and `tradeShareAdd` add;
   `tradeShare` comes from the trade law, then `tradeShare = clamp(tradeShare + tradeShareAdd, 0, 0.9)`
   and `tradeShareAdd` is dropped from the result. **Unrest**: if any movement has
   radicalism ≥ 100, `outputMult *= 0.9`.
1. **Clout**: `strength[i] = Σ_states Σ_popTypes pops × tierWeights[tier(pop)] × POP_AFFINITY[pop][i]`
   (tier weights from the current franchise law), then `× igCloutMult[i]` of the governance law;
   `clout = strength / Σ strength` (all 0 if Σ = 0).
2. **Approval target** (then `approval += (target − approval) × 0.1`):
   - laws: `0.75 × Σ_groups stance(i, currentLaw)`, clamped to ±6;
   - government: +2 if in government; −1 if not and clout ≥ 0.15;
   - living standards: members' standard of living (pops weighted by count × affinity) →
     `clamp((sol − 15) / 2.5, −3, 3)`;
   - taxes: for landowners, industrialists and merchants, `−(incomeTaxRate − 0.15) × 20` when the
     rate exceeds 0.15;
   - enactment in progress: −2 if the IG's stance to it is negative, +1 if positive;
   - target clamped to ±10.
3. **Legitimacy** = `100 × Σ clout(government) + legitimacyAdd − 10 × (#government IGs with
   approval ≤ −5) − 10 × (#movements with radicalism ≥ 50)`, clamped to 0..100.
4. **Enactment**: `support = Σ_i clout_i × stance(i, law) × (i in government ? 2 : 1) / 2`;
   `speed = clamp(0.5 + support, 0, 2) × clamp(legitimacy / 50, 0.5, 1.5)`;
   `progress += speed / ENACTMENT_WEEKS`. At `progress ≥ 1` the law takes effect,
   `enacting = null`, and movements demanding that law disband.
5. **Movements**: for every IG with approval ≤ −5 and clout ≥ 0.05, it has (or creates, radicalism 0)
   a movement demanding the law with the largest stance gain over the current law of its group
   (`stance(i, l) − stance(i, current)`, needs ≥ 2; ties → law id order). Its radicalism grows by
   `(−approval − 4) × clout × 4 × radicalismMult` per week. Movements of IGs with approval > −5
   lose 2 radicalism per week and disband at 0. Radicalism is clamped to 0..100.
6. **Research**: `researchPoints = (RESEARCH_BASE + RESEARCH_PER_PERSON × Σ(clerks + 0.5 × bureaucrats
   + 0.5 × machinists)) × researchMult`. If `researching` is set, add the points to
   `researchProgress`; at `≥ cost` add the tech to `techs`, `researching = null`, progress 0.
7. Store `modifiers` (from step 0).
8. **AI** — only for countries other than `state.player`:
   a. *Government* (at init and every 26 weeks, when `tickCount % 26 === 0`): sort IGs by clout
      (desc, ties by id), add them in order while skipping any IG whose approval ≤ −5, until the
      government's clout ≥ 0.5 or it has 3 IGs.
   b. *Research*: when `researching` is null, pick the cheapest tech whose prerequisites are known
      (ties by id).
   c. *Laws* (every 52 weeks, when not enacting): among laws allowed to start (see commands), pick
      the one with the largest `Σ_{i in government} clout_i × stance(i, l)`; start it if > 0.5.

## Commands — `src/sim/politics/commands.ts`

Pure; return the same state when invalid.
- `setGovernment(state, tag, igs: IgId[])` — 1–4 distinct IGs. IGs leaving the government lose 3
  approval immediately. Recompute legitimacy.
- `startEnactment(state, tag, lawId)` — valid if nothing is being enacted, the law isn't in force and
  its `requiresTech` is known.
- `cancelEnactment(state, tag)`.
- `setResearch(state, tag, techId)` — prerequisites known and not yet researched. Progress resets to 0
  unless it's the tech already being researched.

## Queries — `src/sim/politics/queries.ts`

- `politicsOf(state, tag): CountryPolitics | undefined`
- `lawSupport(state, tag, lawId): number` — the `support` value of step 4.
- `lawOptions(state, tag, group)`: `{ law: LawDef; inForce: boolean; allowed: boolean; reason?: string; support: number }[]`
- `availableTechs(state, tag)`: `{ tech: TechDef; known: boolean; available: boolean; researching: boolean }[]`
- `igMembers(state, tag, ig): number` — persons (pops × affinity) belonging to the IG.

## Economy hooks (implemented in the economy)

- `src/sim/politics/unlocks.ts`: `isUnlocked(state, tag, id)` for building and method ids, using
  `TECH_UNLOCKS`. Construction commands and the investment AI only use unlocked buildings and
  methods; existing buildings keep working.
- Economy reads `state.politics.countries[tag]?.modifiers`: `tradeShare` replaces
  `WORLD_TRADE_SHARE` for that market; `hireRateMult` applies to every pop type except farmers and
  owners; `wageMult` scales wages; `taxEfficiency` scales income tax reaching the treasury (pops pay
  `rate × taxEfficiency`); `upkeepMult` scales upkeep; `outputMult` / `industryOutputMult` scale output.
