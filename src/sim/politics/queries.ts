// Read-only queries for the UI — see docs/POLITICS.md, "Queries".
//
// Pure and cheap: nothing is copied and nothing is mutated. Every query returns a neutral
// result (undefined, 0 or an empty list) for a tag without politics.

import { POP_TYPE_IDS } from '../../data/economy/pops';
import { IG_IDS, POP_AFFINITY } from '../../data/politics/igs';
import { LAWS, LAW_GROUPS, LAW_GROUP_IDS } from '../../data/politics/laws';
import { TECHS, TECH_IDS } from '../../data/politics/techs';
import type { GameState } from '../types';
import {
  enactmentSupport, fin, prerequisitesKnown, statesByOwner, techAvailable, techKnown,
} from './internal';
import type { CountryPolitics, IgId, LawDef, LawGroupId, TechDef } from './types';

/** One law of a group, as offered to the player. */
export interface LawOption {
  law: LawDef;
  inForce: boolean;
  allowed: boolean;
  /** Why the law cannot be enacted now (absent when `allowed`). */
  reason?: string;
  /** Step 4 support value for enacting this law. */
  support: number;
}

/** One tech, as offered to the player. */
export interface TechOption {
  tech: TechDef;
  known: boolean;
  /** Unknown and every prerequisite known. */
  available: boolean;
  researching: boolean;
}

/** The country's politics, or undefined when `tag` has none. */
export function politicsOf(state: GameState, tag: string): CountryPolitics | undefined {
  return state.politics.countries[tag];
}

/** Step 4 support for enacting `lawId`: Σ clout × stance × (in government ? 2 : 1) / 2. */
export function lawSupport(state: GameState, tag: string, lawId: string): number {
  const country = politicsOf(state, tag);
  if (!country) return 0;
  return enactmentSupport(country, lawId);
}

/** Why `lawId` cannot be started now, or undefined when it can. */
function lawBlockReason(country: CountryPolitics, lawId: string): string | undefined {
  const def = LAWS[lawId];
  if (!def) return 'Unknown law';
  if (country.laws[def.group] === lawId) return 'Already in force';
  if (country.enacting) return 'Another law is being enacted';
  if (!techKnown(country.techs, lawId)) {
    const tech = def.requiresTech !== undefined ? TECHS[def.requiresTech] : undefined;
    return `Requires ${tech?.name ?? def.requiresTech ?? 'a technology'}`;
  }
  return undefined;
}

/** Every law of `group` in the order listed by LAW_GROUPS, with its status and support. */
export function lawOptions(state: GameState, tag: string, group: LawGroupId): LawOption[] {
  const country = politicsOf(state, tag);
  const groupDef = LAW_GROUPS[group];
  if (!country || !groupDef) return [];

  const out: LawOption[] = [];
  for (const lawId of groupDef.laws) {
    const law = LAWS[lawId];
    if (!law) continue;
    const reason = lawBlockReason(country, lawId);
    const option: LawOption = {
      law,
      inForce: country.laws[group] === lawId,
      allowed: reason === undefined,
      support: enactmentSupport(country, lawId),
    };
    if (reason !== undefined) option.reason = reason;
    out.push(option);
  }
  return out;
}

/** Every tech in TECH_IDS order, with its status for this country. */
export function availableTechs(state: GameState, tag: string): TechOption[] {
  const country = politicsOf(state, tag);
  if (!country) return [];

  const out: TechOption[] = [];
  for (const techId of TECH_IDS) {
    const tech = TECHS[techId];
    if (!tech) continue;
    out.push({
      tech,
      known: country.techs.includes(techId),
      available: techAvailable(country.techs, techId),
      researching: country.researching === techId,
    });
  }
  return out;
}

/** Persons belonging to `ig`: Σ over the country's states of pops × POP_AFFINITY. */
export function igMembers(state: GameState, tag: string, ig: IgId): number {
  if (!IG_IDS.includes(ig)) return 0;
  const stateIds = statesByOwner(state).get(tag);
  if (!stateIds) return 0;

  let members = 0;
  for (const stateId of stateIds) {
    const economy = state.economy.states[stateId];
    if (!economy) continue;
    for (const pop of POP_TYPE_IDS) {
      const count = Math.max(0, fin(economy.pops[pop]));
      if (count <= 0) continue;
      const share = fin(POP_AFFINITY[pop][ig]);
      if (share <= 0) continue;
      members += count * share;
    }
  }
  return members;
}

/** Re-exported so callers can iterate groups in the canonical order. */
export { LAW_GROUP_IDS };

/** True if every prerequisite of `techId` is known to `tag` (helper for the UI). */
export function techPrerequisitesKnown(state: GameState, tag: string, techId: string): boolean {
  const country = politicsOf(state, tag);
  if (!country) return false;
  return prerequisitesKnown(country.techs, techId);
}
