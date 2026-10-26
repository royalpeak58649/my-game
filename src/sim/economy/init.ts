// Seeds the 1836 economy from static data. See docs/ECONOMY.md "Initialisation".
// Pure: returns a new GameState and never mutates the input.

import stateEconomyJson from '../../data/stateEconomy.json';
import { BUILDINGS } from '../../data/economy/buildings';
import { DEFAULT_DEVELOPMENT, DEFAULT_INCOME_TAX, DEVELOPMENT, TREASURY_PER_CAPITA } from '../../data/economy/development';
import { seedArmies } from './armies';
import type { Development } from '../../data/economy/development';
import { GOOD_IDS, GOODS } from '../../data/economy/goods';
import { POP_TYPES, POP_TYPE_IDS } from '../../data/economy/pops';
import type { GameState } from '../types';
import type {
  BuildingDef,
  BuildingInstance,
  CountryEconomy,
  EconomyState,
  GoodId,
  Market,
  PopTypeId,
  ResourceId,
  StateEconomy,
} from './types';

// ------------------------------------------------------------------ static data

export interface StateEconomyDef {
  population: number;
  coastal: boolean;
  urbanCap: number;
  resources: Partial<Record<ResourceId, number>>;
}

const STATE_ECONOMY = stateEconomyJson as Record<string, StateEconomyDef>;

// ------------------------------------------------------------------ tuning

/** Share of employed people working in extraction. */
const EXTRACTION_SHARE = 0.06;
/** Share of employed people working in urban services. */
const URBAN_SHARE = 0.06;
/** Jobs per level used to size agriculture, extraction and urban buildings. */
const AGRI_JOBS_PER_LEVEL = 3600;
const EXTRACTION_JOBS_PER_LEVEL = 3600;
const URBAN_JOBS_PER_LEVEL = 3000;
/** Jobs per level used to size factories. */
const INDUSTRY_JOBS_PER_LEVEL = 3000;
/** Share of agricultural workers going to plantations. */
const PLANTATION_SHARE = 0.15;
const PLANTATION_JOBS_PER_LEVEL = 3800;
/** Share of the remaining agricultural levels built as farms (the rest are ranches). */
const FARM_SHARE = 0.75;
/** Jobs must stay below this share of the population, otherwise all levels are scaled down. */
const MAX_EMPLOYED_SHARE = 0.9;
/** Starting standard of living for every pop type. */
const STARTING_SOL = 10;

/** Plantation building id per crop resource. */
const PLANTATION_BY_RESOURCE: Partial<Record<ResourceId, string>> = {
  cotton: 'cotton_plantation',
  sugar: 'sugar_plantation',
  coffee: 'coffee_plantation',
  tea: 'tea_plantation',
  tobacco: 'tobacco_plantation',
  dye: 'dye_plantation',
  silk: 'silk_plantation',
};

/** Extraction buildings in the order they are considered, with the resource that caps them. */
const EXTRACTION_BUILDINGS: { id: string; resource: ResourceId }[] = [
  { id: 'logging_camp', resource: 'wood' },
  { id: 'fishing_wharf', resource: 'fish' },
  { id: 'coal_mine', resource: 'coal' },
  { id: 'iron_mine', resource: 'iron' },
];

/** Factory weights for the largest-remainder distribution of industry levels. */
const FACTORY_WEIGHTS: { id: string; weight: number }[] = [
  { id: 'textile_mill', weight: 3 },
  { id: 'food_industry', weight: 3 },
  { id: 'garment_works', weight: 2 },
  { id: 'furniture_workshop', weight: 2 },
  { id: 'tool_workshop', weight: 1.5 },
  { id: 'paper_mill', weight: 1 },
  { id: 'glassworks', weight: 1 },
  { id: 'steel_mill', weight: 0.5 },
  { id: 'arms_workshop', weight: 0.5 },
];

// ------------------------------------------------------------------ helpers

export function emptyPops(): Record<PopTypeId, number> {
  const pops = {} as Record<PopTypeId, number>;
  for (const id of POP_TYPE_IDS) pops[id] = 0;
  return pops;
}

export function emptyGoodsRecord(value: number): Record<GoodId, number> {
  const record = {} as Record<GoodId, number>;
  for (const id of GOOD_IDS) record[id] = value;
  return record;
}

function emptyMarket(): Market {
  const prices = {} as Record<GoodId, number>;
  for (const id of GOOD_IDS) prices[id] = GOODS[id].basePrice;
  return {
    prices,
    supply: emptyGoodsRecord(0),
    demand: emptyGoodsRecord(0),
    buyFill: emptyGoodsRecord(1),
    sellFill: emptyGoodsRecord(1),
    exports: emptyGoodsRecord(0),
    imports: emptyGoodsRecord(0),
  };
}

