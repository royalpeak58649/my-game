// Step 5 of the diplomacy tick: the AI rules for non-player countries.
// See docs/WAR.md, "Diplomacy", "Weekly", step 5.
//
// Pure: the functions mutate the DiplomacyState they are given, which callers own (a fresh copy).
// Countries are visited in sorted tag order, so the result is deterministic.

import { ALLIANCE_MIN_RELATIONS } from '../../data/diplomacy/rules';
import type { GameState } from '../types';
import {
  addAlliance, areAllied, existingCountries, fin, freeInfluenceOf, isGreatPower, isRivalOf,
  neighboursOf, relationsOf, removeAlliance, removeRival, rivalsEitherWay, stopImproving, tagParity,
} from './internal';
import { allianceAcceptance, borders } from './queries';
import { bumpRelations } from './steps';
import type { DiplomacyState } from './types';

/** Weeks between AI diplomacy turns for one country. */
export const AI_DIPLOMACY_INTERVAL = 26;
/** Relations an ally must fall below before the AI improves them. */
export const AI_ALLY_IMPROVE_BELOW = 60;
/** Relations lost when an alliance is broken. */
export const BREAK_ALLIANCE_RELATIONS = -20;
/** Most rivals a country may have. */
export const MAX_RIVALS = 3;

/** True if this country's AI acts this week. */
export function aiActsThisWeek(tag: string, tickCount: number): boolean {
  return (tickCount + tagParity(tag)) % AI_DIPLOMACY_INTERVAL === 0;
}

/** Prestige of a country in this diplomacy state (0 when unranked). */
function prestige(diplomacy: DiplomacyState, tag: string): number {
  return fin(diplomacy.countries[tag]?.prestige);
}

/** Sorts tags by prestige desc, ties by tag. */
function byPrestige(diplomacy: DiplomacyState, tags: readonly string[]): string[] {
  return [...tags].sort((a, b) => {
    const diff = prestige(diplomacy, b) - prestige(diplomacy, a);
    return diff !== 0 ? diff : a < b ? -1 : a > b ? 1 : 0;
  });
}

/** Sorts tags by relations asc, ties by tag. */
function byRelationsAsc(state: GameState, tag: string, tags: readonly string[]): string[] {
  return [...tags].sort((a, b) => {
    const diff = relationsOf(state, tag, a) - relationsOf(state, tag, b);
    return diff !== 0 ? diff : a < b ? -1 : a > b ? 1 : 0;
  });
}

/** Step 5a: drops alliances with negative relations or with a rival. */
function dropBadAlliances(state: GameState, diplomacy: DiplomacyState, tag: string): void {
  for (const key of [...diplomacy.alliances].sort()) {
    const [a, b] = key.split('|');
    if (a !== tag && b !== tag) continue;
    const other = a === tag ? b : a;
    if (other === undefined) continue;
    if (relationsOf(state, tag, other) < 0 || rivalsEitherWay(state, tag, other)) {
      removeAlliance(diplomacy, tag, other);
    }
  }
}

/** Step 5b: a great power without a rival picks one. */
function pickRival(state: GameState, diplomacy: DiplomacyState, tag: string): void {
  const country = diplomacy.countries[tag];
  if (!country) return;
  if (!isGreatPower(state, tag)) return;
  if (country.rivals.length > 0) return;

  const others = existingCountries(state).filter((t) => t !== tag && isGreatPower(state, t));
  if (others.length === 0) return;

  const bordering = others.filter((t) => borders(state, tag, t));
  const pool = bordering.length > 0 ? bordering : others;
  const pick = byRelationsAsc(state, tag, pool)[0];
  if (pick === undefined) return;

  country.rivals = [...country.rivals, pick].sort();
  // A new rival cannot stay an ally.
  if (areAllied(state, tag, pick)) removeAlliance(diplomacy, tag, pick);
}

/** Step 5c: proposes an alliance to the best candidate that accepts. */
function proposeAllianceAi(state: GameState, diplomacy: DiplomacyState, tag: string): void {
  const country = diplomacy.countries[tag];
  if (!country) return;
  if (freeInfluenceOf(diplomacy, tag) < 1) return;

  const candidates = existingCountries(state).filter((other) => {
    if (other === tag) return false;
    if (areAllied(state, tag, other)) return false;
    if (relationsOf(state, tag, other) < ALLIANCE_MIN_RELATIONS) return false;
    const sharesRival = country.rivals.some((r) => isRivalOf(state, other, r) || isRivalOf(state, r, other));
    return sharesRival || borders(state, tag, other);
  });

  for (const other of byRelationsAsc(state, tag, candidates).reverse()) {
    if (freeInfluenceOf(diplomacy, tag) < 1) return;
    if (freeInfluenceOf(diplomacy, other) < 1) continue;
    if (!allianceAcceptance(state, tag, other).accepts) continue;
    addAlliance(diplomacy, tag, other);
    return;
  }
}

/** Step 5d: fills free influence with improvements. */
function fillImprovements(state: GameState, diplomacy: DiplomacyState, tag: string): void {
  const country = diplomacy.countries[tag];
  if (!country) return;

  const candidates: string[] = [];
  const allies = byPrestige(
    diplomacy,
    existingCountries(state).filter(
      (other) => other !== tag && areAllied(state, tag, other) && relationsOf(state, tag, other) < AI_ALLY_IMPROVE_BELOW,
    ),
  );
  candidates.push(...allies);

  const neighbours = byPrestige(
    diplomacy,
    neighboursOf(state, tag).filter(
      (other) => other !== tag && !rivalsEitherWay(state, tag, other) && !candidates.includes(other),
    ),
  );
  candidates.push(...neighbours);

  for (const target of candidates) {
    if (freeInfluenceOf(diplomacy, tag) < 1) return;
    if (country.improving.includes(target)) continue;
    if (rivalsEitherWay(state, tag, target)) continue;
    country.improving = [...country.improving, target];
  }
}

/** Step 5 for one country. */
export function aiCountry(state: GameState, diplomacy: DiplomacyState, tag: string): void {
  if (!diplomacy.countries[tag]) return;
  dropBadAlliances(state, diplomacy, tag);
  pickRival(state, diplomacy, tag);
  proposeAllianceAi(state, diplomacy, tag);
  fillImprovements(state, diplomacy, tag);
}

/** Step 5: every AI country whose turn it is, in sorted tag order. */
export function aiStep(state: GameState, diplomacy: DiplomacyState): void {
  for (const tag of existingCountries(state)) {
    if (state.player !== null && state.player === tag) continue;
    if (!aiActsThisWeek(tag, state.tickCount)) continue;
    aiCountry(state, diplomacy, tag);
  }
}

/** Breaks an alliance and applies the relations penalty (shared with commands.ts). */
export function breakAllianceInPlace(diplomacy: DiplomacyState, a: string, b: string): void {
  removeAlliance(diplomacy, a, b);
  bumpRelations(diplomacy, a, b, BREAK_ALLIANCE_RELATIONS);
}

/** Removes a rival (shared with commands.ts). */
export function removeRivalInPlace(diplomacy: DiplomacyState, tag: string, target: string): void {
  const country = diplomacy.countries[tag];
  if (!country) return;
  removeRival(country, target);
}

/** Stops improving relations with `target` (shared with commands.ts). */
export function stopImprovingInPlace(diplomacy: DiplomacyState, tag: string, target: string): void {
  const country = diplomacy.countries[tag];
  if (!country) return;
  stopImproving(country, target);
}
