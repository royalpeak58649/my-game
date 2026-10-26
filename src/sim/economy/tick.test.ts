import { describe, expect, it } from 'vitest';
import { BUILDINGS } from '../../data/economy/buildings';
import { GOODS, GOOD_IDS } from '../../data/economy/goods';
import { POP_TYPES, POP_TYPE_IDS } from '../../data/economy/pops';
import type { GameState } from '../types';
import type {
  BuildingInstance,
  CountryEconomy,
  EconomyState,
  GoodId,
  Market,
  PopTypeId,
  StateEconomy,
} from './types';
import { economyTick } from './tick';

// ------------------------------------------------------------------ helpers

function emptyPops(): Record<PopTypeId, number> {
  const pops = {} as Record<PopTypeId, number>;
  for (const id of POP_TYPE_IDS) pops[id] = 0;
  return pops;
}

function emptyGoods(): Record<GoodId, number> {
  const record = {} as Record<GoodId, number>;
  for (const id of GOOD_IDS) record[id] = GOODS[id].basePrice;
  return record;
}

function emptyFills(): Record<GoodId, number> {
  const record = {} as Record<GoodId, number>;
  for (const id of GOOD_IDS) record[id] = 1;
  return record;
}

function emptyQuantities(): Record<GoodId, number> {
  const record = {} as Record<GoodId, number>;
  for (const id of GOOD_IDS) record[id] = 0;
  return record;
}

function makeMarket(): Market {
  return {
    prices: emptyGoods(),
    supply: emptyQuantities(),
    demand: emptyQuantities(),
    buyFill: emptyFills(),
    sellFill: emptyFills(),
    exports: emptyQuantities(),
    imports: emptyQuantities(),
  };
}

function makeCountry(treasury = 1000): CountryEconomy {
  return { treasury, incomeTaxRate: 0.1, lastIncome: 0, lastExpenses: 0, lastUpkeep: 0, constructionPoints: 0, queue: [] };
}

function makeState(pops: Partial<Record<PopTypeId, number>>, buildings: BuildingInstance[] = []): StateEconomy {
  const full = emptyPops();
  for (const [id, value] of Object.entries(pops)) full[id as PopTypeId] = value ?? 0;
  // people already working in a building belong to that profession
  for (const b of buildings) for (const [id, n] of Object.entries(b.employed)) full[id as PopTypeId] += n ?? 0;
  const income = emptyPops();
  for (const id of POP_TYPE_IDS) {
    const t = POP_TYPES[id];
    income[id] = t.subsistenceIncome ?? (t.baseWage > 0 ? t.baseWage * 0.9 : 1);
  }
  const sol = emptyPops();
  for (const id of POP_TYPE_IDS) sol[id] = 10;
  return {
    pops: full,
    income,
    sol,
    buildings: Object.fromEntries(buildings.map((b) => [b.id, b])),
    resources: {},
    urbanCap: 10,
    coastal: false,
  };
}

function makeBuilding(id: string, level: number, employed: Partial<Record<PopTypeId, number>> = {}): BuildingInstance {
  const def = BUILDINGS[id];
  if (!def) throw new Error(`unknown building ${id}`);
  return {
    id,
    level,
    method: def.methods[0].id,
    employed: { ...employed },
    lastRevenue: 0,
    lastCosts: 0,
    lastProfit: 0,
    inputFill: 1,
  };
}

interface WorldOptions {
  states: Record<string, StateEconomy>;
  owners?: Record<string, string>;
  countries?: Record<string, CountryEconomy>;
}

function makeWorld(options: WorldOptions): GameState {
  const owners = options.owners ?? {};
  const stateIds = Object.keys(options.states);
  const tags = new Set<string>(Object.keys(options.countries ?? {}));
  for (const id of stateIds) tags.add(owners[id] ?? 'AAA');

  const markets: Record<string, Market> = {};
  const countries: Record<string, CountryEconomy> = {};
  for (const tag of tags) {
    markets[tag] = makeMarket();
    countries[tag] = options.countries?.[tag] ?? makeCountry();
  }

  const economy: EconomyState = { states: options.states, markets, countries };
  const stateDefs: GameState['states'] = {};
  for (const id of stateIds) {
    stateDefs[id] = { id, name: id, owner: owners[id] ?? 'AAA', adm0: 'AAA', area: 1000, centroid: [0, 0] };
  }
  const countryDefs: GameState['countries'] = {};
  for (const tag of tags) countryDefs[tag] = { tag, name: tag, color: '#fff', capital: stateIds[0] ?? 'S1' };

  return {
    date: { year: 1836, month: 1, day: 1 },
    tickCount: 0,
    player: null,
    states: stateDefs,
    countries: countryDefs,
    economy,
    politics: { countries: {} },
    diplomacy: { relations: {}, alliances: [], subjects: {}, truces: {}, countries: {}, plays: [], ranking: [], nextPlayId: 1 },
    military: { armies: {}, wars: [], nextWarId: 1, navies: {}, invasions: [], nextInvasionId: 1 },
    ownershipVersion: 0,
  };
}

