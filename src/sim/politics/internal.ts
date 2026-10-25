// Internal helpers shared by init.ts, tick.ts, ai.ts, commands.ts and queries.ts.
// Not part of the public politics API: everything here is pure and works on plain values.

import { POP_TYPES, POP_TYPE_IDS } from '../../data/economy/pops';
import { IG_IDS, POP_AFFINITY, STANCES } from '../../data/politics/igs';
import { LAWS, LAW_GROUPS, LAW_GROUP_IDS } from '../../data/politics/laws';
import { RESEARCH_BASE, RESEARCH_PER_PERSON, TECHS } from '../../data/politics/techs';
import type { PopTypeId, WealthTier } from '../economy/types';
import type { GameState } from '../types';
import type {
  CountryPolitics, IgId, IgState, LawGroupId, Modifiers, Movement,
} from './types';

/** Approval at or below this is "angry". */
export const ANGRY_APPROVAL = -5;
/** Approval at or above this is "content". */
export const CONTENT_APPROVAL = 5;
/** Clout an IG needs before it may organise a movement. */
export const MOVEMENT_MIN_CLOUT = 0.05;
/** Radicalism at which a movement counts against legitimacy. */
export const MOVEMENT_LEGITIMACY_RADICALISM = 50;
/** Radicalism a movement needs to demand a law (stance gain over the current law). */
export const MOVEMENT_MIN_GAIN = 2;
/** Approval lost by an IG that leaves the government. */
export const LEAVE_GOVERNMENT_APPROVAL = 3;
/** Weeks between AI government reshuffles. */
export const GOVERNMENT_INTERVAL = 26;
/** Weeks between AI law changes. */
export const LAW_INTERVAL = 52;
/** Largest government the AI forms. */
export const AI_MAX_GOVERNMENT = 3;
/** Clout the AI government aims for. */
export const AI_GOVERNMENT_CLOUT = 0.5;
/** Minimum support the AI needs before it starts enacting a law. */
export const AI_MIN_SUPPORT = 0.5;
/** Income tax rate above which owners resent the taxes. */
export const TAX_ANNOYANCE_RATE = 0.15;
/** IGs that resent income taxes. */
export const TAX_SENSITIVE: readonly IgId[] = ['landowners', 'industrialists', 'merchants'];

const TIERS: readonly WealthTier[] = ['subsistence', 'lower', 'middle', 'upper'];

export function clamp(x: number, lo: number, hi: number): number {
  if (!Number.isFinite(x)) return lo;
  return x < lo ? lo : x > hi ? hi : x;
}

/** Finite number or `fallback`. */
export function fin(x: number | undefined, fallback = 0): number {
  return x !== undefined && Number.isFinite(x) ? x : fallback;
}

/** Stance of IG `ig` to law `lawId` (−2..+2, 0 when unlisted). */
export function stance(ig: IgId, lawId: string): number {
  return STANCES[ig][lawId] ?? 0;
}

/** The law in force in `group`. */
export function currentLaw(laws: Record<LawGroupId, string>, group: LawGroupId): string {
  return laws[group];
}

/** Group of a law id, or undefined for unknown ids. */
export function lawGroup(lawId: string): LawGroupId | undefined {
  return LAWS[lawId]?.group;
}

/** True if the law's required tech is known (laws without a requirement are always allowed). */
export function techKnown(techs: readonly string[], lawId: string): boolean {
  const requires = LAWS[lawId]?.requiresTech;
  return requires === undefined || techs.includes(requires);
}

/** True if every prerequisite of `techId` is known. */
export function prerequisitesKnown(techs: readonly string[], techId: string): boolean {
  const def = TECHS[techId];
  if (!def) return false;
  return def.requires.every((r) => techs.includes(r));
}

/** True if `techId` may be researched now: it exists, is unknown and its prerequisites are known. */
export function techAvailable(techs: readonly string[], techId: string): boolean {
  return TECHS[techId] !== undefined && !techs.includes(techId) && prerequisitesKnown(techs, techId);
}

/** Tier weights of the franchise law in force (all 1 when the law has none). */
export function tierWeights(laws: Record<LawGroupId, string>): Record<WealthTier, number> {
  const weights = LAWS[laws.franchise]?.tierWeights;
  const out = {} as Record<WealthTier, number>;
  for (const tier of TIERS) out[tier] = fin(weights?.[tier], 1);
  return out;
}

/** Clout multiplier of the governance law in force (1 for unlisted IGs). */
export function igCloutMult(laws: Record<LawGroupId, string>, ig: IgId): number {
  return fin(LAWS[laws.governance]?.igCloutMult?.[ig], 1);
}

