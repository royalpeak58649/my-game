// Player commands — see docs/WAR.md, "Diplomacy", "Commands".
//
// Pure: an invalid command returns the very same GameState object. A valid one copies only the
// diplomacy container (and the countries it changes), sharing everything else with the input.

import type { GameState } from '../types';
import { BREAK_ALLIANCE_RELATIONS, MAX_RIVALS } from './ai';
import {
  addAlliance, areAllied, countryExists, freeInfluenceOf, influenceUsedOf, isRivalOf,
  removeAlliance, removeRival, rivalsEitherWay, stopImproving,
} from './internal';
import { allianceAcceptance } from './queries';
import { bumpRelations } from './steps';
import type { CountryDiplomacy, DiplomacyState } from './types';

/** A GameState with `diplomacy` replacing the old one; everything else is shared. */
function withDiplomacy(state: GameState, diplomacy: DiplomacyState): GameState {
  return { ...state, diplomacy };
}

/** Copy of the diplomacy container with a fresh copy of the countries it will touch. */
function copyDiplomacy(state: GameState, tags: readonly string[]): DiplomacyState {
  const diplomacy: DiplomacyState = structuredClone(state.diplomacy);
  for (const tag of tags) {
    const country = diplomacy.countries[tag];
    if (country) diplomacy.countries[tag] = { ...country, improving: [...country.improving], rivals: [...country.rivals] };
  }
  return diplomacy;
}

/** True if both tags are existing, distinct countries. */
function validPair(state: GameState, a: string, b: string): boolean {
  if (a === b) return false;
  return countryExists(state, a) && countryExists(state, b);
}

/**
 * Turns improving relations with `target` on or off. Turning it on needs free influence and is
 * not allowed towards a rival. Returns the same state when the command is invalid.
 */
export function setImproving(state: GameState, tag: string, target: string, on: boolean): GameState {
  if (!validPair(state, tag, target)) return state;
  const current = state.diplomacy.countries[tag];
  if (!current) return state;
  const improving = current.improving.includes(target);
  if (improving === on) return state;

  if (on) {
    if (rivalsEitherWay(state, tag, target)) return state;
    if (freeInfluenceOf(state.diplomacy, tag) < 1) return state;
  }

  const diplomacy = copyDiplomacy(state, [tag]);
  const country = diplomacy.countries[tag];
  if (!country) return state;
  if (on) country.improving = [...country.improving, target];
  else stopImproving(country, target);
  country.influenceUsed = influenceUsedOf(diplomacy, tag);
  return withDiplomacy(state, diplomacy);
}

/**
 * Proposes an alliance to `target`; accepted when `allianceAcceptance` accepts. Returns the same
 * state when the command is invalid or refused.
 */
export function proposeAlliance(state: GameState, tag: string, target: string): GameState {
  if (!validPair(state, tag, target)) return state;
  if (areAllied(state, tag, target)) return state;
  if (!allianceAcceptance(state, tag, target).accepts) return state;

  const diplomacy = copyDiplomacy(state, [tag, target]);
  addAlliance(diplomacy, tag, target);
  for (const t of [tag, target]) {
    const country = diplomacy.countries[t];
    if (country) country.influenceUsed = influenceUsedOf(diplomacy, t);
  }
  return withDiplomacy(state, diplomacy);
}

/** Breaks the alliance with `target`; relations drop by 20. Same state when not allied. */
export function breakAlliance(state: GameState, tag: string, target: string): GameState {
  if (!validPair(state, tag, target)) return state;
  if (!areAllied(state, tag, target)) return state;

  const diplomacy = copyDiplomacy(state, [tag, target]);
  removeAlliance(diplomacy, tag, target);
  bumpRelations(diplomacy, tag, target, BREAK_ALLIANCE_RELATIONS);
  for (const t of [tag, target]) {
    const country = diplomacy.countries[t];
    if (country) country.influenceUsed = influenceUsedOf(diplomacy, t);
  }
  return withDiplomacy(state, diplomacy);
}

/**
 * Turns a rivalry with `target` on or off. At most MAX_RIVALS rivals; turning one on breaks an
 * alliance with them and stops improving relations. Returns the same state when invalid.
 */
export function setRival(state: GameState, tag: string, target: string, on: boolean): GameState {
  if (!validPair(state, tag, target)) return state;
  const current = state.diplomacy.countries[tag];
  if (!current) return state;
  const rival = current.rivals.includes(target);
  if (rival === on) return state;
  if (on && current.rivals.length >= MAX_RIVALS) return state;

  const diplomacy = copyDiplomacy(state, [tag, target]);
  const country: CountryDiplomacy | undefined = diplomacy.countries[tag];
  if (!country) return state;

  if (on) {
    country.rivals = [...country.rivals, target].sort();
    stopImproving(country, target);
    if (areAllied(state, tag, target)) removeAlliance(diplomacy, tag, target);
  } else {
    removeRival(country, target);
  }

  for (const t of [tag, target]) {
    const entry = diplomacy.countries[t];
    if (entry) entry.influenceUsed = influenceUsedOf(diplomacy, t);
  }
  return withDiplomacy(state, diplomacy);
}

/** True if `tag` may still add a rival. */
export function canAddRival(state: GameState, tag: string): boolean {
  const country = state.diplomacy.countries[tag];
  if (!country) return false;
  return country.rivals.length < MAX_RIVALS;
}

/** True if `tag` is a rival of `target` (re-exported for the UI). */
export { isRivalOf };