function emptyCountryEconomy(countryPop: number): CountryEconomy {
  return {
    treasury: countryPop * TREASURY_PER_CAPITA,
    incomeTaxRate: DEFAULT_INCOME_TAX,
    lastIncome: 0,
    lastExpenses: 0,
    lastUpkeep: 0,
    constructionPoints: 0,
    queue: [],
  };
}

function developmentOf(tag: string): Development {
  return DEVELOPMENT[tag] ?? DEFAULT_DEVELOPMENT;
}

function resourceOf(def: StateEconomyDef, resource: ResourceId): number {
  return def.resources[resource] ?? 0;
}

function defaultMethodId(def: BuildingDef): string {
  const method = def.methods[0];
  if (!method) throw new Error(`Building ${def.id} has no production methods`);
  return method.id;
}

function makeInstance(def: BuildingDef, level: number): BuildingInstance {
  return {
    id: def.id,
    level,
    method: defaultMethodId(def),
    employed: {},
    lastRevenue: 0,
    lastCosts: 0,
    lastProfit: 0,
    inputFill: 1,
  };
}

/** Splits `total` into integer parts proportional to `weights` (largest remainder). */
function largestRemainder(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (total <= 0 || sum <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (total * w) / sum);
  const floors = exact.map((v) => Math.floor(v));
  let assigned = floors.reduce((a, b) => a + b, 0);
  const order = exact
    .map((v, i) => ({ i, remainder: v - Math.floor(v) }))
    .sort((a, b) => b.remainder - a.remainder || a.i - b.i);
  const result = floors.slice();
  for (const { i } of order) {
    if (assigned >= total) break;
    result[i] = (result[i] ?? 0) + 1;
    assigned += 1;
  }
  return result;
}

/** Splits `total` into `parts` integer shares that differ by at most one. */
function splitEvenly(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  const base = Math.floor(total / parts);
  const extra = total - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < extra ? 1 : 0));
}

// ------------------------------------------------------------------ levels

/** Levels of every building in one state, before the population safety scale. */
function planLevels(
  def: StateEconomyDef,
  dev: Development,
  isCapital: boolean,
  countryPop: number,
): Record<string, number> {
  const levels: Record<string, number> = {};
  const add = (id: string, level: number): void => {
    if (level > 0) levels[id] = (levels[id] ?? 0) + level;
  };

  const employed = def.population * dev.employment;
  const industryWorkers = employed * dev.industry;
  const extractionWorkers = employed * EXTRACTION_SHARE;
  const urbanWorkers = employed * URBAN_SHARE;
  const agriWorkers = Math.max(0, employed - industryWorkers - extractionWorkers - urbanWorkers);

  // Government: capital state only.
  if (isCapital) {
    add('administration', Math.max(1, Math.round(countryPop / 2_500_000)));
    add('construction_sector', Math.max(1, Math.round((countryPop * dev.employment) / 400_000)));
  }

  // Agriculture: plantations first, then farms and ranches sharing the arable land.
  let agriRemaining = agriWorkers;
  for (const [resource, buildingId] of Object.entries(PLANTATION_BY_RESOURCE)) {
    if (!buildingId) continue;
    const available = resourceOf(def, resource as ResourceId);
    if (available <= 0) continue;
    const level = Math.min(available, Math.round((agriWorkers * PLANTATION_SHARE) / PLANTATION_JOBS_PER_LEVEL));
    if (level <= 0) continue;
    add(buildingId, level);
    agriRemaining = Math.max(0, agriRemaining - level * PLANTATION_JOBS_PER_LEVEL);
  }
  const arable = resourceOf(def, 'arable');
  const agriLevels = Math.min(arable, Math.floor(agriRemaining / AGRI_JOBS_PER_LEVEL));
  const farmLevels = Math.round(agriLevels * FARM_SHARE);
  add('farm', farmLevels);
  add('ranch', agriLevels - farmLevels);

  // Extraction: workers split evenly over the resources the state has.
  const present = EXTRACTION_BUILDINGS.filter((b) => resourceOf(def, b.resource) > 0);
  const shares = splitEvenly(Math.floor(extractionWorkers), present.length);
  present.forEach((b, i) => {
    const workers = shares[i] ?? 0;
    add(b.id, Math.min(resourceOf(def, b.resource), Math.floor(workers / EXTRACTION_JOBS_PER_LEVEL)));
  });

  // Industry: total factory levels distributed by weight.
  const factoryLevels = Math.floor(industryWorkers / INDUSTRY_JOBS_PER_LEVEL);
  const distribution = largestRemainder(factoryLevels, FACTORY_WEIGHTS.map((f) => f.weight));
  FACTORY_WEIGHTS.forEach((f, i) => add(f.id, distribution[i] ?? 0));

  // Urban.
  add('urban_center', Math.min(def.urbanCap, Math.round(urbanWorkers / URBAN_JOBS_PER_LEVEL)));

  return levels;
}

