// Investment: every non-player country queues the most profitable building it can staff.
// During warm-up (pre-1836 calibration) levels are added instantly and loss-making
// buildings shrink, so the generated start state is close to market equilibrium.

import { BUILDINGS, MAX_POINTS_PER_PROJECT } from '../../data/economy/buildings';
import { GOODS } from '../../data/economy/goods';
import { POP_TYPES } from '../../data/economy/pops';
import type { StateDef } from '../types';
import { unlockedFor } from '../politics/unlocks';
import { DEFAULT_ARMY_SHARE, START_ARMIES } from '../../data/diplomacy/start1836';
import { BATTALION_SIZE } from '../../data/diplomacy/rules';

import stateEconomyJson from '../../data/stateEconomy.json';
const POP_1836 = stateEconomyJson as unknown as Record<string, { population: number }>;
/** 1836 population of the states a country holds now (START_ARMIES scale with growth since). */
function startPop(_eco: EconomyState, stateIds: string[], _tag: string): number {
  let p = 0;
  for (const sid of stateIds) p += POP_1836[sid]?.population ?? 0;
  return p;
}
import type { BuildingDef, CountryEconomy, EconomyState, GoodId, Market, PopTypeId, StateEconomy } from './types';

const PRIVATE: BuildingDef[] = Object.values(BUILDINGS).filter((b) => b.owner !== 'government');

type Surplus = Partial<Record<GoodId, number>>;

/** Goods left over in a market last week (supply + imports − demand), available to new users. */
export function surplusOf(market: Market): Surplus {
  const out: Surplus = {};
  for (const g of Object.keys(market.prices) as GoodId[]) {
    out[g] = Math.max(0, (market.supply[g] ?? 0) + (market.imports[g] ?? 0) - (market.demand[g] ?? 0));
  }
  return out;
}

function profitAt(def: BuildingDef, methodId: string | undefined, market: Market, supplied: number): number {
  const m = def.methods.find((x) => x.id === methodId) ?? def.methods[0];
  if (!m) return 0;
  const price = (g: string) => market.prices[g as GoodId] ?? GOODS[g as GoodId].basePrice;
  let p = 0;
  for (const [g, a] of Object.entries(m.outputs)) p += (a ?? 0) * supplied * price(g) * (market.sellFill[g as GoodId] ?? 1);
  for (const [g, a] of Object.entries(m.inputs)) p -= (a ?? 0) * supplied * price(g);
  for (const [t, n] of Object.entries(m.employment)) p -= (n ?? 0) * POP_TYPES[t as PopTypeId].baseWage;
  return p;
}

/**
 * Profit per level for `levels` NEW levels of input demand: inputs are only as available as the
 * market's unused surplus allows. This is what stops every farm in a country from switching to
 * a tool-using method the week three tool shops open.
 */
export function marginalProfit(def: BuildingDef, methodId: string | undefined, market: Market, surplus: Surplus, levels = 1): number {
  const m = def.methods.find((x) => x.id === methodId) ?? def.methods[0];
  if (!m) return 0;
  let supplied = 1;
  for (const [g, a] of Object.entries(m.inputs)) {
    const need = (a ?? 0) * levels;
    if (need > 0) supplied = Math.min(supplied, (surplus[g as GoodId] ?? 0) / need);
  }
  return profitAt(def, methodId, market, Math.max(0, Math.min(1, supplied)));
}

/** Profit per level of a building already using `methodId` (its inputs are as available as last week). */
export function currentProfit(def: BuildingDef, methodId: string | undefined, market: Market): number {
  const m = def.methods.find((x) => x.id === methodId) ?? def.methods[0];
  if (!m) return 0;
  let supplied = 1;
  for (const g of Object.keys(m.inputs)) supplied = Math.min(supplied, market.buyFill[g as GoodId] ?? 1);
  return profitAt(def, methodId, market, supplied);
}

/** Commits `levels` levels' worth of a method's inputs against the surplus. */
function consume(def: BuildingDef, methodId: string, surplus: Surplus, levels: number): void {
  const m = def.methods.find((x) => x.id === methodId);
  for (const [g, a] of Object.entries(m?.inputs ?? {})) {
    surplus[g as GoodId] = Math.max(0, (surplus[g as GoodId] ?? 0) - (a ?? 0) * levels);
  }
}

