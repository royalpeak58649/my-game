// Seeds the 1836 politics from static data. See docs/POLITICS.md, "Initialisation".
// Pure: returns a new GameState and never mutates the input.

import { POP_TYPE_IDS } from '../../data/economy/pops';
import { IG_IDS } from '../../data/politics/igs';
import { DEFAULT_LAWS, START_LAWS, START_TECHS } from '../../data/politics/start1836';
import type { PopTypeId } from '../economy/types';
import type { GameState } from '../types';
import { aiGovernment, aiResearchPick } from './ai';
import {
  approvalTarget, cloutShares, countryTags, emptyIgs, fin, igCloutMult, legitimacyOf,
  researchPointsOf, stateStrength, statesByOwner, tierWeights,
} from './internal';
import { combineModifiers } from './modifiers';
import type { CountryPolitics, IgId, LawGroupId, PoliticsState } from './types';

/** Laws in force for `tag`: DEFAULT_LAWS overridden by START_LAWS. */
export function startLaws(tag: string): Record<LawGroupId, string> {
  return { ...DEFAULT_LAWS, ...(START_LAWS[tag] ?? {}) };
}

/** Known techs for `tag` on 1 January 1836. */
export function startTechs(tag: string): string[] {
  return [...(START_TECHS[tag] ?? [])];
}

/** Builds the starting politics of one country from its states' pops. */
function initCountry(
  tag: string,
  stateIds: readonly string[],
  state: GameState,
): CountryPolitics {
  const laws = startLaws(tag);
  const techs = startTechs(tag);

  // Steps 0–1: modifiers and clout, in one pass over the country's states.
  const modifiers = combineModifiers(laws, techs, []);
  const weights = tierWeights(laws);
  const strength = {} as Record<IgId, number>;
  const membersTotal = {} as Record<IgId, number>;
  const solWeighted = {} as Record<IgId, number>;
  for (const ig of IG_IDS) {
    strength[ig] = 0;
    membersTotal[ig] = 0;
    solWeighted[ig] = 0;
  }
  let educated = { clerks: 0, bureaucrats: 0, machinists: 0 };

  for (const stateId of stateIds) {
    const economy = state.economy.states[stateId];
    if (!economy) continue;
    const s = stateStrength(economy.pops, economy.sol, weights);
    for (const ig of IG_IDS) {
      strength[ig] += s.strength[ig];
      membersTotal[ig] += s.membersTotal[ig];
      solWeighted[ig] += s.solWeighted[ig];
    }
    educated = {
      clerks: educated.clerks + fin(economy.pops.clerks),
      bureaucrats: educated.bureaucrats + fin(economy.pops.bureaucrats),
      machinists: educated.machinists + fin(economy.pops.machinists),
    };
  }
  for (const ig of IG_IDS) strength[ig] *= igCloutMult(laws, ig);
  const clout = cloutShares(strength);

  const igs = emptyIgs();
  for (const ig of IG_IDS) igs[ig] = { clout: clout[ig], approval: 0 };

  const country: CountryPolitics = {
    laws,
    government: [],
    legitimacy: 0,
    igs,
    enacting: null,
    movements: [],
    techs,
    researching: null,
    researchProgress: 0,
    researchPoints: 0,
    modifiers,
  };

  // Step 2 without smoothing: approval is set straight to its target.
  const incomeTaxRate = fin(state.economy.countries[tag]?.incomeTaxRate);
  for (const ig of IG_IDS) {
    const members = membersTotal[ig];
    const memberSol = members > 0 ? solWeighted[ig] / members : 0;
    igs[ig].approval = approvalTarget(ig, country, clout[ig], memberSol, incomeTaxRate);
  }

  // Step 8a: the AI government, then step 3 legitimacy.
  country.government = aiGovernment(country);
  country.legitimacy = legitimacyOf(country, modifiers);

  // Step 8b: the AI research pick.
  country.researching = aiResearchPick(country);
  country.researchProgress = 0;
  country.researchPoints = researchPointsOf(educated, modifiers.researchMult ?? 1);

  return country;
}

/** Builds the starting politics for every country that owns at least one state. Pure. */
export function initPolitics(state: GameState): GameState {
  const byOwner = statesByOwner(state);
  const countries: Record<string, CountryPolitics> = {};
  for (const tag of countryTags(state)) {
    countries[tag] = initCountry(tag, byOwner.get(tag) ?? [], state);
  }
  const politics: PoliticsState = { countries };
  return { ...state, politics };
}

/** Pop types that count towards research (kept for callers that need the list). */
export const EDUCATED_POPS: readonly PopTypeId[] = POP_TYPE_IDS.filter(
  (id) => id === 'clerks' || id === 'bureaucrats' || id === 'machinists',
);