function run(state: GameState, ticks: number): GameState {
  let current = state;
  for (let i = 0; i < ticks; i++) current = economyTick(current);
  return current;
}

function collectNumbers(value: unknown, out: number[] = []): number[] {
  if (typeof value === 'number') out.push(value);
  else if (Array.isArray(value)) for (const v of value) collectNumbers(v, out);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) collectNumbers(v, out);
  return out;
}

// -------------------------------------------------------------------- tests

describe('economyTick — employment', () => {
  it('hires peasants into open jobs without exceeding jobs or peasants', () => {
    const farm = makeBuilding('farm', 1); // 3600 farmers + 40 aristocrats per level
    const state = makeWorld({ states: { S1: makeState({ peasants: 100000 }, [farm]) } });

    const next = economyTick(state);
    const inst = next.economy.states.S1.buildings.farm;
    expect(inst).toBeDefined();
    if (!inst) return;
    const farmers = inst.employed.farmers ?? 0;
    const aristocrats = inst.employed.aristocrats ?? 0;
    expect(farmers).toBeGreaterThan(0);
    expect(farmers).toBeLessThanOrEqual(3600);
    expect(aristocrats).toBeLessThanOrEqual(40);
    const pops = next.economy.states.S1.pops;
    // hired people moved from peasants into their profession; total only grows by natural growth
    expect(pops.farmers).toBe(farmers);
    expect(pops.aristocrats).toBe(aristocrats);
    const total = POP_TYPE_IDS.reduce((t, id) => t + pops[id], 0);
    expect(total).toBeGreaterThanOrEqual(100000);
    expect(total).toBeLessThan(100000 * 1.001);
  });

  it('never hires more people than there are peasants', () => {
    const farm = makeBuilding('farm', 5); // 18,000 farmer jobs
    const state = makeWorld({ states: { S1: makeState({ peasants: 500 }, [farm]) } });
    const next = economyTick(state);
    const inst = next.economy.states.S1.buildings.farm;
    expect(inst).toBeDefined();
    if (!inst) return;
    const employed = (inst.employed.farmers ?? 0) + (inst.employed.aristocrats ?? 0);
    expect(employed).toBeLessThanOrEqual(500);
    expect(next.economy.states.S1.pops.peasants).toBeGreaterThanOrEqual(0);
  });

  it('fires 5% of every employed type when lastProfit is negative', () => {
    const farm = makeBuilding('farm', 1, { farmers: 1000, aristocrats: 40 });
    farm.lastProfit = -5;
    const state = makeWorld({ states: { S1: makeState({ peasants: 1000 }, [farm]) } });
    const next = economyTick(state);
    const inst = next.economy.states.S1.buildings.farm;
    expect(inst).toBeDefined();
    if (!inst) return;
    expect(inst.employed.farmers).toBe(950);
    expect(inst.employed.aristocrats).toBe(38);
    expect(next.economy.states.S1.pops.peasants).toBe(1000 + 50 + 2);
  });
});

describe('economyTick — markets', () => {
  it('lowers the price of a good in excess supply and raises it in excess demand', () => {
    const farm = makeBuilding('farm', 1, { farmers: 3600, aristocrats: 40 });
    const state = makeWorld({ states: { S1: makeState({ peasants: 1000 }, [farm]) } });
    const next = economyTick(state);
    const market = next.economy.markets.AAA;
    expect(market).toBeDefined();
    if (!market) return;
    expect(market.supply.grain).toBeGreaterThan(0);
    expect(market.prices.grain).toBeLessThan(GOODS.grain.basePrice);
    // Nothing produces clothes, but pops want them: price rises.
    expect(market.prices.clothes).toBeGreaterThan(GOODS.clothes.basePrice);
  });

  it('keeps prices within [0.25, 1.75] × base after 200 ticks', () => {
    const farm = makeBuilding('farm', 2, { farmers: 7200, aristocrats: 80 });
    const mill = makeBuilding('textile_mill', 1, { laborers: 2500, machinists: 300, clerks: 150, capitalists: 40 });
    const state = makeWorld({
      states: { S1: makeState({ peasants: 50000 }, [farm, mill]) },
    });
    const next = run(state, 200);
    const market = next.economy.markets.AAA;
    expect(market).toBeDefined();
    if (!market) return;
    for (const id of GOOD_IDS) {
      const base = GOODS[id].basePrice;
      expect(market.prices[id], id).toBeGreaterThanOrEqual(base * 0.25 - 1e-9);
      expect(market.prices[id], id).toBeLessThanOrEqual(base * 1.75 + 1e-9);
    }
  });
});

