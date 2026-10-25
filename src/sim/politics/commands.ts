// Player commands — see docs/POLITICS.md, "Commands".
//
// Pure: an invalid command returns the very same GameState object. A valid one copies only the
// changed country (and the politics container), sharing everything else with the input.

import { IG_IDS } from '../../data/politics/igs';
import { LAWS } from '../../data/politics/laws';
import { TECHS } from '../../data/politics/techs';
import type { GameState } from '../types';
import {
  LEAVE_GOVERNMENT_APPROVAL, clamp, fin, legitimacyOf, techAvailable, techKnown,
} from './internal';
import type { CountryPolitics, IgId, PoliticsState } from './types';

/** Smallest government a player may form. */
export const MIN_GOVERNMENT = 1;
/** Largest government a player may form. */
export const MAX_GOVERNMENT = 4;

/** The country's politics, or undefined when `tag` has none. */
function countryOf(state: GameState, tag: string): CountryPolitics | undefined {
  return state.politics.countries[tag];
}

/** A GameState with `country` replacing the politics of `tag`; everything else is shared. */
function withCountry(state: GameState, tag: string, country: CountryPolitics): GameState {
  const politics: PoliticsState = {
    countries: { ...state.politics.countries, [tag]: country },
  };
  return { ...state, politics };
}

/** True if `igs` is a valid government: 1–4 distinct, known interest groups. */
function validGovernment(igs: readonly IgId[]): boolean {
  if (igs.length < MIN_GOVERNMENT || igs.length > MAX_GOVERNMENT) return false;
  const seen = new Set<IgId>();
  for (const ig of igs) {
    if (!IG_IDS.includes(ig)) return false;
    if (seen.has(ig)) return false;
    seen.add(ig);
  }
  return true;
}

/**
 * Forms a government from `igs` (1–4 distinct IGs). IGs leaving the government lose
 * LEAVE_GOVERNMENT_APPROVAL approval immediately; legitimacy is recomputed with the same
 * function the tick uses. Returns the same state when the command is invalid.
 */
export function setGovernment(state: GameState, tag: string, igs: IgId[]): GameState {
  const country = countryOf(state, tag);
  if (!country) return state;
  if (!validGovernment(igs)) return state;

  const next: CountryPolitics = structuredClone(country);
  const members = new Set<IgId>(igs);
  for (const ig of country.government) {
    if (members.has(ig)) continue;
    const igState = next.igs[ig];
    if (!igState) continue;
    igState.approval = clamp(fin(igState.approval) - LEAVE_GOVERNMENT_APPROVAL, -10, 10);
  }
  next.government = [...igs];
  next.legitimacy = legitimacyOf(next, next.modifiers);

  return withCountry(state, tag, next);
}

/**
 * Starts enacting `lawId`. Valid when nothing is being enacted, the law is not in force and its
 * required tech is known. Returns the same state when the command is invalid.
 */
export function startEnactment(state: GameState, tag: string, lawId: string): GameState {
  const country = countryOf(state, tag);
  if (!country) return state;
  const def = LAWS[lawId];
  if (!def) return state;
  if (country.enacting) return state;
  if (country.laws[def.group] === lawId) return state;
  if (!techKnown(country.techs, lawId)) return state;

  const next: CountryPolitics = structuredClone(country);
  next.enacting = { law: lawId, progress: 0 };
  return withCountry(state, tag, next);
}

/** Cancels the enactment in progress. Returns the same state when nothing is being enacted. */
export function cancelEnactment(state: GameState, tag: string): GameState {
  const country = countryOf(state, tag);
  if (!country) return state;
  if (!country.enacting) return state;

  const next: CountryPolitics = structuredClone(country);
  next.enacting = null;
  return withCountry(state, tag, next);
}

/**
 * Sets the tech being researched. Valid when the tech exists, is not yet known and its
 * prerequisites are known. Progress resets to 0 unless it is the tech already being researched.
 * Returns the same state when the command is invalid.
 */
export function setResearch(state: GameState, tag: string, techId: string): GameState {
  const country = countryOf(state, tag);
  if (!country) return state;
  if (!TECHS[techId]) return state;
  if (!techAvailable(country.techs, techId)) return state;
  if (country.researching === techId) return state;

  const next: CountryPolitics = structuredClone(country);
  next.researching = techId;
  next.researchProgress = 0;
  return withCountry(state, tag, next);
}
