// Step 3 — pop demand: what households want to buy this week, from last week's income.

import { GOOD_IDS } from '../../../data/economy/goods';
import { MAX_CONSUMPTION_SCALE, NEEDS, POP_TYPES, POP_TYPE_IDS } from '../../../data/economy/pops';
import { GOOD_COUNT, POP_COUNT, safe } from '../context';
import type { TickContext } from '../context';

/** Consumption scale of a pop type: income / basket cost, capped. */
export function consumptionScale(income: number, basketCost: number): number {
  if (!(basketCost > 0)) return MAX_CONSUMPTION_SCALE;
  const scale = safe(income) / basketCost;
  if (!(scale > 0)) return 0;
  return Math.min(MAX_CONSUMPTION_SCALE, scale);
}

/** Cost of one person's needs basket at the given prices. */
export function basketCostOf(tier: 'lower' | 'middle' | 'upper', prices: Record<string, number>): number {
  const basket = NEEDS[tier];
  let cost = 0;
  for (let g = 0; g < GOOD_COUNT; g++) {
    const amount = basket[GOOD_IDS[g]] ?? 0;
    if (amount > 0) cost += amount * safe(prices[GOOD_IDS[g]]);
  }
  return cost;
}

export function popDemandStep(ctx: TickContext): void {
  for (let s = 0; s < ctx.states.length; s++) {
    const stateRef = ctx.states[s];
    const market = stateRef.market;
    const pops = stateRef.eco.pops;
    const income = stateRef.eco.income;
    for (let p = 0; p < POP_COUNT; p++) {
      const id = POP_TYPE_IDS[p];
      const count = Math.max(0, safe(pops[id] ?? 0));
      if (count <= 0) continue;
      const basket = NEEDS[POP_TYPES[id].tier];
      let basketCost = 0;
      for (let g = 0; g < GOOD_COUNT; g++) {
        const amount = basket[GOOD_IDS[g]] ?? 0;
        if (amount > 0) basketCost += amount * safe(market.prices[GOOD_IDS[g]]);
      }
      const scale = consumptionScale(income[id] ?? 0, basketCost);
      if (!(scale > 0)) continue;
      for (let g = 0; g < GOOD_COUNT; g++) {
        const amount = basket[GOOD_IDS[g]] ?? 0;
        if (amount > 0) market.demand[GOOD_IDS[g]] = (market.demand[GOOD_IDS[g]] ?? 0) + count * amount * scale;
      }
    }
  }
}
