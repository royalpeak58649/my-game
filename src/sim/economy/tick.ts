// Weekly economy tick — see docs/ECONOMY.md, "Weekly tick".
//
// Pure from the caller's point of view: the economy is copied once (fast, shape-aware copy)
// and the returned GameState shares everything else with the input. Internally the tick
// works on flat typed arrays (market × good, state × pop type) and writes the results back
// into the plain records at the end, which keeps a world-sized tick in the low tens of ms.

import { BASE_CONSTRUCTION_POINTS, BUILDINGS, MAX_POINTS_PER_PROJECT } from '../../data/economy/buildings';
import { UPKEEP_PER_CAPITA } from '../../data/economy/development';
import { MOBILIZATION_MULT, MOBILIZED_UPKEEP } from '../../data/diplomacy/rules';
import { TRADE_FLOOR } from '../../data/navy/rules';
import {
  GOODS, GOOD_IDS, PRICE_ELASTICITY, PRICE_MAX_FACTOR, PRICE_MIN_FACTOR, PRICE_SMOOTHING, WORLD_TRADE_SHARE,
} from '../../data/economy/goods';
import { MAX_CONSUMPTION_SCALE, NEEDS, POP_TYPES, POP_TYPE_IDS, standardOfLiving, yearlyGrowth } from '../../data/economy/pops';
import type { GameState } from '../types';
import { investmentStep } from './investment';
import type { Modifiers } from '../politics/types';
import type {
  BuildingDef, BuildingInstance, ConstructionItem, CountryEconomy, EconomyState, GoodId, Market,
  PopTypeId, ProductionMethodDef, StateEconomy, WealthTier,
} from './types';

/** Share of every employed type fired per week while a building loses money. */
export const FIRE_RATE = 0.05;

const G = GOOD_IDS.length;
const P = POP_TYPE_IDS.length;
const PEASANTS = POP_TYPE_IDS.indexOf('peasants');
const FARMERS = POP_TYPE_IDS.indexOf('farmers');
const ARISTOCRATS = POP_TYPE_IDS.indexOf('aristocrats');
const CAPITALISTS = POP_TYPE_IDS.indexOf('capitalists');
const TIERS: WealthTier[] = ['subsistence', 'lower', 'middle', 'upper'];
const T = TIERS.length;

const BASE = Float64Array.from(GOOD_IDS, (g) => GOODS[g].basePrice);
const POP_TIER = Int32Array.from(POP_TYPE_IDS, (p) => TIERS.indexOf(POP_TYPES[p].tier));
const POP_WAGE = Float64Array.from(POP_TYPE_IDS, (p) => POP_TYPES[p].baseWage);
const POP_HIRE = Float64Array.from(POP_TYPE_IDS, (p) => POP_TYPES[p].hireRate);
const POP_SUBSIST = Float64Array.from(POP_TYPE_IDS, (p) => POP_TYPES[p].subsistenceIncome ?? 0);

interface Sparse { idx: Int32Array; amt: Float64Array }
function sparse(rec: Partial<Record<GoodId, number>>): Sparse {
  const idx: number[] = [];
  const amt: number[] = [];
  for (let g = 0; g < G; g++) {
    const a = rec[GOOD_IDS[g]] ?? 0;
    if (a > 0) { idx.push(g); amt.push(a); }
  }
  return { idx: Int32Array.from(idx), amt: Float64Array.from(amt) };
}

const BASKETS: Sparse[] = TIERS.map((t) => sparse(NEEDS[t]));

interface MethodVec {
  inputs: Sparse;
  outputs: Sparse;
  jobs: Float64Array; // per level, by pop index
  jobsTotal: number;
  construction: number;
}
const methodCache = new Map<ProductionMethodDef, MethodVec>();
function vec(m: ProductionMethodDef): MethodVec {
  let v = methodCache.get(m);
  if (!v) {
    const jobs = Float64Array.from(POP_TYPE_IDS, (p) => m.employment[p] ?? 0);
    v = {
      inputs: sparse(m.inputs), outputs: sparse(m.outputs), jobs,
      jobsTotal: jobs.reduce((a, b) => a + b, 0), construction: m.construction ?? 0,
    };
    methodCache.set(m, v);
  }
  return v;
}
function methodOf(def: BuildingDef, inst: BuildingInstance): ProductionMethodDef {
  for (const m of def.methods) if (m.id === inst.method) return m;
  return def.methods[0] as ProductionMethodDef;
}

