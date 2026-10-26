// Read-only queries over diplomacy — see docs/WAR.md, "Queries".
//
// Pure and cheap: nothing is copied and nothing is mutated. Every query returns a neutral
// result (0, false or an empty list) for a tag that does not exist.
//
// The only cache is the tag-pair bordering table: it is keyed on the `state.states` object and
// rebuilt whenever `state.ownershipVersion` changes (a state changed hands).

import adjacencyJson from '../../data/adjacency.json';
import { ALLIANCE_MIN_RELATIONS, GREAT_POWER_COUNT } from '../../data/diplomacy/rules';
import type { GameState } from '../types';
import { countryStats } from '../aggregates';
import { pairKey } from './pair';
import type { PairKey } from './types';

const ADJACENCY = adjacencyJson as Record<string, string[]>;

/** Neighbours of a state id (empty for unknown ids). */
export function stateNeighbours(stateId: string): readonly string[] {
  return ADJACENCY[stateId] ?? [];
}

// ------------------------------------------------------------------ bordering cache

interface BorderCache {
  version: number;
  /** PairKey -> true when the two countries share a land border. */
  pairs: Set<PairKey>;
  /** tag -> sorted neighbour tags. */
  neighbours: Map<string, string[]>;
}

const borderCaches = new WeakMap<Record<string, unknown>, BorderCache>();

/** The bordering cache for this state, rebuilt when the ownership version changed. */
function borderCache(state: GameState): BorderCache {
  const key = state.states as unknown as Record<string, unknown>;
  const cached = borderCaches.get(key);
  if (cached && cached.version === state.ownershipVersion) return cached;

  const pairs = new Set<PairKey>();
  const neighbours = new Map<string, Set<string>>();
  for (const stateId of Object.keys(state.states).sort()) {
    const owner = state.states[stateId]?.owner;
    if (!owner) continue;
    for (const neighbourId of ADJACENCY[stateId] ?? []) {
      const other = state.states[neighbourId]?.owner;
      if (!other || other === owner) continue;
      pairs.add(pairKey(owner, other));
      addNeighbour(neighbours, owner, other);
      addNeighbour(neighbours, other, owner);
    }
  }

  const sorted = new Map<string, string[]>();
  for (const [tag, set] of neighbours) sorted.set(tag, [...set].sort());
  const cache: BorderCache = { version: state.ownershipVersion, pairs, neighbours: sorted };
  borderCaches.set(key, cache);
  return cache;
}

function addNeighbour(map: Map<string, Set<string>>, tag: string, other: string): void {
  const set = map.get(tag);
  if (set) set.add(other);
  else map.set(tag, new Set([other]));
}

// ------------------------------------------------------------------ countries

/** True if `tag` owns at least one state that has an economy. */
export function countryExists(state: GameState, tag: string): boolean {
  return countryStats(state).existingSet.has(tag);
}

/** Every existing country tag, sorted. */
export function existingCountries(state: GameState): string[] {
  return [...countryStats(state).existing];
}

/** Total population of a country (Σ pops of its states). */
export function populationOf(state: GameState, tag: string): number {
  return countryStats(state).population.get(tag) ?? 0;
}

// ------------------------------------------------------------------ relations and pacts

/** Stored relations between two countries (−100..100, 0 when absent). */
export function relationsOf(state: GameState, a: string, b: string): number {
  if (a === b) return 0;
  return state.diplomacy.relations[pairKey(a, b)] ?? 0;
}

/** True if the two countries are allied. */
export function areAllied(state: GameState, a: string, b: string): boolean {
  if (a === b) return false;
  return state.diplomacy.alliances.includes(pairKey(a, b));
}

/** Allies of `tag`, sorted. */
export function alliesOf(state: GameState, tag: string): string[] {
  const out: string[] = [];
  for (const key of state.diplomacy.alliances) {
    const [a, b] = key.split('|');
    if (a === tag && b !== undefined) out.push(b);
    else if (b === tag && a !== undefined) out.push(a);
  }
  return out.sort();
}

/** Subjects of `tag`, sorted. */
export function subjectsOf(state: GameState, tag: string): string[] {
  const out: string[] = [];
  for (const [subject, overlord] of Object.entries(state.diplomacy.subjects)) {
    if (overlord === tag) out.push(subject);
  }
  return out.sort();
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
    const aAtt = war.attackers.includes(a);
    const aDef = war.defenders.includes(a);
    if (aAtt && war.defenders.includes(b)) return true;
    if (aDef && war.attackers.includes(b)) return true;
  }
  return false;
}

/** Weeks left of the truce between two countries (0 when none). */
export function truceOf(state: GameState, a: string, b: string): number {
  if (a === b) return 0;
  return state.diplomacy.truces[pairKey(a, b)] ?? 0;
}

// ------------------------------------------------------------------ prestige

/** Prestige of `tag` (0 when it has no diplomacy entry). */
export function prestigeOf(state: GameState, tag: string): number {
  return state.diplomacy.countries[tag]?.prestige ?? 0;
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

// ------------------------------------------------------------------ geography

/** True if any state of `a` is land-adjacent to a state of `b`. */
export function borders(state: GameState, a: string, b: string): boolean {
  if (a === b) return false;
  return borderCache(state).pairs.has(pairKey(a, b));
}

/** Countries sharing a land border with `tag`, sorted. */
export function neighboursOf(state: GameState, tag: string): string[] {
  return [...(borderCache(state).neighbours.get(tag) ?? [])];
}

// ------------------------------------------------------------------ influence

/** Diplomatic capacity of `tag` (0 when it has no diplomacy entry). */
export function influenceOf(state: GameState, tag: string): number {
  return state.diplomacy.countries[tag]?.influence ?? 0;
}

/** Influence already spent on alliances and improvements. */
export function influenceUsedOf(state: GameState, tag: string): number {
  return state.diplomacy.countries[tag]?.influenceUsed ?? 0;
}

/** Influence still free for `tag`. */
export function freeInfluence(state: GameState, tag: string): number {
  return Math.max(0, influenceOf(state, tag) - influenceUsedOf(state, tag));
}

// ------------------------------------------------------------------ alliance acceptance

export interface AllianceAcceptance {
  accepts: boolean;
  /** Human-readable reasons, one per failed rule (empty when accepted). */
  reasons: string[];
}

/**
 * Whether `to` would accept an alliance proposed by `from`: relations ≥ ALLIANCE_MIN_RELATIONS,
 * no rivalry either way, no war between them, both with free influence, and `to` not the
 * subject of a third country.
 */
export function allianceAcceptance(state: GameState, from: string, to: string): AllianceAcceptance {
  const reasons: string[] = [];
  if (from === to) return { accepts: false, reasons: ['Cannot ally with itself'] };
  if (!countryExists(state, from)) reasons.push(`${from} does not exist`);
  if (!countryExists(state, to)) reasons.push(`${to} does not exist`);

  const relations = relationsOf(state, from, to);
  if (relations < ALLIANCE_MIN_RELATIONS) {
    reasons.push(`Relations ${Math.round(relations)} below ${ALLIANCE_MIN_RELATIONS}`);
  }
  if (rivalsEitherWay(state, from, to)) reasons.push('Rivals');
  if (isAtWar(state, from, to)) reasons.push('At war');
  if (freeInfluence(state, from) < 1) reasons.push(`${from} has no free influence`);
  if (freeInfluence(state, to) < 1) reasons.push(`${to} has no free influence`);

  const overlord = overlordOf(state, to);
  if (overlord !== null && overlord !== from) reasons.push(`${to} is a subject of ${overlord}`);

  return { accepts: reasons.length === 0, reasons };
}
