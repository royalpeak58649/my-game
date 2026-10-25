// Player commands. Pure: each returns a new GameState, or the same object when invalid.

import { BUILDINGS } from '../../data/economy/buildings';
import { isUnlocked } from '../politics/unlocks';
import type { GameState } from '../types';
import { buildingCap } from './queries';
import type { CountryEconomy, EconomyState, StateEconomy } from './types';

const MIN_INCOME_TAX = 0;
const MAX_INCOME_TAX = 0.5;

/** Levels of `buildingId` already queued by `tag` for `stateId`. */
function queuedLevels(country: CountryEconomy, stateId: string, buildingId: string): number {
  let count = 0;
  for (const item of country.queue) {
    if (item.stateId === stateId && item.buildingId === buildingId) count += 1;
  }
  return count;
}

/** Replaces one country economy, keeping the rest of the economy untouched. */
function withCountry(economy: EconomyState, tag: string, country: CountryEconomy): EconomyState {
  return { ...economy, countries: { ...economy.countries, [tag]: country } };
}

/** Replaces one state economy, keeping the rest of the economy untouched. */
function withState(economy: EconomyState, stateId: string, stateEconomy: StateEconomy): EconomyState {
  return { ...economy, states: { ...economy.states, [stateId]: stateEconomy } };
}

/**
 * Queues one level of a building. Valid when `tag` owns the state and the building's cap
 * (resource / urbanCap; farm and ranch share arable) is not reached counting queued levels.
 */
export function queueConstruction(
  state: GameState,
  tag: string,
  stateId: string,
  buildingId: string,
): GameState {
  const stateDef = state.states[stateId];
  if (!stateDef || stateDef.owner !== tag) return state;
  const def = BUILDINGS[buildingId];
  if (!def) return state;
  const stateEconomy = state.economy.states[stateId];
  const country = state.economy.countries[tag];
  if (!stateEconomy || !country) return state;

  if (!techAllows(state, tag, buildingId)) return state;

  const cap = buildingCap(state, stateId, buildingId);
  if (cap !== null) {
    const current = stateEconomy.buildings[buildingId]?.level ?? 0;
    if (current + queuedLevels(country, stateId, buildingId) >= cap) return state;
  }

  const queue = [...country.queue, { stateId, buildingId, progress: 0 }];
  return { ...state, economy: withCountry(state.economy, tag, { ...country, queue }) };
}

/** Removes the queued item at `index` of the country's queue. */
export function cancelConstruction(state: GameState, tag: string, index: number): GameState {
  const country = state.economy.countries[tag];
  if (!country) return state;
  if (!Number.isInteger(index) || index < 0 || index >= country.queue.length) return state;
  const queue = country.queue.filter((_, i) => i !== index);
  return { ...state, economy: withCountry(state.economy, tag, { ...country, queue }) };
}

/** Switches the active production method of a building. */
export function setProductionMethod(
  state: GameState,
  stateId: string,
  buildingId: string,
  methodId: string,
): GameState {
  const stateEconomy = state.economy.states[stateId];
  if (!stateEconomy) return state;
  const def = BUILDINGS[buildingId];
  if (!def) return state;
  if (!def.methods.some((m) => m.id === methodId)) return state;
  const owner = state.states[stateId]?.owner;
  if (owner && !techAllows(state, owner, methodId)) return state;
  const inst = stateEconomy.buildings[buildingId];
  if (!inst || inst.method === methodId) return state;

  const buildings = { ...stateEconomy.buildings, [buildingId]: { ...inst, method: methodId } };
  return { ...state, economy: withState(state.economy, stateId, { ...stateEconomy, buildings }) };
}

/** Sets the income tax rate, clamped to [0, 0.5]. */
export function setIncomeTax(state: GameState, tag: string, rate: number): GameState {
  const country = state.economy.countries[tag];
  if (!country) return state;
  if (!Number.isFinite(rate)) return state;
  const clamped = Math.max(MIN_INCOME_TAX, Math.min(MAX_INCOME_TAX, rate));
  if (clamped === country.incomeTaxRate) return state;
  return { ...state, economy: withCountry(state.economy, tag, { ...country, incomeTaxRate: clamped }) };
}

/** Tech gating; countries without politics data (headless tests) are unrestricted. */
function techAllows(state: GameState, tag: string, id: string): boolean {
  return !state.politics?.countries[tag] || isUnlocked(state, tag, id);
}