/** Political strength of every pop type in one state, by IG. */
export interface StateStrength {
  /** Σ_popTypes pops × tierWeight × affinity, by IG. */
  strength: Record<IgId, number>;
  /** Persons of each pop type. */
  pops: Record<PopTypeId, number>;
  /** Persons of each pop type belonging to each IG (pops × affinity). */
  members: Record<IgId, Record<PopTypeId, number>>;
  /** Σ_popTypes pops × affinity, by IG. */
  membersTotal: Record<IgId, number>;
  /** Σ_popTypes pops × affinity × sol, by IG. */
  solWeighted: Record<IgId, number>;
}

function emptyByIg(): Record<IgId, number> {
  const out = {} as Record<IgId, number>;
  for (const ig of IG_IDS) out[ig] = 0;
  return out;
}

function emptyByPop(): Record<PopTypeId, number> {
  const out = {} as Record<PopTypeId, number>;
  for (const id of POP_TYPE_IDS) out[id] = 0;
  return out;
}

/** Strength, members and living standards of one state's pops, split by IG. */
export function stateStrength(
  pops: Record<PopTypeId, number>,
  sol: Record<PopTypeId, number>,
  weights: Record<WealthTier, number>,
): StateStrength {
  const strength = emptyByIg();
  const membersTotal = emptyByIg();
  const solWeighted = emptyByIg();
  const members = {} as Record<IgId, Record<PopTypeId, number>>;
  for (const ig of IG_IDS) members[ig] = emptyByPop();
  const popCounts = emptyByPop();

  for (const pop of POP_TYPE_IDS) {
    const count = Math.max(0, fin(pops[pop]));
    popCounts[pop] = count;
    if (count <= 0) continue;
    const weight = fin(weights[POP_TYPES[pop].tier], 1);
    const solValue = fin(sol[pop]);
    const affinity = POP_AFFINITY[pop];
    for (const ig of IG_IDS) {
      const share = fin(affinity[ig]);
      if (share <= 0) continue;
      const persons = count * share;
      strength[ig] += persons * weight;
      members[ig][pop] = persons;
      membersTotal[ig] += persons;
      solWeighted[ig] += persons * solValue;
    }
  }

  return { strength, pops: popCounts, members, membersTotal, solWeighted };
}

/** Clout shares (0..1, summing to 1) from raw strengths; all 0 when the total is 0. */
export function cloutShares(strength: Record<IgId, number>): Record<IgId, number> {
  const clout = emptyByIg();
  let total = 0;
  for (const ig of IG_IDS) {
    const s = Math.max(0, fin(strength[ig]));
    strength[ig] = s;
    total += s;
  }
  if (!(total > 0)) return clout;
  for (const ig of IG_IDS) clout[ig] = strength[ig] / total;
  return clout;
}

/** Σ_groups stance(ig, current law of the group). */
export function lawStanceSum(ig: IgId, laws: Record<LawGroupId, string>): number {
  let sum = 0;
  for (const group of LAW_GROUP_IDS) sum += stance(ig, laws[group]);
  return sum;
}

/** Step 2 approval target for one IG (before smoothing, clamped to ±10). */
export function approvalTarget(
  ig: IgId,
  country: CountryPolitics,
  clout: number,
  memberSol: number,
  incomeTaxRate: number,
): number {
  let target = clamp(0.75 * lawStanceSum(ig, country.laws), -6, 6);

  if (country.government.includes(ig)) target += 2;
  else if (clout >= 0.15) target -= 1;

  target += clamp((memberSol - 15) / 2.5, -3, 3);

  if (TAX_SENSITIVE.includes(ig) && incomeTaxRate > TAX_ANNOYANCE_RATE) {
    target -= (incomeTaxRate - TAX_ANNOYANCE_RATE) * 20;
  }

  if (country.enacting) {
    const s = stance(ig, country.enacting.law);
    if (s < 0) target -= 2;
    else if (s > 0) target += 1;
  }

  return clamp(target, -10, 10);
}

/** Step 3 legitimacy from the current clout, approvals and movements. */
export function legitimacyOf(country: CountryPolitics, modifiers: Modifiers): number {
  let governmentClout = 0;
  let angry = 0;
  for (const ig of country.government) {
    governmentClout += fin(country.igs[ig]?.clout);
    if (fin(country.igs[ig]?.approval) <= ANGRY_APPROVAL) angry += 1;
  }
  const unrest = country.movements.filter((m) => m.radicalism >= MOVEMENT_LEGITIMACY_RADICALISM).length;
  const raw = 100 * governmentClout + fin(modifiers.legitimacyAdd) - 10 * angry - 10 * unrest;
  return clamp(raw, 0, 100);
}