/** Peasants not already promised to open jobs in the state. */
function freeWorkers(se: StateEconomy): number {
  let open = 0;
  for (const id in se.buildings) {
    const inst = se.buildings[id] as StateEconomy['buildings'][string];
    const def = BUILDINGS[inst.id];
    if (!def) continue;
    let employed = 0;
    for (const k in inst.employed) employed += inst.employed[k as PopTypeId] ?? 0;
    const jobs = jobsPerLevel(def) * inst.level;
    if (jobs > employed) open += jobs - employed;
  }
  return (se.pops.peasants ?? 0) - open;
}

const jobsCache = new Map<string, number>();
function jobsPerLevel(def: BuildingDef): number {
  let j = jobsCache.get(def.id);
  if (j === undefined) {
    const m = def.methods[0];
    j = m ? Object.values(m.employment).reduce((a: number, b) => a + (b ?? 0), 0) : 0;
    jobsCache.set(def.id, j);
  }
  return j;
}

/** Remaining capacity for one more level, counting queued items. Infinity = uncapped. */
function room(se: StateEconomy, def: BuildingDef, queued: (id: string) => number): number {
  const lv = (id: string) => (se.buildings[id]?.level ?? 0) + queued(id);
  if (def.urban) return se.urbanCap - lv(def.id);
  if (!def.resource) return Infinity;
  const cap = se.resources[def.resource] ?? 0;
  if (def.resource === 'arable') return cap - lv('farm') - lv('ranch');
  return cap - lv(def.id);
}

interface Candidate { stateId: string; def: BuildingDef; method: string; score: number }

/** Most profitable method for a new level. */
export function bestMethod(def: BuildingDef, market: Market, surplus: Surplus, techs?: readonly string[]): { id: string; profit: number } {
  let best = { id: def.methods[0]?.id ?? '', profit: -Infinity };
  for (const m of def.methods) {
    if (!unlockedFor(techs, m.id)) continue;
    const p = marginalProfit(def, m.id, market, surplus);
    if (p > best.profit) best = { id: m.id, profit: p };
  }
  return best;
}

function candidates(
  eco: EconomyState, stateIds: string[], market: Market, c: CountryEconomy, surplus: Surplus,
  techs?: readonly string[], bestOnly = false,
): Candidate[] {
  const out: Candidate[] = [];
  let best: Candidate | null = null;
  // method choice per building type: existing method id ('' = new building) -> choice
  const methodCache = new Map<string, Map<string, { id: string; profit: number }>>();
  // queued levels per state and building, and jobs already promised per state
  const queued = new Map<string, Map<string, number>>();
  const queuedJobs = new Map<string, number>();
  for (const q of c.queue) {
    let m = queued.get(q.stateId);
    if (!m) queued.set(q.stateId, (m = new Map()));
    m.set(q.buildingId, (m.get(q.buildingId) ?? 0) + 1);
    const def = BUILDINGS[q.buildingId];
    if (def) queuedJobs.set(q.stateId, (queuedJobs.get(q.stateId) ?? 0) + jobsPerLevel(def));
  }
  const defs = PRIVATE.filter((d) => unlockedFor(techs, d.id));
  const none = new Map<string, number>();
  for (const sid of stateIds) {
    const se = eco.states[sid];
    if (!se) continue;
    const free = freeWorkers(se) - (queuedJobs.get(sid) ?? 0);
    if (free <= 0) continue;
    const q = queued.get(sid) ?? none;
    const queuedHere = (id: string) => q.get(id) ?? 0;
    for (const def of defs) {
      if (free < jobsPerLevel(def)) continue; // nobody to staff it
      if (room(se, def, queuedHere) < 1) continue;
      const existing = se.buildings[def.id]?.method ?? '';
      let byMethod = methodCache.get(def.id);
      if (!byMethod) methodCache.set(def.id, (byMethod = new Map()));
      let choice = byMethod.get(existing);
      if (!choice) {
        choice = existing ? { id: existing, profit: marginalProfit(def, existing, market, surplus) } : bestMethod(def, market, surplus, techs);
        byMethod.set(existing, choice);
      }
      if (choice.profit <= 0) continue;
      const score = choice.profit / def.cost;
      if (bestOnly) {
        if (!best || score > best.score || (score === best.score && (sid < best.stateId || (sid === best.stateId && def.id < best.def.id)))) {
          best = { stateId: sid, def, method: choice.id, score };
        }
      } else out.push({ stateId: sid, def, method: choice.id, score });
    }
  }
  if (bestOnly) return best ? [best] : [];
  out.sort((a, b) => (better(a, b) ? -1 : better(b, a) ? 1 : 0));
  return out;
}