describe('economyTick — money', () => {
  it('conserves money: wages + dividends + tax = revenue − input costs', () => {
    const farm = makeBuilding('farm', 1, { farmers: 3600, aristocrats: 40 });
    const mill = makeBuilding('textile_mill', 1, { laborers: 2500, machinists: 300, clerks: 150, capitalists: 40 });
    const state = makeWorld({ states: { S1: makeState({ peasants: 50000 }, [farm, mill]) } });
    state.player = 'AAA'; // no AI method switching inside this check
    const next = economyTick(state);
    const eco = next.economy.states.S1;
    const market = next.economy.markets.AAA;
    expect(market).toBeDefined();
    if (!market) return;

    let revenue = 0;
    let inputCost = 0;
    for (const inst of Object.values(eco.buildings)) {
      const def = BUILDINGS[inst.id];
      if (!def || def.owner === 'government') continue;
      const method = def.methods.find((m) => m.id === inst.method) ?? def.methods[0];
      const staffing = (() => {
        let employed = 0;
        let jobs = 0;
        for (const id of POP_TYPE_IDS) {
          employed += inst.employed[id] ?? 0;
          jobs += inst.level * (method.employment[id] ?? 0);
        }
        return jobs > 0 ? Math.min(1, employed / jobs) : 0;
      })();
      for (const id of GOOD_IDS) {
        const out = method.outputs[id] ?? 0;
        if (out > 0) revenue += inst.level * out * staffing * inst.inputFill * market.sellFill[id] * market.prices[id];
        const input = method.inputs[id] ?? 0;
        if (input > 0) inputCost += inst.level * input * staffing * market.buyFill[id] * market.prices[id];
      }
    }

    let wages = 0;
    for (const id of POP_TYPE_IDS) {
      if (id === 'peasants') continue;
      wages += eco.pops[id] * eco.income[id];
    }
    const tax = next.economy.countries.AAA.lastIncome;
    const expected = revenue - inputCost;
    const actual = wages + tax;
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(Math.abs(expected) * 1e-6 + 1e-9);
  });
});

describe('economyTick — construction', () => {
  it('completes a queued item and adds a level', () => {
    const sector = makeBuilding('construction_sector', 1, { laborers: 4000 });
    const state = makeWorld({ states: { S1: makeState({ peasants: 50000 }, [sector]) } });
    state.economy.countries.AAA.queue = [{ stateId: 'S1', buildingId: 'farm', progress: BUILDINGS.farm.cost - 1 }];
    state.player = 'AAA'; // keep the investment AI out of this test

    const next = economyTick(state);
    const farm = next.economy.states.S1.buildings.farm;
    expect(farm).toBeDefined();
    if (!farm) return;
    expect(farm.level).toBe(1);
    expect(farm.method).toBe(BUILDINGS.farm.methods[0].id);
    expect(farm.employed).toEqual({});
    expect(farm.inputFill).toBe(1);
    expect(next.economy.countries.AAA.queue.length).toBe(0);
  });

  it('adds a level to an existing building', () => {
    const sector = makeBuilding('construction_sector', 1, { laborers: 4000 });
    const farm = makeBuilding('farm', 1, { farmers: 3600, aristocrats: 40 });
    const state = makeWorld({ states: { S1: makeState({ peasants: 50000 }, [sector, farm]) } });
    state.economy.countries.AAA.queue = [{ stateId: 'S1', buildingId: 'farm', progress: BUILDINGS.farm.cost - 1 }];
    state.player = 'AAA'; // keep the investment AI out of this test
    const next = economyTick(state);
    expect(next.economy.states.S1.buildings.farm?.level).toBe(2);
  });
});

describe('economyTick — robustness', () => {
  it('produces no NaN or Infinity after 100 ticks', () => {
    const farm = makeBuilding('farm', 1, { farmers: 3600, aristocrats: 40 });
    const mill = makeBuilding('textile_mill', 1, { laborers: 2500, machinists: 300, clerks: 150, capitalists: 40 });
    const admin = makeBuilding('administration', 1, { bureaucrats: 1500, clerks: 500 });
    const state = makeWorld({
      states: {
        S1: makeState({ peasants: 20000 }, [farm, mill, admin]),
        S2: makeState({ peasants: 0 }, []),
      },
      owners: { S1: 'AAA', S2: 'AAA' },
    });
    state.economy.countries.AAA.queue = [{ stateId: 'S2', buildingId: 'farm', progress: 0 }];
    const next = run(state, 100);
    for (const value of collectNumbers(next.economy)) expect(Number.isFinite(value)).toBe(true);
  });

  it('does not mutate its input', () => {
    const farm = makeBuilding('farm', 1, { farmers: 3600, aristocrats: 40 });
    const state = makeWorld({ states: { S1: makeState({ peasants: 50000 }, [farm]) } });
    state.economy.countries.AAA.queue = [{ stateId: 'S1', buildingId: 'farm', progress: BUILDINGS.farm.cost - 1 }];
    state.player = 'AAA'; // keep the investment AI out of this test
    const before = JSON.stringify(state);
    economyTick(state);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('is deterministic', () => {
    const farm = makeBuilding('farm', 1, { farmers: 3600, aristocrats: 40 });
    const state = makeWorld({ states: { S1: makeState({ peasants: 50000 }, [farm]) } });
    expect(JSON.stringify(run(state, 20))).toBe(JSON.stringify(run(state, 20)));
  });
});