/** Step 4 support for enacting `lawId`: Σ clout × stance × (in government ? 2 : 1) / 2. */
export function enactmentSupport(country: CountryPolitics, lawId: string): number {
  let support = 0;
  for (const ig of IG_IDS) {
    const clout = fin(country.igs[ig]?.clout);
    if (clout <= 0) continue;
    const factor = country.government.includes(ig) ? 2 : 1;
    support += (clout * stance(ig, lawId) * factor) / 2;
  }
  return support;
}

/** Step 4 speed factor of an enactment. */
export function enactmentSpeed(support: number, legitimacy: number): number {
  return clamp(0.5 + support, 0, 2) * clamp(legitimacy / 50, 0.5, 1.5);
}

/**
 * The law IG `ig` would demand: the law of another group with the largest stance gain over the
 * law in force there, needing a gain of at least MOVEMENT_MIN_GAIN (ties by law id).
 */
export function demandedLaw(ig: IgId, laws: Record<LawGroupId, string>): string | null {
  let best: string | null = null;
  let bestGain = MOVEMENT_MIN_GAIN - 1;
  for (const group of LAW_GROUP_IDS) {
    const current = laws[group];
    for (const lawId of LAW_GROUPS[group].laws) {
      if (lawId === current) continue;
      const gain = stance(ig, lawId) - stance(ig, current);
      if (gain < MOVEMENT_MIN_GAIN) continue;
      if (gain > bestGain || (gain === bestGain && best !== null && lawId < best)) {
        best = lawId;
        bestGain = gain;
      }
    }
  }
  return best;
}

/** Step 5: the movements of one country after this week. */
export function nextMovements(country: CountryPolitics, radicalismMult: number): Movement[] {
  const existing = new Map<IgId, Movement>();
  for (const m of country.movements) existing.set(m.ig, m);

  const out: Movement[] = [];
  for (const ig of IG_IDS) {
    const state = country.igs[ig];
    const approval = fin(state?.approval);
    const clout = fin(state?.clout);
    const current = existing.get(ig);

    if (approval <= ANGRY_APPROVAL && clout >= MOVEMENT_MIN_CLOUT) {
      const law = demandedLaw(ig, country.laws);
      if (law === null) continue;
      const radicalism = current && current.law === law ? fin(current.radicalism) : 0;
      const growth = (-approval - 4) * clout * 4 * radicalismMult;
      out.push({ ig, law, radicalism: clamp(radicalism + growth, 0, 100) });
      continue;
    }

    if (!current) continue;
    const radicalism = clamp(fin(current.radicalism) - 2, 0, 100);
    if (radicalism > 0) out.push({ ig, law: current.law, radicalism });
  }
  return out;
}

/** Research points produced this week by a country's educated pops. */
export function researchPointsOf(
  educated: { clerks: number; bureaucrats: number; machinists: number },
  researchMult: number,
): number {
  const people = educated.clerks + 0.5 * educated.bureaucrats + 0.5 * educated.machinists;
  return (RESEARCH_BASE + RESEARCH_PER_PERSON * people) * researchMult;
}

/** Step 6: adds this week's research points and finishes the tech when it is paid for. */
export function advanceResearch(country: CountryPolitics, points: number): void {
  country.researchPoints = points;
  const techId = country.researching;
  if (techId === null) return;
  const def = TECHS[techId];
  if (!def) {
    country.researching = null;
    country.researchProgress = 0;
    return;
  }
  const progress = Math.max(0, fin(country.researchProgress)) + points;
  if (progress >= def.cost) {
    if (!country.techs.includes(techId)) country.techs = [...country.techs, techId];
    country.researching = null;
    country.researchProgress = 0;
    return;
  }
  country.researchProgress = progress;
}

/** Empty IG states (clout 0, approval 0), keyed in IG_IDS order. */
export function emptyIgs(): Record<IgId, IgState> {
  const igs = {} as Record<IgId, IgState>;
  for (const ig of IG_IDS) igs[ig] = { clout: 0, approval: 0 };
  return igs;
}

/** States of `state.economy.states` grouped by owner, in sorted state id order. */
export function statesByOwner(state: GameState): Map<string, string[]> {
  const byOwner = new Map<string, string[]>();
  for (const stateId of Object.keys(state.economy.states).sort()) {
    const owner = state.states[stateId]?.owner;
    if (!owner) continue;
    const list = byOwner.get(owner);
    if (list) list.push(stateId);
    else byOwner.set(owner, [stateId]);
  }
  return byOwner;
}

/** Country tags that own at least one state with an economy, sorted. */
export function countryTags(state: GameState): string[] {
  return [...statesByOwner(state).keys()].sort();
}
