// Shared, per-tick scratch data for the weekly economy tick.
// Everything here is derived from the (already deep-copied) economy state and is
// thrown away at the end of the tick.

import { BUILDINGS } from '../../data/economy/buildings';
import { GOOD_IDS } from '../../data/economy/goods';
import { POP_TYPE_IDS } from '../../data/economy/pops';
import type { GameState } from '../types';
import type {
  BuildingDef,
  BuildingInstance,
  CountryEconomy,
  EconomyState,
  GoodId,
  Market,
  PopTypeId,
  ProductionMethodDef,
  StateEconomy,
} from './types';

export const GOOD_COUNT = GOOD_IDS.length;
export const POP_COUNT = POP_TYPE_IDS.length;

/** Index of a good in GOOD_IDS (== index in every per-good array). */
export const GOOD_INDEX: Record<GoodId, number> = (() => {
  const map = {} as Record<GoodId, number>;
  for (let i = 0; i < GOOD_IDS.length; i++) map[GOOD_IDS[i]] = i;
  return map;
})();

/** Index of a pop type in POP_TYPE_IDS (== index in every per-pop array). */
export const POP_INDEX: Record<PopTypeId, number> = (() => {
  const map = {} as Record<PopTypeId, number>;
  for (let i = 0; i < POP_TYPE_IDS.length; i++) map[POP_TYPE_IDS[i]] = i;
  return map;
})();

/** A building instance together with its static definition and resolved method. */
export interface BuildingRef {
  inst: BuildingInstance;
  def: BuildingDef;
  method: ProductionMethodDef;
}

/** A state that takes part in the economy this tick. */
export interface StateRef {
  id: string;
  owner: string;
  eco: StateEconomy;
  market: Market;
  country: CountryEconomy;
  buildings: BuildingRef[];
}

export interface TickContext {
  eco: EconomyState;
  states: StateRef[];
  /** Per state: wages paid to each pop type this week. */
  wages: Float64Array[];
  /** Per state: dividends paid to each pop type this week. */
  dividends: Float64Array[];
  /** Per state: income tax collected this week. */
  taxes: Float64Array;
  /** Per state: construction points produced this week. */
  construction: Float64Array;
  /** Per state: government building costs (inputs + wages) this week. */
  govCosts: Float64Array;
  /** Per state: total population at the start of the tick (for growth). */
  population: Float64Array;
  /** Per state: population-weighted standard of living at the start of the tick. */
  solWeighted: Float64Array;
  /** Per state: true when the state's government buildings must run at half staffing. */
  austerity: boolean[];
  /** Per state: true when the state's government buildings were fired this week. */
  fired: boolean[];
  /** Per state: construction points still available this week. */
  pointsLeft: Float64Array;
}

/** Sorted state ids, cached per `economy.states` object so the sort happens once. */
const sortedStateIdsCache = new WeakMap<Record<string, StateEconomy>, string[]>();

export function sortedStateIds(states: Record<string, StateEconomy>): string[] {
  const cached = sortedStateIdsCache.get(states);
  if (cached) return cached;
  const ids = Object.keys(states).sort();
  sortedStateIdsCache.set(states, ids);
  return ids;
}

/** Sorted country tags, cached per `economy.markets` object. */
const sortedMarketTagsCache = new WeakMap<Record<string, Market>, string[]>();

export function sortedMarketTags(markets: Record<string, Market>): string[] {
  const cached = sortedMarketTagsCache.get(markets);
  if (cached) return cached;
  const tags = Object.keys(markets).sort();
  sortedMarketTagsCache.set(markets, tags);
  return tags;
}

/** Sorted building ids of a state, cached per `state.buildings` object. */
const sortedBuildingIdsCache = new WeakMap<Record<string, BuildingInstance>, string[]>();

export function sortedBuildingIds(buildings: Record<string, BuildingInstance>): string[] {
  const cached = sortedBuildingIdsCache.get(buildings);
  if (cached) return cached;
  const ids = Object.keys(buildings).sort();
  sortedBuildingIdsCache.set(buildings, ids);
  return ids;
}

/** Resolves the production method of an instance, falling back to the default one. */
export function methodOf(def: BuildingDef, inst: BuildingInstance): ProductionMethodDef {
  for (let i = 0; i < def.methods.length; i++) {
    if (def.methods[i].id === inst.method) return def.methods[i];
  }
  return def.methods[0];
}

/** Builds the per-tick context: the list of participating states and their buildings. */
export function createContext(state: GameState): TickContext {
  const eco = state.economy;
  const ids = sortedStateIds(eco.states);
  const states: StateRef[] = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const def = state.states[id];
    if (!def || !def.owner) continue;
    const owner = def.owner;
    const ecoState = eco.states[id];
    const market = eco.markets[owner];
    const country = eco.countries[owner];
    if (!ecoState || !market || !country) continue;

    const buildings: BuildingRef[] = [];
    const buildingIds = sortedBuildingIds(ecoState.buildings);
    for (let b = 0; b < buildingIds.length; b++) {
      const inst = ecoState.buildings[buildingIds[b]];
      const bDef = BUILDINGS[inst.id];
      if (!bDef) continue;
      buildings.push({ inst, def: bDef, method: methodOf(bDef, inst) });
    }
    states.push({ id, owner, eco: ecoState, market, country, buildings });
  }

  const n = states.length;
  const ctx: TickContext = {
    eco,
    states,
    wages: [],
    dividends: [],
    taxes: new Float64Array(n),
    construction: new Float64Array(n),
    govCosts: new Float64Array(n),
    population: new Float64Array(n),
    solWeighted: new Float64Array(n),
    austerity: new Array<boolean>(n).fill(false),
    fired: new Array<boolean>(n).fill(false),
    pointsLeft: new Float64Array(n),
  };
  for (let i = 0; i < n; i++) {
    ctx.wages.push(new Float64Array(POP_COUNT));
    ctx.dividends.push(new Float64Array(POP_COUNT));
    const pops = states[i].eco.pops;
    let total = 0;
    let weighted = 0;
    for (let p = 0; p < POP_COUNT; p++) {
      const count = pops[POP_TYPE_IDS[p]] ?? 0;
      total += count;
      weighted += count * (states[i].eco.sol[POP_TYPE_IDS[p]] ?? 0);
    }
    ctx.population[i] = total;
    ctx.solWeighted[i] = weighted;
  }
  return ctx;
}

/** Finite-number guard: returns `fallback` for NaN / ±Infinity. */
export function safe(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

/** Clamps a finite number into [lo, hi]. */
export function clamp(value: number, lo: number, hi: number): number {
  if (!Number.isFinite(value)) return lo;
  return value < lo ? lo : value > hi ? hi : value;
}
