// Per-country totals computed in one pass over the world and cached per (economy, states)
// object pair, so modules can ask "population of X" for every country without an
// O(countries × states) scan. Valid as long as those objects are not mutated (the sim is pure).
import { BUILDINGS } from '../data/economy/buildings';
import type { GameState } from './types';

export interface CountryStats {
  /** Tags owning at least one state with an economy, sorted. */
  existing: string[];
  existingSet: Set<string>;
  population: Map<string, number>;
  /** Σ last-week revenue of owner (non-government) buildings. */
  gdp: Map<string, number>;
  /** The industry-building part of gdp. */
  industryGdp: Map<string, number>;
  /** stateIds by owner, sorted. */
  statesOf: Map<string, string[]>;
}

const cache = new WeakMap<object, WeakMap<object, CountryStats>>();

export function countryStats(state: GameState): CountryStats {
  let inner = cache.get(state.economy);
  if (!inner) cache.set(state.economy, (inner = new WeakMap()));
  const hit = inner.get(state.states);
  if (hit) return hit;
  const population = new Map<string, number>();
  const gdp = new Map<string, number>();
  const industryGdp = new Map<string, number>();
  const statesOf = new Map<string, string[]>();
  for (const sid of Object.keys(state.economy.states).sort()) {
    const owner = state.states[sid]?.owner;
    if (!owner) continue;
    const se = state.economy.states[sid];
    if (!se) continue;
    let p = 0;
    for (const k in se.pops) p += se.pops[k as keyof typeof se.pops] ?? 0;
    population.set(owner, (population.get(owner) ?? 0) + p);
    let g = 0;
    let ig = 0;
    for (const id in se.buildings) {
      const inst = se.buildings[id];
      const def = inst ? BUILDINGS[inst.id] : undefined;
      if (!inst || !def || def.owner === 'government') continue;
      g += inst.lastRevenue;
      if (def.group === 'industry') ig += inst.lastRevenue;
    }
    gdp.set(owner, (gdp.get(owner) ?? 0) + g);
    industryGdp.set(owner, (industryGdp.get(owner) ?? 0) + ig);
    let l = statesOf.get(owner);
    if (!l) statesOf.set(owner, (l = []));
    l.push(sid);
  }
  const existing = [...statesOf.keys()].sort();
  const stats = { existing, existingSet: new Set(existing), population, gdp, industryGdp, statesOf };
  inner.set(state.states, stats);
  return stats;
}