/** Higher score first; deterministic tie-break by state then building id. */
function better(a: Candidate, b: Candidate): boolean {
  if (a.score !== b.score) return a.score > b.score;
  if (a.stateId !== b.stateId) return a.stateId < b.stateId;
  return a.def.id < b.def.id;
}

function addLevel(se: StateEconomy, def: BuildingDef, method: string): void {
  const inst = se.buildings[def.id];
  if (inst) inst.level += 1;
  else se.buildings[def.id] = { id: def.id, level: 1, method, employed: {}, lastRevenue: 0, lastCosts: 0, lastProfit: 0, inputFill: 1 };
}

/**
 * AI countries move buildings to a more profitable method (every 4th week). A switch must
 * beat the current method by 10% and its extra inputs are reserved from the surplus, so
 * only as many buildings switch as the market can supply.
 */
function switchMethods(eco: EconomyState, stateIds: string[], market: Market, surplus: Surplus, techs?: readonly string[]): void {
  for (const sid of stateIds) {
    for (const inst of Object.values(eco.states[sid]?.buildings ?? {})) {
      const def = BUILDINGS[inst.id];
      if (!def || def.owner === 'government' || def.methods.length < 2 || inst.level <= 0) continue;
      const now = currentProfit(def, inst.method, market);
      let best: { id: string; profit: number } | null = null;
      for (const m of def.methods) {
        if (m.id === inst.method || !unlockedFor(techs, m.id)) continue;
        const p = marginalProfit(def, m.id, market, surplus, inst.level);
        if (p > now + Math.abs(now) * 0.1 && (!best || p > best.profit)) best = { id: m.id, profit: p };
      }
      if (best) {
        consume(def, best.id, surplus, inst.level);
        inst.method = best.id;
      }
    }
  }
}

/**
 * Runs after construction in the weekly tick, on the (already copied) economy.
 * @param warmup  pre-1836 calibration: instant levels and shrinking of loss makers.
 * @param week    tick counter, used to pace shrinking deterministically.
 */
