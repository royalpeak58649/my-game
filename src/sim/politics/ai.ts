// Step 8 of the politics tick: the AI rules for non-player countries (government, research,
// laws). See docs/POLITICS.md, "Weekly tick", step 8. Pure: the functions mutate the
// CountryPolitics object they are given, which callers own (a fresh copy).

import { IG_IDS } from '../../data/politics/igs';
import { LAWS, LAW_GROUPS, LAW_GROUP_IDS } from '../../data/politics/laws';
import { TECHS } from '../../data/politics/techs';
import {
  AI_GOVERNMENT_CLOUT, AI_MAX_GOVERNMENT, AI_MIN_SUPPORT, ANGRY_APPROVAL,
  fin, legitimacyOf, stance, techAvailable, techKnown,
} from './internal';
import type { CountryPolitics, IgId, Modifiers } from './types';

/**
 * Step 8a: forms a government from the most powerful IGs, skipping angry ones, until it holds
 * AI_GOVERNMENT_CLOUT of the clout or has AI_MAX_GOVERNMENT members. Returns the new government.
 */
export function aiGovernment(country: CountryPolitics): IgId[] {
  const order = [...IG_IDS].sort((a, b) => {
    const diff = fin(country.igs[b]?.clout) - fin(country.igs[a]?.clout);
    return diff !== 0 ? diff : a < b ? -1 : a > b ? 1 : 0;
  });

  const government: IgId[] = [];
  let clout = 0;
  for (const ig of order) {
    if (government.length >= AI_MAX_GOVERNMENT) break;
    if (fin(country.igs[ig]?.approval) <= ANGRY_APPROVAL) continue;
    government.push(ig);
    clout += fin(country.igs[ig]?.clout);
    if (clout >= AI_GOVERNMENT_CLOUT) break;
  }
  return government;
}

/** Applies step 8a in place and recomputes legitimacy. */
export function applyAiGovernment(country: CountryPolitics, modifiers: Modifiers): void {
  country.government = aiGovernment(country);
  country.legitimacy = legitimacyOf(country, modifiers);
}

/** Step 8b: the cheapest tech whose prerequisites are known (ties by id), or null. */
export function aiResearchPick(country: CountryPolitics): string | null {
  let best: string | null = null;
  let bestCost = Infinity;
  for (const techId of Object.keys(TECHS).sort()) {
    if (!techAvailable(country.techs, techId)) continue;
    const cost = TECHS[techId]?.cost ?? Infinity;
    if (cost < bestCost) {
      best = techId;
      bestCost = cost;
    }
  }
  return best;
}

/** Applies step 8b in place: starts researching when nothing is being researched. */
export function applyAiResearch(country: CountryPolitics): void {
  if (country.researching !== null) return;
  const pick = aiResearchPick(country);
  if (pick === null) return;
  country.researching = pick;
  country.researchProgress = 0;
}

/** Laws the country may start enacting now: nothing in progress, not in force, tech known. */
export function startableLaws(country: CountryPolitics): string[] {
  if (country.enacting) return [];
  const out: string[] = [];
  for (const group of LAW_GROUP_IDS) {
    for (const lawId of LAW_GROUPS[group].laws) {
      if (lawId === country.laws[group]) continue;
      if (!techKnown(country.techs, lawId)) continue;
      out.push(lawId);
    }
  }
  return out;
}

/** Support of the government for `lawId`: Σ_{i in government} clout_i × stance(i, law). */
export function governmentSupport(country: CountryPolitics, lawId: string): number {
  let score = 0;
  for (const ig of country.government) score += fin(country.igs[ig]?.clout) * stance(ig, lawId);
  return score;
}

/** Step 8c: the law the government most wants, or null when none is worth starting. */
export function aiLawPick(country: CountryPolitics): string | null {
  if (country.enacting) return null;
  let best: string | null = null;
  let bestScore = AI_MIN_SUPPORT;
  for (const lawId of startableLaws(country)) {
    if (!LAWS[lawId]) continue;
    const score = governmentSupport(country, lawId);
    if (score > bestScore) {
      best = lawId;
      bestScore = score;
    }
  }
  return best;
}

/** Applies step 8c in place: starts enacting the government's favourite law. */
export function applyAiLaws(country: CountryPolitics): void {
  const pick = aiLawPick(country);
  if (pick === null) return;
  country.enacting = { law: pick, progress: 0 };
}
