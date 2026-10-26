// Convoy accounting (docs/NAVY.md, "Convoys"): what each country's ports provide and what its
// overseas states and sea trade need. Pure functions of the game state.

import ADJACENCY_JSON from '../../data/adjacency.json';
import { BUILDINGS } from '../../data/economy/buildings';
import {
  CONVOYS_PER_PORT, OVERSEAS_BASE, OVERSEAS_PER_1000KM, TRADE_VALUE_PER_CONVOY,
} from '../../data/navy/rules';
import type { GameState } from '../types';
import { distanceKm } from './seas';

type Adjacency = Record<string, string[]>;
const ADJACENCY = ADJACENCY_JSON as Adjacency;
/** Dock workers per port level. */
export const PORT_JOBS = BUILDINGS.port?.methods[0]?.employment.laborers ?? 1500;

function fin(x: number | undefined, fallback = 0): number {
  return x !== undefined && Number.isFinite(x) ? x : fallback;
}

/**
 * States of each country reachable over land from its capital through states `holds` says it
 * holds. Countries whose capital they do not hold treat every state as home.
 */
export function homeStates(
  state: GameState,
  holds: (stateId: string) => string | null,
  tags: Iterable<string>,
  adjacency: Adjacency = ADJACENCY,
): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const tag of tags) {
    const capital = state.countries[tag]?.capital;
    const home = new Set<string>();
    if (capital && holds(capital) === tag) {
      const stack = [capital];
      home.add(capital);
      while (stack.length > 0) {
        const s = stack.pop() as string;
        for (const n of adjacency[s] ?? []) {
          if (home.has(n) || holds(n) !== tag) continue;
          home.add(n);
          stack.push(n);
        }
      }
    }
    out.set(tag, home);
  }
  return out;
}

export interface ConvoyAccount {
  capacity: number;
  needOverseas: number;
  needTrade: number;
  overseasStates: number;
  coastal: boolean;
}

/** Convoys from staffed ports, and the needs of overseas states and sea trade, per country. */
export function convoyAccounts(state: GameState): Map<string, ConvoyAccount> {
  const byTag = new Map<string, string[]>();
  for (const sid of Object.keys(state.economy.states).sort()) {
    const tag = state.states[sid]?.owner;
    if (!tag) continue;
    const l = byTag.get(tag);
    if (l) l.push(sid);
    else byTag.set(tag, [sid]);
  }
  const home = homeStates(state, (sid) => state.states[sid]?.owner ?? null, byTag.keys());
  const out = new Map<string, ConvoyAccount>();
  for (const [tag, sids] of byTag) {
    const capitalDef = state.states[state.countries[tag]?.capital ?? ''];
    const homeSet = home.get(tag) ?? new Set<string>();
    let capacity = 0;
    let needOverseas = 0;
    let overseasStates = 0;
    let coastal = false;
    for (const sid of sids) {
      const se = state.economy.states[sid];
      if (!se) continue;
      if (se.coastal) coastal = true;
      const port = se.buildings.port;
      if (port && port.level > 0) {
        const staff = Math.min(1, fin(port.employed.laborers) / (port.level * PORT_JOBS));
        capacity += port.level * CONVOYS_PER_PORT * staff;
      }
      if (homeSet.size > 0 && !homeSet.has(sid)) {
        overseasStates += 1;
        const def = state.states[sid];
        const km = capitalDef && def ? distanceKm(capitalDef.centroid, def.centroid) : 0;
        needOverseas += OVERSEAS_BASE + (km / 1000) * OVERSEAS_PER_1000KM;
      }
    }
    let needTrade = 0;
    const market = state.economy.markets[tag];
    if (coastal && market) {
      let value = 0;
      for (const g of Object.keys(market.prices) as (keyof typeof market.prices)[]) {
        value += (fin(market.exports[g]) + fin(market.imports[g])) * fin(market.prices[g]);
      }
      needTrade = value / TRADE_VALUE_PER_CONVOY;
    }
    out.set(tag, { capacity, needOverseas, needTrade, overseasStates, coastal });
  }
  return out;
}
