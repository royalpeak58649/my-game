// Internal helpers shared by init.ts, tick.ts, ai.ts, commands.ts and queries.ts.
// Not part of the public diplomacy API: everything here is pure and works on plain values.

import { GREAT_POWER_COUNT, INFLUENCE_BASE, INFLUENCE_PER_10M, GREAT_POWER_INFLUENCE } from '../../data/diplomacy/rules';
import { gdp } from '../economy/queries';
import type { GameState } from '../types';
import { pairKey } from './pair';
import type { CountryDiplomacy, DiplomacyState, PairKey } from './types';

export function clamp(x: number, lo: number, hi: number): number {
  if (!Number.isFinite(x)) return lo;
  return x < lo ? lo : x > hi ? hi : x;
}

/** Finite number or `fallback`. */
export function fin(x: number | undefined, fallback = 0): number {
  return x !== undefined && Number.isFinite(x) ? x : fallback;
}

/** Sorted copy of `tags` without duplicates. */
export function sortedUnique(tags: readonly string[]): string[] {
  return [...new Set(tags)].sort();
}

/** True if `tag` owns at least one state that has an economy. */
export function countryExists(state: GameState, tag: string): boolean {
  for (const [stateId, stateDef] of Object.entries(state.states)) {
    if (stateDef.owner !== tag) continue;
    if (state.economy.states[stateId]) return true;
  }
  return false;
}

/** Every existing country tag, sorted. */
export function existingCountries(state: GameState): string[] {
  const tags = new Set<string>();
  for (const stateId of Object.keys(state.economy.states)) {
    const owner = state.states[stateId]?.owner;
    if (owner) tags.add(owner);
  }
  return [...tags].sort();
}

/** Total population of a country (Σ pops of its states). */
export function populationOf(state: GameState, tag: string): number {
  let total = 0;
  for (const [stateId, stateDef] of Object.entries(state.states)) {
    if (stateDef.owner !== tag) continue;
    const economy = state.economy.states[stateId];
    if (!economy) continue;
    for (const count of Object.values(economy.pops)) total += count;
  }
  return total;
}

/** Battalions of a country (0 when it has no army). */
export function battalionsOf(state: GameState, tag: string): number {
  return Math.max(0, fin(state.military.armies[tag]?.battalions));
}

/** Known techs of a country. */
export function techsOf(state: GameState, tag: string): readonly string[] {
  return state.politics.countries[tag]?.techs ?? [];
}

/** Stored relations between two countries (0 when absent). */
export function relationsOf(state: GameState, a: string, b: string): number {
  if (a === b) return 0;
  return state.diplomacy.relations[pairKey(a, b)] ?? 0;
}

/** True if the two countries are allied. */
export function areAllied(state: GameState, a: string, b: string): boolean {
  if (a === b) return false;
  return state.diplomacy.alliances.includes(pairKey(a, b));
}

/** Overlord of `tag`, or null when it is independent. */
export function overlordOf(state: GameState, tag: string): string | null {
  return state.diplomacy.subjects[tag] ?? null;
}

/** True if `tag` is a rival of `other` (one-way). */
export function isRivalOf(state: GameState, tag: string, other: string): boolean {
  if (tag === other) return false;
  return (state.diplomacy.countries[tag]?.rivals ?? []).includes(other);
}

/** True if either country is the other's rival. */
export function rivalsEitherWay(state: GameState, a: string, b: string): boolean {
  return isRivalOf(state, a, b) || isRivalOf(state, b, a);
}

/** True if the two countries are at war. */
export function isAtWar(state: GameState, a: string, b: string): boolean {
  if (a === b) return false;
  for (const war of state.military.wars) {
    if (war.attackers.includes(a) && war.defenders.includes(b)) return true;
    if (war.defenders.includes(a) && war.attackers.includes(b)) return true;
  }
  return false;
}

/** 1-based rank by prestige (0 when the country is not ranked). */
export function rankOf(state: GameState, tag: string): number {
  const index = state.diplomacy.ranking.indexOf(tag);
  return index < 0 ? 0 : index + 1;
}

/** True if `tag` is one of the GREAT_POWER_COUNT most prestigious countries. */
export function isGreatPower(state: GameState, tag: string): boolean {
  const rank = rankOf(state, tag);
  return rank > 0 && rank <= GREAT_POWER_COUNT;
}