const fin = (x: number, fallback = 0): number => (Number.isFinite(x) ? x : fallback);

// ----------------------------------------------------------------------- copy

function cloneEconomy(e: EconomyState): EconomyState {
  const states: Record<string, StateEconomy> = {};
  for (const id in e.states) {
    const s = e.states[id] as StateEconomy;
    const buildings: Record<string, BuildingInstance> = {};
    for (const b in s.buildings) {
      const inst = s.buildings[b] as BuildingInstance;
      buildings[b] = { ...inst, employed: { ...inst.employed } };
    }
    states[id] = {
      pops: { ...s.pops }, income: { ...s.income }, sol: { ...s.sol }, buildings,
      resources: s.resources, urbanCap: s.urbanCap, coastal: s.coastal, // static: shared
    };
  }
  const markets: Record<string, Market> = {};
  for (const tag in e.markets) {
    const m = e.markets[tag] as Market;
    markets[tag] = {
      prices: { ...m.prices }, supply: { ...m.supply }, demand: { ...m.demand },
      buyFill: { ...m.buyFill }, sellFill: { ...m.sellFill },
      exports: { ...(m.exports ?? m.supply) }, imports: { ...(m.imports ?? m.supply) },
    };
  }
  const countries: Record<string, CountryEconomy> = {};
  for (const tag in e.countries) {
    const c = e.countries[tag] as CountryEconomy;
    countries[tag] = { ...c, queue: c.queue.map((q) => ({ ...q })) };
  }
  return { ...(e.warmup ? { warmup: true } : {}), states, markets, countries };
}

export function createBuildingInstance(buildingId: string): BuildingInstance | null {
  const def = BUILDINGS[buildingId];
  const m = def?.methods[0];
  if (!def || !m) return null;
  return { id: def.id, level: 1, method: m.id, employed: {}, lastRevenue: 0, lastCosts: 0, lastProfit: 0, inputFill: 1 };
}

// ----------------------------------------------------------------------- tick

interface BRef { inst: BuildingInstance; def: BuildingDef; v: MethodVec; gov: boolean }
interface SRef { id: string; eco: StateEconomy; m: number; tag: string; country: CountryEconomy; b: BRef[] }

