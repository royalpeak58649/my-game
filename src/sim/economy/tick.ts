// Weekly economy tick. See docs/ECONOMY.md, section "Weekly tick".
// Pure from the caller's point of view: the economy is deep-copied once and the
// returned GameState shares everything else with the input.

import { GOOD_IDS } from '../../data/economy/goods';
import { POP_TYPE_IDS } from '../../data/economy/pops';
import type { GameState } from '../types';
import { GOOD_COUNT, POP_COUNT, createContext, safe, sortedMarketTags } from './context';
import { clearMarketsStep } from './steps/clearMarkets';
import { constructionStep } from './steps/construction';
import { employmentStep } from './steps/employment';
import { governmentStep } from './steps/government';
import { growthStep } from './steps/growth';
import { popDemandStep } from './steps/popDemand';
import { popIncomeStep } from './steps/popIncome';
import { productionStep } from './steps/production';
import { settleMoneyStep } from './steps/settleMoney';

/** Resets the per-week market accumulators (supply / demand) before production. */
function resetMarkets(eco: GameState['economy']): void {
  const tags = sortedMarketTags(eco.markets);
  for (let t = 0; t < tags.length; t++) {
    const market = eco.markets[tags[t]];
    if (!market) continue;
    for (let g = 0; g < GOOD_COUNT; g++) {
      market.supply[GOOD_IDS[g]] = 0;
      market.demand[GOOD_IDS[g]] = 0;
    }
  }
}

/** Replaces any NaN / Infinity that slipped in with a safe value. */
function sanitize(eco: GameState['economy']): void {
  const tags = sortedMarketTags(eco.markets);
  for (let t = 0; t < tags.length; t++) {
    const market = eco.markets[tags[t]];
    if (!market) continue;
    for (let g = 0; g < GOOD_COUNT; g++) {
      const id = GOOD_IDS[g];
      market.prices[id] = safe(market.prices[id], 1);
      market.supply[id] = safe(market.supply[id]);
      market.demand[id] = safe(market.demand[id]);
      market.buyFill[id] = safe(market.buyFill[id], 1);
      market.sellFill[id] = safe(market.sellFill[id], 1);
    }
  }
  const stateIds = Object.keys(eco.states).sort();
  for (let s = 0; s < stateIds.length; s++) {
    const stateEco = eco.states[stateIds[s]];
    if (!stateEco) continue;
    for (let p = 0; p < POP_COUNT; p++) {
      const id = POP_TYPE_IDS[p];
      stateEco.pops[id] = Math.max(0, safe(stateEco.pops[id]));
      stateEco.income[id] = safe(stateEco.income[id]);
      stateEco.sol[id] = safe(stateEco.sol[id]);
    }
    const buildingIds = Object.keys(stateEco.buildings).sort();
    for (let b = 0; b < buildingIds.length; b++) {
      const inst = stateEco.buildings[buildingIds[b]];
      if (!inst) continue;
      inst.level = Math.max(0, safe(inst.level));
      inst.lastRevenue = safe(inst.lastRevenue);
      inst.lastCosts = safe(inst.lastCosts);
      inst.lastProfit = safe(inst.lastProfit);
      inst.inputFill = safe(inst.inputFill, 1);
      for (let p = 0; p < POP_COUNT; p++) {
        const id = POP_TYPE_IDS[p];
        const employed = inst.employed[id];
        if (employed === undefined) continue;
        const value = Math.max(0, safe(employed));
        if (value > 0) inst.employed[id] = value;
        else delete inst.employed[id];
      }
    }
  }
  const countryTags = Object.keys(eco.countries).sort();
  for (let c = 0; c < countryTags.length; c++) {
    const country = eco.countries[countryTags[c]];
    if (!country) continue;
    country.treasury = safe(country.treasury);
    country.incomeTaxRate = safe(country.incomeTaxRate);
    country.lastIncome = safe(country.lastIncome);
    country.lastExpenses = safe(country.lastExpenses);
    country.constructionPoints = safe(country.constructionPoints);
  }
}

/**
 * Runs one week of the economy. Steps run in the order given by the spec:
 * employment → production → pop demand → market clearing → money → pop income →
 * government → construction → population growth.
 */
export function economyTick(state: GameState): GameState {
  const eco = structuredClone(state.economy);
  const next: GameState = { ...state, economy: eco };

  resetMarkets(eco);
  const ctx = createContext(next);

  employmentStep(ctx); // 1
  productionStep(ctx); // 2
  popDemandStep(ctx); // 3
  clearMarketsStep(ctx); // 4
  settleMoneyStep(ctx); // 5
  popIncomeStep(ctx); // 6
  governmentStep(ctx); // 7
  constructionStep(ctx); // 8
  growthStep(ctx); // 9

  sanitize(eco);
  return next;
}
