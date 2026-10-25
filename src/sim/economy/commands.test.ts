import { describe, expect, it } from 'vitest';
import statesJson from '../../data/states.json';
import countriesJson from '../../data/countries.json';
import { createGameState } from '../state';
import type { CountryDef, GameState, StateDef } from '../types';
import { initEconomy } from './init';
import { cancelConstruction, queueConstruction, setIncomeTax, setProductionMethod } from './commands';
import { buildingCap } from './queries';

const states = statesJson as StateDef[];
const countries = countriesJson as Record<string, CountryDef>;

const base = initEconomy(createGameState(states, countries, 'GBR'));

/** A state owned by `tag` with at least one level of `buildingId`. */
function findStateWith(tag: string, buildingId: string): string | undefined {
  return Object.entries(base.economy.states).find(
    ([stateId, entry]) => base.states[stateId]?.owner === tag && (entry.buildings[buildingId]?.level ?? 0) > 0,
  )?.[0];
}

describe('queueConstruction', () => {
  it('rejects a state owned by another country', () => {
    const stateId = findStateWith('GBR', 'farm');
    expect(stateId).toBeDefined();
    if (!stateId) return;
    expect(queueConstruction(base, 'FRA', stateId, 'farm')).toBe(base);
  });

  it('rejects unknown states and buildings', () => {
    const stateId = findStateWith('GBR', 'farm');
    if (!stateId) throw new Error('no farm state');
    expect(queueConstruction(base, 'GBR', 'NOPE_01', 'farm')).toBe(base);
    expect(queueConstruction(base, 'GBR', stateId, 'not_a_building')).toBe(base);
  });

  it('queues a valid building without mutating the input', () => {
    const stateId = findStateWith('GBR', 'farm');
    if (!stateId) throw new Error('no farm state');
    const next = queueConstruction(base, 'GBR', stateId, 'farm');
    expect(next).not.toBe(base);
    expect(next.economy.countries.GBR?.queue).toEqual([{ stateId, buildingId: 'farm', progress: 0 }]);
    expect(base.economy.countries.GBR?.queue).toEqual([]);
  });

  it('respects the cap counting already queued levels', () => {
    const stateId = findStateWith('GBR', 'farm');
    if (!stateId) throw new Error('no farm state');
    const cap = buildingCap(base, stateId, 'farm');
    expect(cap).not.toBeNull();
    if (cap === null) return;
    const current = base.economy.states[stateId]?.buildings.farm?.level ?? 0;
    const free = cap - current;
    expect(free).toBeGreaterThanOrEqual(0);

    let next: GameState = base;
    for (let i = 0; i < free; i++) next = queueConstruction(next, 'GBR', stateId, 'farm');
    expect(next.economy.countries.GBR?.queue.length).toBe(free);

    // One more level would exceed the cap.
    expect(queueConstruction(next, 'GBR', stateId, 'farm')).toBe(next);
  });

  it('shares the arable cap between farms and ranches', () => {
    const stateId = findStateWith('GBR', 'farm');
    if (!stateId) throw new Error('no farm state');
    const entry = base.economy.states[stateId];
    if (!entry) throw new Error('no economy');
    const arable = entry.resources.arable ?? 0;
    const farmLevel = entry.buildings.farm?.level ?? 0;
    const ranchLevel = entry.buildings.ranch?.level ?? 0;
    expect(buildingCap(base, stateId, 'farm')).toBe(Math.max(0, arable - ranchLevel));
    expect(buildingCap(base, stateId, 'ranch')).toBe(Math.max(0, arable - farmLevel));
  });

  it('caps urban buildings by urbanCap and leaves others uncapped', () => {
    const stateId = findStateWith('GBR', 'urban_center') ?? findStateWith('GBR', 'farm');
    if (!stateId) throw new Error('no state');
    const entry = base.economy.states[stateId];
    expect(buildingCap(base, stateId, 'urban_center')).toBe(entry?.urbanCap ?? null);
    expect(buildingCap(base, stateId, 'textile_mill')).toBeNull();
    expect(buildingCap(base, stateId, 'administration')).toBeNull();
  });

  it('rejects a building whose cap is already reached', () => {
    const stateId = findStateWith('GBR', 'farm');
    if (!stateId) throw new Error('no farm state');
    const entry = base.economy.states[stateId];
    if (!entry) throw new Error('no economy');
    const cap = buildingCap(base, stateId, 'farm');
    if (cap === null) throw new Error('farm should be capped');
    const current = entry.buildings.farm?.level ?? 0;
    let next: GameState = base;
    for (let i = 0; i < cap - current; i++) next = queueConstruction(next, 'GBR', stateId, 'farm');
    expect(queueConstruction(next, 'GBR', stateId, 'farm')).toBe(next);
  });
});

describe('cancelConstruction', () => {
  it('removes the item at the given index', () => {
    const stateId = findStateWith('GBR', 'farm');
    if (!stateId) throw new Error('no farm state');
    const queued = queueConstruction(base, 'GBR', stateId, 'farm');
    const cancelled = cancelConstruction(queued, 'GBR', 0);
    expect(cancelled.economy.countries.GBR?.queue).toEqual([]);
    expect(queued.economy.countries.GBR?.queue.length).toBe(1);
  });

  it('rejects out-of-range indices and unknown countries', () => {
    expect(cancelConstruction(base, 'GBR', 0)).toBe(base);
    expect(cancelConstruction(base, 'GBR', -1)).toBe(base);
    expect(cancelConstruction(base, 'NOPE', 0)).toBe(base);
  });
});

describe('setProductionMethod', () => {
  it('switches to a known method', () => {
    const stateId = findStateWith('GBR', 'farm');
    if (!stateId) throw new Error('no farm state');
    const next = setProductionMethod(base, stateId, 'farm', 'farm_rotation');
    expect(next.economy.states[stateId]?.buildings.farm?.method).toBe('farm_rotation');
    expect(base.economy.states[stateId]?.buildings.farm?.method).toBe('farm_open_field');
  });

  it('rejects unknown methods, buildings and states', () => {
    const stateId = findStateWith('GBR', 'farm');
    if (!stateId) throw new Error('no farm state');
    expect(setProductionMethod(base, stateId, 'farm', 'nope')).toBe(base);
    expect(setProductionMethod(base, stateId, 'not_a_building', 'farm_rotation')).toBe(base);
    expect(setProductionMethod(base, 'NOPE_01', 'farm', 'farm_rotation')).toBe(base);
  });

  it('rejects a method that belongs to another building', () => {
    const stateId = findStateWith('GBR', 'farm');
    if (!stateId) throw new Error('no farm state');
    expect(setProductionMethod(base, stateId, 'farm', 'ranch_pasture')).toBe(base);
  });
});

describe('setIncomeTax', () => {
  it('clamps to [0, 0.5]', () => {
    expect(setIncomeTax(base, 'GBR', 0.9).economy.countries.GBR?.incomeTaxRate).toBe(0.5);
    expect(setIncomeTax(base, 'GBR', -1).economy.countries.GBR?.incomeTaxRate).toBe(0);
    expect(setIncomeTax(base, 'GBR', 0.25).economy.countries.GBR?.incomeTaxRate).toBe(0.25);
  });

  it('does not mutate the input and rejects unknown countries', () => {
    const next = setIncomeTax(base, 'GBR', 0.3);
    expect(base.economy.countries.GBR?.incomeTaxRate).toBe(0.1);
    expect(next).not.toBe(base);
    expect(setIncomeTax(base, 'NOPE', 0.3)).toBe(base);
  });
});
