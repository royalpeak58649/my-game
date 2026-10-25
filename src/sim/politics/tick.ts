// Weekly politics tick — see docs/POLITICS.md, "Weekly tick".
//
// Pure: the politics state is copied once (it is small) and the returned GameState shares
// everything else with the input. Countries are processed in sorted tag order and IGs in
// IG_IDS order, so the result is deterministic. No NaN is ever stored: every division is
// guarded and every number written back is finite.

import { POP_TYPES, POP_TYPE_IDS } from '../../data/economy/pops';
import { POP_AFFINITY } from '../../data/politics/igs';
import type { PopTypeId } from '../economy/types';
import { IG_IDS } from '../../data/politics/igs';
import { ENACTMENT_WEEKS, LAWS } from '../../data/politics/laws';
import type { GameState } from '../types';
import { applyAiGovernment, applyAiLaws, applyAiResearch } from './ai';
import {
  ANGRY_APPROVAL, GOVERNMENT_INTERVAL, LAW_INTERVAL, advanceResearch, approvalTarget,
  clamp, cloutShares, countryTags, enactmentSpeed, enactmentSupport, fin, igCloutMult,
  legitimacyOf, nextMovements, researchPointsOf, statesByOwner, tierWeights,
} from './internal';
import { combineModifiers } from './modifiers';
import type { CountryPolitics, IgId, PoliticsState } from './types';

/** Approval moves this share of the way to its target each week. */
const APPROVAL_SMOOTHING = 0.1;

/** Pops of one country, summed over its states. */
interface CountryPops {
  /** Σ_popTypes pops × tierWeight × affinity, by IG. */
  strength: Record<IgId, number>;
  /** Σ_popTypes pops × affinity, by IG. */
  members: Record<IgId, number>;
  /** Σ_popTypes pops × affinity × sol, by IG. */
  solWeighted: Record<IgId, number>;
  clerks: number;
  bureaucrats: number;
  machinists: number;
}

function emptyCountryPops(): CountryPops {
  const strength = {} as Record<IgId, number>;
  const members = {} as Record<IgId, number>;
  const solWeighted = {} as Record<IgId, number>;
  for (const ig of IG_IDS) {
    strength[ig] = 0;
    members[ig] = 0;
    solWeighted[ig] = 0;
  }
  return { strength, members, solWeighted, clerks: 0, bureaucrats: 0, machinists: 0 };
}

// Affinity as a flat table: AFF[popIndex * IG_COUNT + igIndex].
const IG_COUNT = IG_IDS.length;
const AFF = new Float64Array(POP_TYPE_IDS.length * IG_COUNT);
POP_TYPE_IDS.forEach((pop, p) => IG_IDS.forEach((ig, i) => { AFF[p * IG_COUNT + i] = POP_AFFINITY[pop][ig] ?? 0; }));
const POP_TIER = POP_TYPE_IDS.map((pop) => POP_TYPES[pop].tier);

/** One pass over the country's states: clout inputs, member counts and living standards. */
function collectPops(
  state: GameState,
  stateIds: readonly string[],
  weights: ReturnType<typeof tierWeights>,
): CountryPops {
  const out = emptyCountryPops();
  const strength = new Float64Array(IG_COUNT);
  const members = new Float64Array(IG_COUNT);
  const solW = new Float64Array(IG_COUNT);
  const w = POP_TIER.map((t) => fin(weights[t], 1));
  for (const stateId of stateIds) {
    const economy = state.economy.states[stateId];
    if (!economy) continue;
    for (let p = 0; p < POP_TYPE_IDS.length; p++) {
      const pop = POP_TYPE_IDS[p] as PopTypeId;
      const count = Math.max(0, fin(economy.pops[pop]));
      if (count <= 0) continue;
      const sol = fin(economy.sol[pop]);
      const pw = count * (w[p] as number);
      for (let i = 0; i < IG_COUNT; i++) {
        const a = AFF[p * IG_COUNT + i] as number;
        if (a === 0) continue;
        strength[i] += pw * a;
        members[i] += count * a;
        solW[i] += count * a * sol;
      }
    }
    out.clerks += fin(economy.pops.clerks);
    out.bureaucrats += fin(economy.pops.bureaucrats);
    out.machinists += fin(economy.pops.machinists);
  }
  IG_IDS.forEach((ig, i) => {
    out.strength[ig] = strength[i] as number;
    out.members[ig] = members[i] as number;
    out.solWeighted[ig] = solW[i] as number;
  });
  return out;
}