/** Total jobs offered by a set of levels. */
function totalJobs(levels: Record<string, number>): number {
  let jobs = 0;
  for (const [id, level] of Object.entries(levels)) {
    if (level <= 0) continue;
    const def = BUILDINGS[id];
    const method = def?.methods[0];
    if (!method) continue;
    for (const count of Object.values(method.employment)) jobs += level * (count ?? 0);
  }
  return jobs;
}

/** Scales all levels down proportionally so jobs stay below MAX_EMPLOYED_SHARE of the population. */
function scaleToPopulation(levels: Record<string, number>, population: number): Record<string, number> {
  const jobs = totalJobs(levels);
  const limit = population * MAX_EMPLOYED_SHARE;
  if (jobs <= limit || jobs <= 0) return levels;
  const factor = limit / jobs;
  const scaled: Record<string, number> = {};
  for (const [id, level] of Object.entries(levels)) {
    const next = Math.floor(level * factor);
    if (next > 0) scaled[id] = next;
  }
  return scaled;
}

// ------------------------------------------------------------------ state economy

function buildStateEconomy(
  def: StateEconomyDef,
  levels: Record<string, number>,
): StateEconomy {
  const buildings: Record<string, BuildingInstance> = {};
  const pops = emptyPops();

  for (const [id, level] of Object.entries(levels)) {
    if (level <= 0) continue;
    const buildingDef = BUILDINGS[id];
    if (!buildingDef) continue;
    const instance = makeInstance(buildingDef, level);
    const method = buildingDef.methods[0];
    if (method) {
      const employed: Partial<Record<PopTypeId, number>> = {};
      for (const [type, perLevel] of Object.entries(method.employment)) {
        const count = level * (perLevel ?? 0);
        if (count <= 0) continue;
        employed[type as PopTypeId] = count;
        pops[type as PopTypeId] += count;
      }
      instance.employed = employed;
    }
    buildings[id] = instance;
  }

  const employedTotal = POP_TYPE_IDS.reduce((sum, id) => sum + pops[id], 0);
  pops.peasants = Math.max(0, def.population - employedTotal);

  const income = startingIncome();
  const sol = emptyPops();
  for (const id of POP_TYPE_IDS) sol[id] = STARTING_SOL;

  return {
    pops,
    income,
    sol,
    buildings,
    resources: { ...def.resources },
    urbanCap: def.urbanCap,
    coastal: def.coastal,
  };
}

/**
 * Income before the first tick: wage after the default tax for workers, subsistence for
 * peasants and a rough dividend estimate for owners. Without this every pop would have zero
 * income in week one, demand would vanish and all prices would collapse.
 */
const STARTING_OWNER_INCOME = 2;
function startingIncome(): Record<PopTypeId, number> {
  const income = emptyPops();
  for (const id of POP_TYPE_IDS) {
    const t = POP_TYPES[id];
    if (t.subsistenceIncome !== undefined) income[id] = t.subsistenceIncome;
    else if (t.baseWage > 0) income[id] = t.baseWage * (1 - DEFAULT_INCOME_TAX);
    else income[id] = STARTING_OWNER_INCOME * (1 - DEFAULT_INCOME_TAX);
  }
  return income;
}

// ------------------------------------------------------------------ entry point

/** Builds the starting economy for every owned state. Pure. */
export function initEconomy(state: GameState): GameState {
  const states: Record<string, StateEconomy> = {};
  const markets: Record<string, Market> = {};
  const countries: Record<string, CountryEconomy> = {};

  const countryPop: Record<string, number> = {};
  for (const stateDef of Object.values(state.states)) {
    if (!stateDef.owner) continue;
    const def = STATE_ECONOMY[stateDef.id];
    if (!def) continue;
    countryPop[stateDef.owner] = (countryPop[stateDef.owner] ?? 0) + def.population;
  }

  for (const tag of Object.keys(state.countries)) {
    markets[tag] = emptyMarket();
    countries[tag] = emptyCountryEconomy(countryPop[tag] ?? 0);
  }

  for (const stateDef of Object.values(state.states)) {
    const tag = stateDef.owner;
    if (!tag) continue;
    const def = STATE_ECONOMY[stateDef.id];
    if (!def) continue;
    const dev = developmentOf(tag);
    const isCapital = state.countries[tag]?.capital === stateDef.id;
    const planned = planLevels(def, dev, isCapital, countryPop[tag] ?? def.population);
    const levels = scaleToPopulation(planned, def.population);
    states[stateDef.id] = buildStateEconomy(def, levels);
  }

  const economy: EconomyState = { states, markets, countries };
  seedArmies(state, economy);
  return { ...state, economy };
}
