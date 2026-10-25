import { describe, expect, it } from 'vitest';
import statesJson from '../../data/states.json';
import countriesJson from '../../data/countries.json';
import stateEconomyJson from '../../data/stateEconomy.json';
import { BUILDINGS } from '../../data/economy/buildings';
import { POP_TYPE_IDS } from '../../data/economy/pops';
import { createGameState } from '../state';
import type { CountryDef, StateDef } from '../types';
import { emptyGoodsRecord, emptyPops, initEconomy } from './init';
import type { StateEconomyDef } from './init';
import { buildingCap, buildingJobs, totalPopulation } from './queries';

const states = statesJson as StateDef[];
const countries = countriesJson as Record<string, CountryDef>;
const stateEconomy = stateEconomyJson as Record<string, StateEconomyDef>;

const base = createGameState(states, countries, 'GBR');
const economy = initEconomy(base);

function ownedStates(): StateDef[] {
  return states.filter((s) => s.owner !== null);
}

describe('initEconomy', () => {
  it('creates an economy entry for every owned state and none for decentralized ones', () => {
    for (const s of states) {
      if (s.owner) expect(economy.economy.states[s.id], s.id).toBeDefined();
      else expect(economy.economy.states[s.id], s.id).toBeUndefined();
    }
  });

  it('keeps pops summing to the state population (±1%)', () => {
    for (const s of ownedStates()) {
      const expected = stateEconomy[s.id]?.population ?? 0;
      const pop = totalPopulation(economy, s.id);
      expect(pop, s.id).toBeGreaterThanOrEqual(Math.floor(expected * 0.99));
      expect(pop, s.id).toBeLessThanOrEqual(Math.ceil(expected * 1.01));
      const entry = economy.economy.states[s.id];
      expect(entry).toBeDefined();
      if (!entry) continue;
      for (const id of POP_TYPE_IDS) expect(entry.pops[id], `${s.id}/${id}`).toBeGreaterThanOrEqual(0);
    }
  });

  it('never exceeds a building cap', () => {
    for (const s of ownedStates()) {
      const entry = economy.economy.states[s.id];
      if (!entry) continue;
      for (const inst of Object.values(entry.buildings)) {
        const cap = buildingCap(economy, s.id, inst.id);
        if (cap === null) continue;
        expect(inst.level, `${s.id}/${inst.id}`).toBeLessThanOrEqual(cap);
      }
    }
  });

  it('gives GBR a construction sector and administration in its capital', () => {
    const capital = countries.GBR?.capital;
    expect(capital).toBeDefined();
    if (!capital) return;
    const entry = economy.economy.states[capital];
    expect(entry).toBeDefined();
    expect(entry?.buildings.construction_sector?.level ?? 0).toBeGreaterThanOrEqual(1);
    expect(entry?.buildings.administration?.level ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('never employs more people than the state has', () => {
    for (const s of ownedStates()) {
      const entry = economy.economy.states[s.id];
      if (!entry) continue;
      let employed = 0;
      for (const inst of Object.values(entry.buildings)) {
        const def = BUILDINGS[inst.id];
        if (!def) continue;
        for (const count of Object.values(inst.employed)) employed += count ?? 0;
        expect(buildingJobs(def, inst)).toBeGreaterThanOrEqual(0);
      }
      const pop = totalPopulation(economy, s.id);
      expect(employed, s.id).toBeLessThanOrEqual(pop);
      expect(entry.pops.peasants).toBeGreaterThanOrEqual(0);
    }
  });

  it('creates a market and a country economy for every country', () => {
    for (const tag of Object.keys(countries)) {
      expect(economy.economy.markets[tag], tag).toBeDefined();
      expect(economy.economy.countries[tag], tag).toBeDefined();
      expect(economy.economy.countries[tag]?.queue).toEqual([]);
    }
  });

  it('survives a JSON round-trip', () => {
    expect(JSON.parse(JSON.stringify(economy))).toEqual(economy);
  });

  it('is deterministic', () => {
    expect(initEconomy(base)).toEqual(economy);
  });

  it('does not mutate the input state', () => {
    expect(base.economy.states).toEqual({});
    expect(base.economy.markets).toEqual({});
    expect(base.economy.countries).toEqual({});
  });
});

describe('init helpers', () => {
  it('emptyPops has every pop type at zero', () => {
    const pops = emptyPops();
    for (const id of POP_TYPE_IDS) expect(pops[id]).toBe(0);
  });

  it('emptyGoodsRecord fills every good', () => {
    const goods = emptyGoodsRecord(3);
    expect(Object.keys(goods).length).toBeGreaterThan(20);
    for (const value of Object.values(goods)) expect(value).toBe(3);
  });
});
