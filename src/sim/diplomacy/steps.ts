// Weekly diplomacy steps 1–4 — see docs/WAR.md, "Diplomacy", "Weekly".
//
// Pure: every function mutates the DiplomacyState it is given, which callers own (a fresh copy).
// Countries are always visited in sorted tag order and pairs in sorted key order, so the result
// is deterministic.

import {
  ALLY_BASELINE, IMPROVE_PER_WEEK, RELATION_DRIFT, RELATIONS_MAX, RELATIONS_MIN, RIVAL_BASELINE,
} from '../../data/diplomacy/rules';
import type { GameState } from '../types';
import {
  addRelations, existingCountries, fin, influenceFor, influenceUsedOf, isAtWar, prestigeOf,
  rankingOf, relationsOf, rivalsEitherWay, setRelations,
} from './internal';
import { pairKey, pairTags } from './pair';
import type { DiplomacyState, PairKey } from './types';

/** True if the two countries are allied or one is the other's subject/overlord. */
function friendlyBaseline(diplomacy: DiplomacyState, a: string, b: string): boolean {
  if (diplomacy.alliances.includes(pairKey(a, b))) return true;
  return diplomacy.subjects[a] === b || diplomacy.subjects[b] === a;
}

/** Step 1: improvements, then drift towards the baseline; clamp and drop exact zeros. */
export function updateRelations(state: GameState, diplomacy: DiplomacyState): void {
  const keys = new Set<PairKey>(Object.keys(diplomacy.relations));
  for (const [tag, country] of Object.entries(diplomacy.countries)) {
    for (const target of country.improving) {
      if (target !== tag) keys.add(pairKey(tag, target));
    }
  }

  for (const key of [...keys].sort()) {
    const [a, b] = pairTags(key);
    if (!a || !b || a === b) continue;

    let value = relationsOf(state, a, b);
    if ((diplomacy.countries[a]?.improving ?? []).includes(b)) value += IMPROVE_PER_WEEK;
    if ((diplomacy.countries[b]?.improving ?? []).includes(a)) value += IMPROVE_PER_WEEK;

    let baseline = 0;
    if (friendlyBaseline(diplomacy, a, b)) baseline = ALLY_BASELINE;
    else if (rivalsEitherWay(state, a, b)) baseline = RIVAL_BASELINE;
    if (isAtWar(state, a, b)) baseline = -50;

    value += (baseline - value) * RELATION_DRIFT;
    setRelations(diplomacy.relations, a, b, value, RELATIONS_MIN, RELATIONS_MAX);
  }
}

/** Step 2: truces count down and disappear at 0. */
export function updateTruces(diplomacy: DiplomacyState): void {
  for (const key of Object.keys(diplomacy.truces).sort()) {
    const left = fin(diplomacy.truces[key]) - 1;
    if (left <= 0) delete diplomacy.truces[key];
    else diplomacy.truces[key] = left;
  }
}

/** Step 3: recompute influence and drop improvements that no longer fit. */
export function updateInfluence(state: GameState, diplomacy: DiplomacyState): void {
  for (const tag of Object.keys(diplomacy.countries).sort()) {
    const country = diplomacy.countries[tag];
    if (!country) continue;
    country.influence = influenceFor(state, tag);
    country.influenceUsed = influenceUsedOf(diplomacy, tag);
    while (country.improving.length > 0 && country.influenceUsed > country.influence) {
      country.improving = country.improving.slice(0, -1);
      country.influenceUsed = influenceUsedOf(diplomacy, tag);
    }
  }
}

/** Step 4: prestige (bonus decays 1%/week) and the ranking / great powers. */
export function updatePrestige(
  state: GameState,
  diplomacy: DiplomacyState,
  gdpDiv: number,
  perBattalion: number,
  perTech: number,
): void {
  for (const tag of Object.keys(diplomacy.countries).sort()) {
    const country = diplomacy.countries[tag];
    if (!country) continue;
    country.prestigeBonus = fin(country.prestigeBonus) * 0.99;
    country.prestige = prestigeOf(state, tag, country, gdpDiv, perBattalion, perTech);
  }
  diplomacy.ranking = rankingOf(state, diplomacy);
}

/** Steps 3–4 (used by init, which has no relations or truces to advance yet). */
export function updateInfluenceAndPrestige(
  state: GameState,
  diplomacy: DiplomacyState,
  gdpDiv: number,
  perBattalion: number,
  perTech: number,
): void {
  updateInfluence(state, diplomacy);
  updatePrestige(state, diplomacy, gdpDiv, perBattalion, perTech);
}

/** Adds relations to a pair of countries (clamped, zeros dropped). */
export function bumpRelations(diplomacy: DiplomacyState, a: string, b: string, delta: number): void {
  addRelations(diplomacy.relations, a, b, delta, RELATIONS_MIN, RELATIONS_MAX);
}

/** Existing countries in sorted order (re-exported for init.ts). */
export { existingCountries };