export function economyTick(state: GameState): GameState {
  const eco = cloneEconomy(state.economy);
  const next: GameState = { ...state, economy: eco };

  // --- index markets and states
  const tags = Object.keys(eco.markets).sort();
  const mIndex = new Map<string, number>();
  tags.forEach((t, i) => mIndex.set(t, i));
  const M = tags.length;
  const markets = tags.map((t) => eco.markets[t] as Market);
  // law and technology effects per market (see docs/POLITICS.md, "Economy hooks")
  const mods: Modifiers[] = tags.map((t) => state.politics?.countries[t]?.modifiers ?? {});
  // sea trade needs convoys: a shortfall cuts world-market access (docs/NAVY.md)
  const tradeShare = Float64Array.from(mods, (x, i) => {
    const navy = state.military?.navies?.[tags[i] as string];
    const supply = navy && navy.convoyNeedTrade > 0 ? navy.supply : 1;
    return (x.tradeShare ?? WORLD_TRADE_SHARE) * (TRADE_FLOOR + (1 - TRADE_FLOOR) * supply);
  });
  const hireMult = Float64Array.from(mods, (x) => x.hireRateMult ?? 1);
  const wageMult = Float64Array.from(mods, (x) => x.wageMult ?? 1);
  const taxEff = Float64Array.from(mods, (x) => x.taxEfficiency ?? 1);
  const outMult = Float64Array.from(mods, (x) => x.outputMult ?? 1);
  const indMult = Float64Array.from(mods, (x) => (x.outputMult ?? 1) * (x.industryOutputMult ?? 1));
  const upkeepMult = new Map(tags.map((t, i) => [t, mods[i]?.upkeepMult ?? 1]));
  // mobilised armies consume twice the small arms and cost conscript pay (docs/WAR.md)
  const mobilized = tags.map((t) => state.military?.armies[t]?.mobilized === true);
  const armyInput = Float64Array.from(mobilized, (m) => (m ? MOBILIZATION_MULT : 1));

  const refs: SRef[] = [];
  for (const id of Object.keys(eco.states).sort()) {
    const tag = state.states[id]?.owner;
    if (!tag) continue;
    const m = mIndex.get(tag);
    const country = eco.countries[tag];
    if (m === undefined || !country) continue;
    const se = eco.states[id] as StateEconomy;
    const b: BRef[] = [];
    for (const bid of Object.keys(se.buildings).sort()) {
      const inst = se.buildings[bid] as BuildingInstance;
      const def = BUILDINGS[inst.id];
      if (!def) continue;
      b.push({ inst, def, v: vec(methodOf(def, inst)), gov: def.owner === 'government' });
    }
    refs.push({ id, eco: se, m, tag, country, b });
  }
  const S = refs.length;

  // --- market arrays (last week's prices and fills)
  const price = new Float64Array(M * G);
  const lastBuyFill = new Float64Array(M * G);
  const supply = new Float64Array(M * G);
  const demand = new Float64Array(M * G);
  for (let m = 0; m < M; m++) {
    const mk = markets[m] as Market;
    for (let g = 0; g < G; g++) {
      const id = GOOD_IDS[g] as GoodId;
      price[m * G + g] = fin(mk.prices[id], BASE[g]);
      lastBuyFill[m * G + g] = Math.min(1, Math.max(0, fin(mk.buyFill[id], 1)));
    }
  }

  // --- per-state scratch
  const pops = new Float64Array(S * P);
  const popStart = new Float64Array(S);
  const solStart = new Float64Array(S);
  for (let s = 0; s < S; s++) {
    const se = (refs[s] as SRef).eco;
    for (let p = 0; p < P; p++) {
      const id = POP_TYPE_IDS[p] as PopTypeId;
      const n = Math.max(0, fin(se.pops[id] ?? 0));
      pops[s * P + p] = n;
      popStart[s] += n;
      solStart[s] += n * fin(se.sol[id] ?? 0);
    }
  }

  // ============================================================ 1. employment
  for (let s = 0; s < S; s++) {
    const r = refs[s] as SRef;
    const austerity = fin(r.country.treasury) < 0;
    for (const br of r.b) {
      const { inst, v } = br;
      const emp = inst.employed;
      const level = Math.max(0, fin(inst.level));
      const fire = br.gov ? austerity && staffingOf(br) > 0.5 : fin(inst.lastProfit) < 0;
      if (fire) {
        for (let p = 0; p < P; p++) {
          const id = POP_TYPE_IDS[p] as PopTypeId;
          const cur = emp[id] ?? 0;
          if (cur <= 0) continue;
          const fired = Math.floor(cur * FIRE_RATE);
          if (fired <= 0) continue;
          if (cur - fired > 0) emp[id] = cur - fired; else delete emp[id];
          pops[s * P + p] = Math.max(0, (pops[s * P + p] as number) - fired);
          pops[s * P + PEASANTS] += fired;
        }
        continue;
      }
      for (let p = 0; p < P; p++) {
        const jobs = level * (v.jobs[p] as number);
        const id = POP_TYPE_IDS[p] as PopTypeId;
        const cur = emp[id] ?? 0;
        if (cur > jobs) {
          // more workers than jobs (level removed or method changed): release the excess
          const excess = cur - jobs;
          if (jobs > 0) emp[id] = jobs; else delete emp[id];
          pops[s * P + p] = Math.max(0, (pops[s * P + p] as number) - excess);
          pops[s * P + PEASANTS] += excess;
          continue;
        }
        if (jobs <= 0) continue;
        const open = jobs - cur;
        if (open <= 0) continue;
        const peasants = pops[s * P + PEASANTS] as number;
        if (peasants < 1) break;
        const rate = (POP_HIRE[p] as number) * (p === FARMERS || p === ARISTOCRATS || p === CAPITALISTS ? 1 : (hireMult[r.m] as number));
        const hire = Math.min(open, Math.ceil(open * rate), Math.floor(peasants));
        if (hire <= 0) continue;
        emp[id] = (emp[id] ?? 0) + hire;
        pops[s * P + p] += hire;
        pops[s * P + PEASANTS] = peasants - hire;
      }
    }
  }

  // ============================================================ 2. production
  const construction = new Float64Array(S);
  const staffing: number[][] = [];
  for (let s = 0; s < S; s++) {
    const r = refs[s] as SRef;
    const base = r.m * G;
    const st: number[] = [];
    for (const br of r.b) {
      const { inst, v } = br;
      const level = Math.max(0, fin(inst.level));
      const staff = staffingOf(br);
      st.push(staff);
      let fill = 1;
      for (let k = 0; k < v.inputs.idx.length; k++) {
        const f = lastBuyFill[base + (v.inputs.idx[k] as number)] as number;
        if (f < fill) fill = f;
      }
      inst.inputFill = fill;
      for (let k = 0; k < v.inputs.idx.length; k++) {
        demand[base + (v.inputs.idx[k] as number)] += level * (v.inputs.amt[k] as number) * staff * (br.def.id === 'barracks' ? (armyInput[r.m] as number) : 1);
      }
      const scale = level * staff * fill * ((br.def.group === 'industry' ? indMult[r.m] : outMult[r.m]) as number);
      for (let k = 0; k < v.outputs.idx.length; k++) {
        supply[base + (v.outputs.idx[k] as number)] += (v.outputs.amt[k] as number) * scale;
      }
      construction[s] += v.construction * scale;
    }
    staffing.push(st);
  }

  // ============================================================ 3. pop demand
  const basketCost = (out: Float64Array) => {
    for (let m = 0; m < M; m++) {
      for (let t = 0; t < T; t++) {
        const bk = BASKETS[t] as Sparse;
        let c = 0;
        for (let k = 0; k < bk.idx.length; k++) c += (bk.amt[k] as number) * (price[m * G + (bk.idx[k] as number)] as number);
        out[m * T + t] = c;
      }
    }
  };
  const cost = new Float64Array(M * T);
  basketCost(cost);
  for (let s = 0; s < S; s++) {
    const r = refs[s] as SRef;
    const base = r.m * G;
    for (let p = 0; p < P; p++) {
      const n = pops[s * P + p] as number;
      if (n <= 0) continue;
      const t = POP_TIER[p] as number;
      const scale = consumptionScale(fin(r.eco.income[POP_TYPE_IDS[p] as PopTypeId] ?? 0), cost[r.m * T + t] as number);
      if (scale <= 0) continue;
      const bk = BASKETS[t] as Sparse;
      for (let k = 0; k < bk.idx.length; k++) demand[base + (bk.idx[k] as number)] += n * (bk.amt[k] as number) * scale;
    }
  }

  // ============================================================ 4. world trade + clearing
  const exportsA = new Float64Array(M * G);
  const importsA = new Float64Array(M * G);
  for (let g = 0; g < G; g++) {
    let offered = 0;
    let sought = 0;
    for (let m = 0; m < M; m++) {
      const e = (supply[m * G + g] as number) - (demand[m * G + g] as number);
      const share = tradeShare[m] as number;
      if (e > 0) offered += e * share; else sought += -e * share;
    }
    const matched = Math.min(offered, sought);
    if (matched <= 0) continue;
    for (let m = 0; m < M; m++) {
      const e = (supply[m * G + g] as number) - (demand[m * G + g] as number);
      const share = tradeShare[m] as number;
      if (e > 0) exportsA[m * G + g] = e * share * (matched / offered);
      else if (e < 0) importsA[m * G + g] = -e * share * (matched / sought);
    }
  }
  const buyFill = new Float64Array(M * G);
  const sellFill = new Float64Array(M * G);
  for (let i = 0; i < M * G; i++) {
    const g = i % G;
    const d = demand[i] as number;
    const sup = (supply[i] as number) - (exportsA[i] as number) + (importsA[i] as number); // available locally
    const sold = d + (exportsA[i] as number); // local sales + shipments abroad
    buyFill[i] = d > 0 ? Math.min(1, sup / d) : 1;
    sellFill[i] = (supply[i] as number) > 0 ? Math.min(1, sold / (supply[i] as number)) : 1;
    const b = BASE[g] as number;
    const imbalance = (d - sup) / Math.max(d, sup, 1);
    const target = b * clamp(1 + PRICE_ELASTICITY * imbalance, PRICE_MIN_FACTOR, PRICE_MAX_FACTOR);
    const p0 = price[i] as number;
    price[i] = clamp(p0 + (target - p0) * PRICE_SMOOTHING, b * PRICE_MIN_FACTOR, b * PRICE_MAX_FACTOR);
  }

  // ============================================================ 5. money
  const wages = new Float64Array(S * P);
  const dividends = new Float64Array(S * P);
  const govCost = new Float64Array(S);
  for (let s = 0; s < S; s++) {
    const r = refs[s] as SRef;
    const base = r.m * G;
    const st = staffing[s] as number[];
    r.b.forEach((br, bi) => {
      const { inst, v } = br;
      const level = Math.max(0, fin(inst.level));
      const staff = st[bi] as number;
      let revenue = 0;
      if (!br.gov) {
        const scale = level * staff * inst.inputFill * ((br.def.group === 'industry' ? indMult[r.m] : outMult[r.m]) as number);
        for (let k = 0; k < v.outputs.idx.length; k++) {
          const i = base + (v.outputs.idx[k] as number);
          revenue += (v.outputs.amt[k] as number) * scale * (sellFill[i] as number) * (price[i] as number);
        }
      }
      let inputCost = 0;
      for (let k = 0; k < v.inputs.idx.length; k++) {
        const i = base + (v.inputs.idx[k] as number);
        inputCost += level * (v.inputs.amt[k] as number) * staff * (buyFill[i] as number) * (price[i] as number) * (br.def.id === 'barracks' ? (armyInput[r.m] as number) : 1);
      }
      let wageBill = 0;
      const wm = wageMult[r.m] as number;
      for (let p = 0; p < P; p++) wageBill += (inst.employed[POP_TYPE_IDS[p] as PopTypeId] ?? 0) * (POP_WAGE[p] as number) * wm;
      const profit = revenue - inputCost - wageBill;
      inst.lastRevenue = revenue;
      inst.lastCosts = inputCost + wageBill;
      inst.lastProfit = profit;
      // a private building pays out at most what it earns (no money creation on losses)
      const payable = br.gov ? wageBill : Math.min(wageBill, Math.max(0, revenue - inputCost));
      const factor = wageBill > 0 ? payable / wageBill : 0;
      if (factor > 0) {
        for (let p = 0; p < P; p++) {
          const n = inst.employed[POP_TYPE_IDS[p] as PopTypeId] ?? 0;
          if (n > 0) wages[s * P + p] += n * (POP_WAGE[p] as number) * wm * factor;
        }
      }
      if (br.gov) govCost[s] += inputCost + wageBill;
      else if (profit > 0) dividends[s * P + POP_TYPE_IDS.indexOf(br.def.owner as PopTypeId)] += profit;
    });
  }

  // ============================================================ 6. pop income
  basketCost(cost); // with the new prices
  const taxes = new Float64Array(S);
  for (let s = 0; s < S; s++) {
    const r = refs[s] as SRef;
    const rate = clamp(fin(r.country.incomeTaxRate), 0, 0.5) * (taxEff[r.m] as number);
    for (let p = 0; p < P; p++) {
      const id = POP_TYPE_IDS[p] as PopTypeId;
      const n = pops[s * P + p] as number;
      let net = 0;
      if (p === PEASANTS) net = POP_SUBSIST[p] as number;
      else if (n > 0) {
        const gross = ((wages[s * P + p] as number) + (dividends[s * P + p] as number)) / n;
        taxes[s] += gross * rate * n;
        net = gross * (1 - rate);
      }
      r.eco.income[id] = net;
      r.eco.sol[id] = standardOfLiving(consumptionScale(net, cost[r.m * T + (POP_TIER[p] as number)] as number));
    }
  }

  // ============================================================ 7. government
  const byTag = new Map<string, { inc: number; exp: number; pts: number; pop: number }>();
  for (let s = 0; s < S; s++) {
    const r = refs[s] as SRef;
    const a = byTag.get(r.tag) ?? { inc: 0, exp: 0, pts: 0, pop: 0 };
    a.inc += taxes[s] as number;
    a.exp += govCost[s] as number;
    a.pts += construction[s] as number;
    a.pop += popStart[s] as number;
    byTag.set(r.tag, a);
  }
  for (const tag of Object.keys(eco.countries).sort()) {
    const c = eco.countries[tag] as CountryEconomy;
    const a = byTag.get(tag) ?? { inc: 0, exp: 0, pts: 0, pop: 0 };
    const army = state.military?.armies[tag];
    const upkeep = a.pop * UPKEEP_PER_CAPITA * (upkeepMult.get(tag) ?? 1) + (army?.mobilized ? army.battalions * MOBILIZED_UPKEEP : 0);
    c.lastIncome = a.inc;
    c.lastUpkeep = upkeep;
    c.lastExpenses = a.exp + upkeep;
    c.constructionPoints = BASE_CONSTRUCTION_POINTS + a.pts;
    c.treasury = fin(c.treasury) + a.inc - a.exp - upkeep;
  }

  // ============================================================ 8. construction
  for (const tag of Object.keys(eco.countries).sort()) {
    const c = eco.countries[tag] as CountryEconomy;
    if (c.queue.length === 0) continue;
    let points = Math.max(0, fin(c.constructionPoints));
    const remaining: ConstructionItem[] = [];
    for (const item of c.queue) {
      const def = BUILDINGS[item.buildingId];
      if (!def) continue;
      if (points <= 0) { remaining.push(item); continue; }
      const spend = Math.min(points, MAX_POINTS_PER_PROJECT);
      points -= spend;
      item.progress = Math.max(0, fin(item.progress)) + spend;
      if (item.progress < def.cost) { remaining.push(item); continue; }
      const se = eco.states[item.stateId];
      if (!se) continue;
      const existing = se.buildings[item.buildingId];
      if (existing) existing.level = Math.max(0, fin(existing.level)) + 1;
      else {
        const created = createBuildingInstance(item.buildingId);
        if (created) se.buildings[item.buildingId] = created;
      }
    }
    c.queue = remaining;
  }

  // ============================================================ 9. growth (after write-back below)
  for (let s = 0; s < S && eco.warmup !== true; s++) { // no growth during pre-1836 calibration
    const total = popStart[s] as number;
    if (total <= 0) continue;
    const added = Math.round((total * yearlyGrowth((solStart[s] as number) / total)) / 52);
    if (added > 0) pops[s * P + PEASANTS] += added;
  }

  // ============================================================ write back
  for (let s = 0; s < S; s++) {
    const se = (refs[s] as SRef).eco;
    for (let p = 0; p < P; p++) se.pops[POP_TYPE_IDS[p] as PopTypeId] = Math.round(pops[s * P + p] as number);
  }
  for (let m = 0; m < M; m++) {
    const mk = markets[m] as Market;
    for (let g = 0; g < G; g++) {
      const id = GOOD_IDS[g] as GoodId;
      const i = m * G + g;
      mk.prices[id] = price[i] as number;
      mk.supply[id] = supply[i] as number;
      mk.demand[id] = demand[i] as number;
      mk.buyFill[id] = buyFill[i] as number;
      mk.sellFill[id] = sellFill[i] as number;
      mk.exports[id] = exportsA[i] as number;
      mk.imports[id] = importsA[i] as number;
    }
  }

  // ============================================================ 10. investment
  investmentStep(
    eco, state.states, state.player, eco.warmup === true, state.tickCount,
    (tag) => state.politics?.countries[tag]?.techs,
    (tag) => (state.military?.wars ?? []).some((w) => w.attackers.includes(tag) || w.defenders.includes(tag)),
    (tag) => {
      const navy = state.military?.navies?.[tag];
      if (!navy) return undefined;
      const need = navy.convoyNeedOverseas + navy.convoyNeedTrade;
      return { convoyShort: navy.convoyCapacity - navy.convoysLost < need * 1.05 && navy.convoyCapacity < need * 1.5 + 1 };
    },
  );
  return next;
}

// ----------------------------------------------------------------------- helpers

function staffingOf(br: BRef): number {
  const level = Math.max(0, fin(br.inst.level));
  const jobs = level * br.v.jobsTotal;
  if (jobs <= 0) return 0;
  let employed = 0;
  for (const k in br.inst.employed) employed += br.inst.employed[k as PopTypeId] ?? 0;
  return Math.min(1, employed / jobs);
}

export function consumptionScale(income: number, basketCost: number): number {
  if (!(basketCost > 0)) return MAX_CONSUMPTION_SCALE;
  const scale = income / basketCost;
  if (!(scale > 0)) return 0;
  return Math.min(MAX_CONSUMPTION_SCALE, scale);
}

function clamp(x: number, lo: number, hi: number): number {
  if (!Number.isFinite(x)) return lo;
  return x < lo ? lo : x > hi ? hi : x;
}