export function investmentStep(
  eco: EconomyState, stateDefs: Record<string, StateDef>, player: string | null, warmup: boolean, week: number,
  techsOf: (tag: string) => readonly string[] | undefined = () => undefined,
  atWar: (tag: string) => boolean = () => false,
): void {
  const byTag = new Map<string, string[]>();
  for (const sid of Object.keys(eco.states).sort()) {
    const tag = stateDefs[sid]?.owner;
    if (!tag) continue;
    let list = byTag.get(tag);
    if (!list) byTag.set(tag, (list = []));
    list.push(sid);
  }

  for (const tag of [...byTag.keys()].sort()) {
    if (tag === player && !warmup) continue;
    const c = eco.countries[tag];
    const market = eco.markets[tag];
    const stateIds = byTag.get(tag) ?? [];
    if (!c || !market) continue;

    const surplus = surplusOf(market);
    const techs = techsOf(tag);
    if (week % 4 === 0) switchMethods(eco, stateIds, market, surplus, techs);

    if (warmup) {
      // shrink loss makers every 4th week
      if (week % 4 === 0) {
        for (const sid of stateIds) {
          for (const inst of Object.values(eco.states[sid]?.buildings ?? {})) {
            const def = BUILDINGS[inst.id];
            if (!def || def.owner === 'government' || inst.level <= 0) continue;
            if (inst.lastProfit < 0) { inst.level -= 1; continue; }
            // drop levels nobody has come to work in
            const per = jobsPerLevel(def);
            let employed = 0;
            for (const n of Object.values(inst.employed)) employed += n ?? 0;
            const staffed = per > 0 ? Math.ceil(employed / per) : inst.level;
            if (staffed < inst.level - 1) inst.level = Math.max(1, staffed + 1);
          }
        }
      }
      let pop = 0;
      for (const sid of stateIds) for (const n of Object.values(eco.states[sid]?.pops ?? {})) pop += n;
      const levels = Math.max(1, Math.ceil(pop / 2_000_000));
      const used = new Set<string>();
      let added = 0;
      for (const p of candidates(eco, stateIds, market, c, surplus, techs)) {
        if (added >= levels) break;
        if (used.has(p.stateId)) continue; // at most one new level per state per week
        const se = eco.states[p.stateId];
        if (!se) continue;
        if (marginalProfit(p.def, p.method, market, surplus) <= 0) continue; // surplus used up meanwhile
        consume(p.def, p.method, surplus, 1);
        addLevel(se, p.def, p.method);
        used.add(p.stateId);
        added++;
      }
      continue;
    }

    // Tax policy: aim for a treasury of roughly 8–52 weeks of expenses.
    if (week % 4 === 0) {
      const weekly = Math.max(1, c.lastExpenses);
      if (c.treasury > 52 * weekly && c.incomeTaxRate > 0.02) c.incomeTaxRate = Math.max(0.02, c.incomeTaxRate - 0.01);
      else if (c.treasury < 8 * weekly && c.incomeTaxRate < 0.3) c.incomeTaxRate = Math.min(0.3, c.incomeTaxRate + 0.01);
    }

    // Keep enough projects queued to absorb the construction points, plus one spare because each
    // country only re-plans every other week (spreads the cost of planning across ticks).
    if ((week + tagParity(tag)) % 2 !== 0) continue;
    const wanted = Math.max(1, Math.ceil(c.constructionPoints / MAX_POINTS_PER_PROJECT)) + 1;
    if (c.queue.length >= wanted) continue;
    // Keep the army at its peacetime size (1836 strength scaled with population), more in wartime.
    const barracksQueued = c.queue.some((q) => q.buildingId === 'barracks');
    if (!barracksQueued && c.treasury > 12 * Math.max(1, c.lastExpenses)) {
      let pop = 0;
      let levels = 0;
      let bestState: string | null = null;
      let bestPop = -1;
      for (const sid of stateIds) {
        const se = eco.states[sid];
        if (!se) continue;
        let p = 0;
        for (const n of Object.values(se.pops)) p += n;
        pop += p;
        levels += se.buildings.barracks?.level ?? 0;
        if (p > bestPop) { bestPop = p; bestState = sid; }
      }
      const base = START_ARMIES[tag] !== undefined ? START_ARMIES[tag] * (pop / Math.max(1, startPop(eco, stateIds, tag))) : (pop * DEFAULT_ARMY_SHARE) / BATTALION_SIZE;
      const target = Math.round(base * (atWar(tag) ? 1.5 : 1));
      if (bestState && levels < target) {
        c.queue.push({ stateId: bestState, buildingId: 'barracks', progress: 0 });
        continue;
      }
    }
    // A rich treasury with little construction capacity: expand the construction sector first.
    const capital = stateIds.find((sid) => eco.states[sid]?.buildings.construction_sector) ?? stateIds[0];
    const sectorQueued = c.queue.some((q) => q.buildingId === 'construction_sector');
    if (capital && !sectorQueued && c.treasury > 26 * Math.max(1, c.lastExpenses) && c.lastIncome > c.lastExpenses) {
      c.queue.push({ stateId: capital, buildingId: 'construction_sector', progress: 0 });
      continue;
    }
    const best = candidates(eco, stateIds, market, c, surplus, techs, true)[0];
    if (best) c.queue.push({ stateId: best.stateId, buildingId: best.def.id, progress: 0 });
  }
}

function tagParity(tag: string): number {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h += tag.charCodeAt(i);
  return h % 2;
}
