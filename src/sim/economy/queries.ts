// Read-only helpers over the economy. Used by the UI and by commands.

import { BUILDINGS } from '../../data/economy/buildings';
import type { GameState } from '../types';
import type {
  BuildingDef,
  BuildingInstance,
  CountryEconomy,
  Market,
  PopTypeId,
  StateEconomy,
} from './types';

/** Buildings that share the `arable` resource cap. */
const ARABLE_SHARED = ['farm', 'ranch'];

export function stateEconomy(state: GameState, stateId: string): StateEconomy | undefined {
  return state.economy.states[stateId];
}

export function marketOf(state: GameState, tag: string): Market | undefined {
  return state.economy.markets[tag];
}

export function countryEconomy(state: GameState, tag: string): CountryEconomy | undefined {
  return state.economy.countries[tag];
}

export function totalPopulation(state: GameState, stateId: string): number {
  const economy = state.economy.states[stateId];
  if (!economy) return 0;
  let total = 0;
  for (const count of Object.values(economy.pops)) total += count;
  return total;
}

export function countryPopulation(state: GameState, tag: string): number {
  let total = 0;
  for (const [stateId, stateDef] of Object.entries(state.states)) {
    if (stateDef.owner !== tag) continue;
    total += totalPopulation(state, stateId);
  }
  return total;
}

/** Jobs offered by a building instance at its current level and method. */
export function buildingJobs(def: BuildingDef, inst: BuildingInstance): number {
  const method = def.methods.find((m) => m.id === inst.method) ?? def.methods[0];
  if (!method) return 0;
  let jobs = 0;
  for (const count of Object.values(method.employment)) jobs += inst.level * (count ?? 0);
  return jobs;
}

/** Share of the building's jobs that are filled (0..1, 0 when there are no jobs). */
export function buildingStaffing(inst: BuildingInstance, def: BuildingDef): number {
  const jobs = buildingJobs(def, inst);
  if (jobs <= 0) return 0;
  let employed = 0;
  for (const count of Object.values(inst.employed)) employed += count ?? 0;
  return employed / jobs;
}

/** Levels of `buildingId` already queued by the state's owner. */
function queuedLevels(state: GameState, stateId: string, buildingId: string): number {
  const tag = state.states[stateId]?.owner;
  if (!tag) return 0;
  const queue = state.economy.countries[tag]?.queue ?? [];
  let count = 0;
  for (const item of queue) {
    if (item.stateId === stateId && item.buildingId === buildingId) count += 1;
  }
  return count;
}

/**
 * Maximum levels of a building in a state, or null when uncapped.
 * Farms and ranches share the arable land: the cap for either is arable minus the other's levels.
 */
export function buildingCap(state: GameState, stateId: string, buildingId: string): number | null {
  const def = BUILDINGS[buildingId];
  if (!def) return null;
  const economy = state.economy.states[stateId];
  if (!economy) return null;

  if (def.resource) {
    const available = economy.resources[def.resource] ?? 0;
    if (!ARABLE_SHARED.includes(def.id)) return available;
    const other = ARABLE_SHARED.find((id) => id !== def.id);
    const otherLevel = other ? (economy.buildings[other]?.level ?? 0) : 0;
    return Math.max(0, available - otherLevel);
  }
  if (def.urban) return economy.urbanCap;
  return null;
}

export interface BuildableBuilding {
  def: BuildingDef;
  current: number;
  queued: number;
  cap: number | null;
}

/** Every building type with its current and queued levels in a state. */
export function buildableBuildings(state: GameState, tag: string, stateId: string): BuildableBuilding[] {
  const economy = state.economy.states[stateId];
  if (!economy || state.states[stateId]?.owner !== tag) return [];
  return Object.values(BUILDINGS).map((def) => ({
    def,
    current: economy.buildings[def.id]?.level ?? 0,
    queued: queuedLevels(state, stateId, def.id),
    cap: buildingCap(state, stateId, def.id),
  }));
}

/** Sum of last week's revenue of the country's owner (non-government) buildings. */
export function gdp(state: GameState, tag: string): number {
  let total = 0;
  for (const [stateId, stateDef] of Object.entries(state.states)) {
    if (stateDef.owner !== tag) continue;
    const economy = state.economy.states[stateId];
    if (!economy) continue;
    for (const inst of Object.values(economy.buildings)) {
      const def = BUILDINGS[inst.id];
      if (!def || def.owner === 'government') continue;
      total += inst.lastRevenue;
    }
  }
  return total;
}

/** Total people of one pop type in a state (0 when the state has no economy). */
export function popCount(state: GameState, stateId: string, type: PopTypeId): number {
  return state.economy.states[stateId]?.pops[type] ?? 0;
}