/** Diplomatic capacity of `tag` from its population and great-power status. */
export function influenceFor(state: GameState, tag: string): number {
  const pop = populationOf(state, tag);
  const perPop = Math.floor(pop / 10_000_000) * INFLUENCE_PER_10M;
  const great = isGreatPower(state, tag) ? GREAT_POWER_INFLUENCE : 0;
  return INFLUENCE_BASE + perPop + great;
}

/** Influence spent on alliances and improvements. */
export function influenceUsedOf(diplomacy: DiplomacyState, tag: string): number {
  const country = diplomacy.countries[tag];
  if (!country) return 0;
  let alliances = 0;
  for (const key of diplomacy.alliances) {
    const [a, b] = key.split('|');
    if (a === tag || b === tag) alliances += 1;
  }
  return alliances + country.improving.length;
}

/** Influence still free for `tag`. */
export function freeInfluenceOf(diplomacy: DiplomacyState, tag: string): number {
  const country = diplomacy.countries[tag];
  if (!country) return 0;
  return Math.max(0, fin(country.influence) - influenceUsedOf(diplomacy, tag));
}

/** Prestige of `tag` from GDP, army, techs and the decaying bonus. */
export function prestigeOf(
  state: GameState,
  tag: string,
  country: CountryDiplomacy,
  gdpDiv: number,
  perBattalion: number,
  perTech: number,
): number {
  const gdpValue = gdp(state, tag);
  const battalions = battalionsOf(state, tag);
  const techs = techsOf(state, tag).length;
  const raw = gdpValue / gdpDiv + battalions * perBattalion + techs * perTech + fin(country.prestigeBonus);
  return Number.isFinite(raw) ? raw : 0;
}

/** Ranking of existing countries by prestige desc, ties by tag. */
export function rankingOf(state: GameState, diplomacy: DiplomacyState): string[] {
  return existingCountries(state).sort((a, b) => {
    const diff = fin(diplomacy.countries[b]?.prestige) - fin(diplomacy.countries[a]?.prestige);
    return diff !== 0 ? diff : a < b ? -1 : a > b ? 1 : 0;
  });
}

/** Adds `delta` to the stored relations of a pair, clamped to ±100; deletes exact zeros. */
export function addRelations(
  relations: Record<PairKey, number>,
  a: string,
  b: string,
  delta: number,
  min: number,
  max: number,
): void {
  if (a === b) return;
  const key = pairKey(a, b);
  const next = clamp(fin(relations[key]) + delta, min, max);
  if (next === 0) delete relations[key];
  else relations[key] = next;
}

/** Sets the stored relations of a pair, clamped; deletes exact zeros. */
export function setRelations(
  relations: Record<PairKey, number>,
  a: string,
  b: string,
  value: number,
  min: number,
  max: number,
): void {
  if (a === b) return;
  const key = pairKey(a, b);
  const next = clamp(value, min, max);
  if (next === 0) delete relations[key];
  else relations[key] = next;
}

/** Removes the alliance between two countries (no-op when there is none). */
export function removeAlliance(diplomacy: DiplomacyState, a: string, b: string): void {
  const key = pairKey(a, b);
  diplomacy.alliances = diplomacy.alliances.filter((k) => k !== key);
}

/** Adds the alliance between two countries if it is missing. */
export function addAlliance(diplomacy: DiplomacyState, a: string, b: string): void {
  if (a === b) return;
  const key = pairKey(a, b);
  if (!diplomacy.alliances.includes(key)) diplomacy.alliances = [...diplomacy.alliances, key].sort();
}

/** Removes `target` from the improving list of `tag`. */
export function stopImproving(country: CountryDiplomacy, target: string): void {
  country.improving = country.improving.filter((t) => t !== target);
}

/** Removes `target` from the rivals of `tag`. */
export function removeRival(country: CountryDiplomacy, target: string): void {
  country.rivals = country.rivals.filter((t) => t !== target);
}

/** Parity of a tag: Σ char codes % 26 (used to spread AI work over the weeks). */
export function tagParity(tag: string): number {
  let sum = 0;
  for (let i = 0; i < tag.length; i++) sum += tag.charCodeAt(i);
  return sum % 26;
}
