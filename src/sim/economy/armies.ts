// Seeds the 1836 standing armies as barracks levels, spread over each country's most
// populous states (soldiers are recruited from those states' peasants).
import { BUILDINGS } from '../../data/economy/buildings';
import { DEFAULT_ARMY_SHARE, START_ARMIES } from '../../data/diplomacy/start1836';
import { BATTALION_SIZE } from '../../data/diplomacy/rules';
import { CONVOYS_PER_PORT, FLOTILLA_SIZE, START_NAVIES } from '../../data/navy/rules';
import { convoyAccounts } from '../navy/convoys';
import type { GameState } from '../types';
import type { EconomyState, StateEconomy } from './types';

const MAX_ARMY_SHARE_OF_STATE = 0.05; // never draft more than 5% of a state's people

function totalPop(se: StateEconomy): number {
  let n = 0;
  for (const v of Object.values(se.pops)) n += v;
  return n;
}

export function seedArmies(state: GameState, eco: EconomyState): void {
  const byTag = new Map<string, string[]>();
  for (const sid of Object.keys(eco.states).sort()) {
    const tag = state.states[sid]?.owner;
    if (!tag) continue;
    let l = byTag.get(tag);
    if (!l) byTag.set(tag, (l = []));
    l.push(sid);
  }
  const barracks = BUILDINGS.barracks;
  const method = barracks?.methods[0];
  if (!barracks || !method) return;
  for (const [tag, sids] of [...byTag.entries()].sort()) {
    const pop = sids.reduce((t, sid) => t + totalPop(eco.states[sid] as StateEconomy), 0);
    const wanted = Math.round(START_ARMIES[tag] ?? (pop * DEFAULT_ARMY_SHARE) / BATTALION_SIZE);
    if (wanted <= 0) continue;
    // distribute over the 12 most populous states, proportional to population
    const top = [...sids].sort((a, b) => totalPop(eco.states[b] as StateEconomy) - totalPop(eco.states[a] as StateEconomy) || a.localeCompare(b)).slice(0, 12);
    const topPop = top.reduce((t, sid) => t + totalPop(eco.states[sid] as StateEconomy), 0);
    let left = wanted;
    top.forEach((sid, i) => {
      const se = eco.states[sid] as StateEconomy;
      const share = i === top.length - 1 ? left : Math.round((wanted * totalPop(se)) / Math.max(1, topPop));
      const cap = Math.floor((totalPop(se) * MAX_ARMY_SHARE_OF_STATE) / BATTALION_SIZE);
      const levels = Math.max(0, Math.min(share, cap, left));
      left -= levels;
      if (levels <= 0) return;
      const soldiers = Math.min(levels * BATTALION_SIZE, se.pops.peasants);
      se.pops.peasants -= soldiers;
      se.pops.soldiers = (se.pops.soldiers ?? 0) + soldiers;
      const existing = se.buildings.barracks;
      se.buildings.barracks = {
        id: 'barracks', level: (existing?.level ?? 0) + levels, method: method.id,
        employed: { soldiers: (existing?.employed.soldiers ?? 0) + soldiers },
        lastRevenue: 0, lastCosts: 0, lastProfit: 0, inputFill: 1,
      };
    });
  }
}

const START_NAVY_STATES = 3;

/** Seeds the 1836 fleets as naval base levels in each country's most populous coastal states. */
export function seedNavies(state: GameState, eco: EconomyState): void {
  const base = BUILDINGS.naval_base;
  const method = base?.methods[0];
  if (!base || !method) return;
  const sailors = method.employment.soldiers ?? FLOTILLA_SIZE;
  const byTag = new Map<string, string[]>();
  for (const sid of Object.keys(eco.states).sort()) {
    const tag = state.states[sid]?.owner;
    if (!tag || !eco.states[sid]?.coastal) continue;
    let l = byTag.get(tag);
    if (!l) byTag.set(tag, (l = []));
    l.push(sid);
  }
  for (const [tag, sids] of [...byTag.entries()].sort()) {
    const pop = sids.reduce((t, sid) => t + totalPop(eco.states[sid] as StateEconomy), 0);
    const wanted = START_NAVIES[tag] ?? (pop > 1_000_000 ? 1 : 0);
    if (wanted <= 0) continue;
    const top = [...sids].sort((a, b) => totalPop(eco.states[b] as StateEconomy) - totalPop(eco.states[a] as StateEconomy) || a.localeCompare(b)).slice(0, START_NAVY_STATES);
    let left = wanted;
    top.forEach((sid, i) => {
      const se = eco.states[sid] as StateEconomy;
      const share = i === top.length - 1 ? left : Math.ceil(wanted / top.length);
      const cap = Math.floor((totalPop(se) * MAX_ARMY_SHARE_OF_STATE) / sailors);
      const levels = Math.max(0, Math.min(share, cap, left));
      left -= levels;
      if (levels <= 0) return;
      const men = Math.min(levels * sailors, se.pops.peasants);
      se.pops.peasants -= men;
      se.pops.soldiers = (se.pops.soldiers ?? 0) + men;
      se.buildings.naval_base = {
        id: 'naval_base', level: levels, method: method.id, employed: { soldiers: men },
        lastRevenue: 0, lastCosts: 0, lastProfit: 0, inputFill: 1,
      };
    });
  }
}

/**
 * Sizes every country's ports to its convoy needs (with a margin): run once on the calibrated
 * economy, since sea trade is only known after the warm-up. Mutates `eco`.
 */
export function seedPorts(state: GameState, eco: EconomyState): void {
  const port = BUILDINGS.port;
  const method = port?.methods[0];
  if (!port || !method) return;
  const jobs = method.employment.laborers ?? 1500;
  const accounts = convoyAccounts({ ...state, economy: eco });
  const byTag = new Map<string, string[]>();
  for (const sid of Object.keys(eco.states).sort()) {
    const tag = state.states[sid]?.owner;
    if (!tag || !eco.states[sid]?.coastal) continue;
    let l = byTag.get(tag);
    if (!l) byTag.set(tag, (l = []));
    l.push(sid);
  }
  for (const [tag, sids] of [...byTag.entries()].sort()) {
    const a = accounts.get(tag);
    if (!a) continue;
    const need = (a.needOverseas + a.needTrade) * 1.15;
    let levels = Math.max(1, Math.ceil(need / CONVOYS_PER_PORT));
    // the most populous coastal states first, at most 8 levels each
    const order = [...sids].sort((x, y) => totalPop(eco.states[y] as StateEconomy) - totalPop(eco.states[x] as StateEconomy) || x.localeCompare(y));
    for (const sid of order) {
      const se = eco.states[sid] as StateEconomy;
      while (levels > 0 && (se.buildings.port?.level ?? 0) < 8) {
        const men = Math.min(jobs, se.pops.peasants);
        if (men < jobs * 0.5) break;
        const inst = se.buildings.port;
        se.pops.peasants -= men;
        se.pops.laborers = (se.pops.laborers ?? 0) + men;
        se.buildings.port = {
          id: 'port', level: (inst?.level ?? 0) + 1, method: method.id,
          employed: { laborers: (inst?.employed.laborers ?? 0) + men },
          lastRevenue: 0, lastCosts: 0, lastProfit: 0, inputFill: 1,
        };
        levels -= 1;
      }
      if (levels <= 0) break;
    }
  }
}
