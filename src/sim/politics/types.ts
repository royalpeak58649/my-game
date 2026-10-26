// Politics types. Definitions (Def) are static data from src/data/politics; everything else
// lives in GameState.politics and changes every tick.

import type { PopTypeId, WealthTier } from '../economy/types';

export type IgId =
  | 'landowners' | 'industrialists' | 'clergy' | 'army'
  | 'intelligentsia' | 'merchants' | 'peasantry' | 'workers';

export interface IgDef {
  id: IgId;
  name: string;
  description: string;
  color: string;
}

export type LawGroupId =
  | 'governance' | 'franchise' | 'church' | 'trade' | 'labor' | 'taxation' | 'education' | 'press';

/** Country-wide modifiers. Missing keys mean "no change" (1 for multipliers, 0 for additions). */
export interface Modifiers {
  /** Multiplier on research points. */
  researchMult?: number;
  /** Share of gross income tax that actually reaches the treasury. */
  taxEfficiency?: number;
  /** Multiplier on UPKEEP_PER_CAPITA. */
  upkeepMult?: number;
  /** Replaces WORLD_TRADE_SHARE for this country's market (0..1). Last law wins; techs add tradeShareAdd. */
  tradeShare?: number;
  tradeShareAdd?: number;
  /** Multiplier on hire rates for every job except farmers (serfdom ties people to the land). */
  hireRateMult?: number;
  /** Multiplier on all wages. */
  wageMult?: number;
  /** Multiplier on building output (all buildings). */
  outputMult?: number;
  /** Multiplier on industry building output only. */
  industryOutputMult?: number;
  /** Added to legitimacy (points). */
  legitimacyAdd?: number;
  /** Multiplier on army strength. */
  armyQualityMult?: number;
  /** Multiplier on movement radicalism growth. */
  radicalismMult?: number;
}

export interface LawDef {
  id: string;
  group: LawGroupId;
  name: string;
  description: string;
  /** Tech required before this law can be enacted. */
  requiresTech?: string;
  modifiers: Modifiers;
  /** Political strength per person of each wealth tier (franchise laws only). */
  tierWeights?: Record<WealthTier, number>;
  /** Multiplier on specific interest groups' clout (governance laws only). */
  igCloutMult?: Partial<Record<IgId, number>>;
}

export interface LawGroupDef {
  id: LawGroupId;
  name: string;
  laws: string[]; // LawDef ids, from most traditional to most progressive
}

export type TechCategory = 'production' | 'society' | 'military';

export interface TechDef {
  id: string;
  name: string;
  category: TechCategory;
  cost: number; // research points
  requires: string[];
  description: string;
  /** Modifiers granted permanently once researched. */
  modifiers?: Modifiers;
}

// ----------------------------------------------------------------- dynamic

export interface IgState {
  /** Share of political strength, 0..1 (sums to 1 per country). */
  clout: number;
  /** -10..+10. */
  approval: number;
}

export interface Enactment {
  law: string;
  /** 0..1 */
  progress: number;
}

export interface Movement {
  ig: IgId;
  /** The law the movement demands. */
  law: string;
  /** 0..100 */
  radicalism: number;
}

export interface CountryPolitics {
  laws: Record<LawGroupId, string>;
  government: IgId[];
  /** 0..100 */
  legitimacy: number;
  igs: Record<IgId, IgState>;
  enacting: Enactment | null;
  movements: Movement[];
  techs: string[];
  researching: string | null;
  researchProgress: number;
  /** Produced last week. */
  researchPoints: number;
  /** Combined effect of laws, techs, unrest; recomputed every tick, read by the economy. */
  modifiers: Modifiers;
}

export interface PoliticsState {
  countries: Record<string, CountryPolitics>;
}

/** How each pop type's political strength is split between interest groups (rows sum to 1). */
export type PopAffinity = Record<PopTypeId, Partial<Record<IgId, number>>>;
