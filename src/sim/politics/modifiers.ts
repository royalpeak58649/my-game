// Step 0 of the politics tick: combine the modifiers of the laws in force, the known techs and
// last week's movements into one Modifiers object (see docs/POLITICS.md, "Weekly tick", step 0).

import { LAWS } from '../../data/politics/laws';
import { TECHS } from '../../data/politics/techs';
import type { LawGroupId, Modifiers, Movement } from './types';

/** Multiplicative fields: every source multiplies into the result. */
const MULTIPLICATIVE = [
  'researchMult', 'taxEfficiency', 'upkeepMult', 'hireRateMult', 'wageMult',
  'outputMult', 'industryOutputMult', 'radicalismMult',
] as const;

type MultiplicativeKey = (typeof MULTIPLICATIVE)[number];

/** Additive fields: every source adds into the result. */
const ADDITIVE = ['legitimacyAdd', 'tradeShareAdd'] as const;

type AdditiveKey = (typeof ADDITIVE)[number];

/** Radicalism at which a movement makes the country ungovernable (output penalty). */
export const UNREST_RADICALISM = 100;
/** Output multiplier applied while any movement is at UNREST_RADICALISM. */
export const UNREST_OUTPUT_MULT = 0.9;

const MAX_TRADE_SHARE = 0.9;

function clamp(x: number, lo: number, hi: number): number {
  if (!Number.isFinite(x)) return lo;
  return x < lo ? lo : x > hi ? hi : x;
}

/** Laws in force, keyed by group. Unknown law ids are ignored. */
function lawModifiers(laws: Record<LawGroupId, string>): Modifiers[] {
  const out: Modifiers[] = [];
  for (const lawId of Object.values(laws)) {
    const def = LAWS[lawId];
    if (def) out.push(def.modifiers);
  }
  return out;
}

/** Modifiers of the known techs, in the order they are listed. */
function techModifiers(techs: readonly string[]): Modifiers[] {
  const out: Modifiers[] = [];
  for (const techId of techs) {
    const def = TECHS[techId];
    if (def?.modifiers) out.push(def.modifiers);
  }
  return out;
}

/**
 * Combines the modifiers of the laws in force, the known techs and last week's movements.
 * Multiplicative fields multiply (missing = 1), `legitimacyAdd` and `tradeShareAdd` add
 * (missing = 0). `tradeShare` comes from the trade law, then `tradeShareAdd` is folded in and
 * clamped to 0..0.9; `tradeShareAdd` is not part of the result. If any movement has
 * radicalism ≥ 100, `outputMult` is multiplied by 0.9.
 */
export function combineModifiers(
  laws: Record<LawGroupId, string>,
  techs: readonly string[],
  movements: readonly Movement[],
): Modifiers {
  const sources = [...lawModifiers(laws), ...techModifiers(techs)];

  const result: Modifiers = {};
  for (const key of MULTIPLICATIVE) {
    let value = 1;
    for (const source of sources) {
      const m = source[key];
      if (m !== undefined && Number.isFinite(m)) value *= m;
    }
    result[key] = value;
  }
  for (const key of ADDITIVE) {
    let value = 0;
    for (const source of sources) {
      const m = source[key];
      if (m !== undefined && Number.isFinite(m)) value += m;
    }
    result[key] = value;
  }

  // Trade share: the trade law sets it, techs add to it.
  let tradeShare = 0;
  const tradeLaw = LAWS[laws.trade];
  if (tradeLaw?.modifiers.tradeShare !== undefined && Number.isFinite(tradeLaw.modifiers.tradeShare)) {
    tradeShare = tradeLaw.modifiers.tradeShare;
  }
  tradeShare = clamp(tradeShare + (result.tradeShareAdd ?? 0), 0, MAX_TRADE_SHARE);
  result.tradeShare = tradeShare;
  delete result.tradeShareAdd;

  // Unrest: a movement at full radicalism hurts output.
  if (movements.some((m) => m.radicalism >= UNREST_RADICALISM)) {
    result.outputMult = (result.outputMult ?? 1) * UNREST_OUTPUT_MULT;
  }

  return result;
}

/** Reads one multiplicative field of a Modifiers object, defaulting to 1. */
export function mult(modifiers: Modifiers, key: MultiplicativeKey): number {
  const value = modifiers[key];
  return value !== undefined && Number.isFinite(value) ? value : 1;
}

/** Reads one additive field of a Modifiers object, defaulting to 0. */
export function add(modifiers: Modifiers, key: AdditiveKey): number {
  const value = modifiers[key];
  return value !== undefined && Number.isFinite(value) ? value : 0;
}