/** Step 1: clout shares from the collected strengths and the governance law. */
function updateClout(country: CountryPolitics, pops: CountryPops): void {
  const strength = {} as Record<IgId, number>;
  for (const ig of IG_IDS) strength[ig] = pops.strength[ig] * igCloutMult(country.laws, ig);
  const clout = cloutShares(strength);
  for (const ig of IG_IDS) country.igs[ig].clout = clout[ig];
}

/** Step 2: approval moves a tenth of the way to its target. */
function updateApproval(country: CountryPolitics, pops: CountryPops, incomeTaxRate: number): void {
  for (const ig of IG_IDS) {
    const state = country.igs[ig];
    const members = pops.members[ig];
    const memberSol = members > 0 ? pops.solWeighted[ig] / members : 0;
    const target = approvalTarget(ig, country, state.clout, memberSol, incomeTaxRate);
    const approval = state.approval + (target - state.approval) * APPROVAL_SMOOTHING;
    state.approval = clamp(approval, -10, 10);
  }
}

/** Step 4: advances the enactment in progress; returns true when the law took effect. */
function advanceEnactment(country: CountryPolitics): boolean {
  const enacting = country.enacting;
  if (!enacting) return false;
  const support = enactmentSupport(country, enacting.law);
  const speed = enactmentSpeed(support, country.legitimacy);
  const progress = clamp(enacting.progress + speed / ENACTMENT_WEEKS, 0, 1);
  if (progress < 1) {
    country.enacting = { law: enacting.law, progress };
    return false;
  }
  const def = LAWS[enacting.law];
  if (def) country.laws = { ...country.laws, [def.group]: def.id };
  country.enacting = null;
  country.movements = country.movements.filter((m) => m.law !== enacting.law);
  return true;
}

/** Steps 0–8 for one country. Mutates `country`, which the caller owns. */
function tickCountry(
  country: CountryPolitics,
  state: GameState,
  stateIds: readonly string[],
  tickCount: number,
): void {
  // 0. Modifiers from laws, techs and last week's movements.
  const modifiers = combineModifiers(country.laws, country.techs, country.movements);
  country.modifiers = modifiers;

  // 1. Clout, and the pop data the later steps need (one pass over the states).
  const pops = collectPops(state, stateIds, tierWeights(country.laws));
  updateClout(country, pops);

  // 2. Approval.
  const incomeTaxRate = fin(state.economy.countries[countryTagOf(state, stateIds)]?.incomeTaxRate);
  updateApproval(country, pops, incomeTaxRate);

  // 3. Legitimacy.
  country.legitimacy = legitimacyOf(country, modifiers);

  // 4. Enactment.
  advanceEnactment(country);

  // 5. Movements.
  country.movements = nextMovements(country, fin(modifiers.radicalismMult, 1));

  // 6. Research.
  const points = researchPointsOf(
    { clerks: pops.clerks, bureaucrats: pops.bureaucrats, machinists: pops.machinists },
    fin(modifiers.researchMult, 1),
  );
  advanceResearch(country, points);

  // 7. Modifiers are already stored (step 0).

  // 8. AI, for non-player countries only.
  if (state.player !== null && state.player === countryTagOf(state, stateIds)) return;
  if (tickCount % GOVERNMENT_INTERVAL === 0) applyAiGovernment(country, modifiers);
  applyAiResearch(country);
  if (tickCount % LAW_INTERVAL === 0) applyAiLaws(country);
}

/** Owner of the first state in the list (all of them share it). */
function countryTagOf(state: GameState, stateIds: readonly string[]): string {
  const first = stateIds[0];
  return first !== undefined ? (state.states[first]?.owner ?? '') : '';
}

/** Advances politics by one week. Pure: returns a new GameState. */
export function politicsTick(state: GameState): GameState {
  const politics: PoliticsState = structuredClone(state.politics);
  const byOwner = statesByOwner(state);

  for (const tag of countryTags(state)) {
    const country = politics.countries[tag];
    if (!country) continue;
    tickCountry(country, state, byOwner.get(tag) ?? [], state.tickCount);
  }

  return { ...state, politics };
}

/** Pop types whose people count towards research (clerks, bureaucrats, machinists). */
export const RESEARCH_POPS = POP_TYPE_IDS.filter(
  (id) => id === 'clerks' || id === 'bureaucrats' || id === 'machinists',
);

/** Approval at or below this is angry (re-exported for the UI). */
export { ANGRY_APPROVAL };
