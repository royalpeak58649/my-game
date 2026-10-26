// Seeds the 1836 standing armies as barracks levels, spread over each country's most
// populous states (soldiers are recruited from those states' peasants).
import { BUILDINGS } from '../../data/economy/buildings';
import { DEFAULT_ARMY_SHARE, START_ARMIES } from '../../data/diplomacy/start1836';
import { BATTALION_SIZE } from '../../data/diplomacy/rules';
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
