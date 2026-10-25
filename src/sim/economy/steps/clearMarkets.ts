// Step 4 — market clearing: fills and prices per country market.

import { GOODS, GOOD_IDS, PRICE_ELASTICITY, PRICE_MAX_FACTOR, PRICE_MIN_FACTOR, PRICE_SMOOTHING } from '../../../data/economy/goods';
import { GOOD_COUNT, clamp, safe, sortedMarketTags } from '../context';
import type { TickContext } from '../context';
import { inputNeedOf } from './production';

export function clearMarketsStep(ctx: TickContext): void {
  const markets = ctx.eco.markets;

  // Demand = building input needs + household demand. Supply was accumulated in step 2.
  for (let s = 0; s < ctx.states.length; s++) {
    const stateRef = ctx.states[s];
    const market = stateRef.market;
    for (let b = 0; b < stateRef.buildings.length; b++) {
      const need = inputNeedOf(ctx, s, b);
      for (let g = 0; g < GOOD_COUNT; g++) {
        const amount = need[g];
        if (amount > 0) market.demand[GOOD_IDS[g]] = (market.demand[GOOD_IDS[g]] ?? 0) + amount;
      }
    }
  }

  const tags = sortedMarketTags(markets);
  for (let t = 0; t < tags.length; t++) {
    const market = markets[tags[t]];
    if (!market) continue;
    for (let g = 0; g < GOOD_COUNT; g++) {
      const id = GOOD_IDS[g];
      const base = GOODS[id].basePrice;
      const min = base * PRICE_MIN_FACTOR;
      const max = base * PRICE_MAX_FACTOR;
      const supply = Math.max(0, safe(market.supply[id]));
      const demand = Math.max(0, safe(market.demand[id]));
      market.supply[id] = supply;
      market.demand[id] = demand;

      market.buyFill[id] = demand > 0 ? Math.min(1, supply / demand) : 1;
      market.sellFill[id] = supply > 0 ? Math.min(1, demand / supply) : 1;

      const denominator = Math.max(demand, supply, 1);
      const imbalance = (demand - supply) / denominator;
      const target = base * clamp(1 + PRICE_ELASTICITY * imbalance, PRICE_MIN_FACTOR, PRICE_MAX_FACTOR);
      const price = safe(market.prices[id], base);
      market.prices[id] = clamp(price + (target - price) * PRICE_SMOOTHING, min, max);
    }
  }
}
