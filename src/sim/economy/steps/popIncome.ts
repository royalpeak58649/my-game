// Step 6 — pop income: wages + dividends, income tax, and standard of living.

import { GOOD_IDS } from '../../../data/economy/goods';
import { NEEDS, POP_TYPES, POP_TYPE_IDS, standardOfLiving } from '../../../data/economy/pops';
import { GOOD_COUNT, POP_COUNT, clamp, safe } from '../context';
import type { TickContext } from '../context';
import { consumptionScale } from './popDemand';

export function popIncomeStep(ctx: TickContext): void {
  for (let s = 0; s < ctx.states.length; s++) {
    const stateRef = ctx.states[s];
    const market = stateRef.market;
    const pops = stateRef.eco.pops;
    const income = stateRef.eco.income;
    const sol = stateRef.eco.sol;
    const wages = ctx.wages[s];
    const dividends = ctx.dividends[s];
    const taxRate = clamp(safe(stateRef.country.incomeTaxRate), 0, 0.5);

    for (let p = 0; p < POP_COUNT; p++) {
      const id = POP_TYPE_IDS[p];
      const def = POP_TYPES[id];
      const count = Math.max(0, safe(pops[id] ?? 0));
      let gross: number;
      let tax = 0;
      if (id === 'peasants') {
        gross = def.subsistenceIncome ?? 0;
      } else if (count > 0) {
        gross = (wages[p] + dividends[p]) / count;
        tax = gross * taxRate;
      } else {
        gross = 0;
      }
      const net = gross - tax;
      income[id] = net;
      ctx.taxes[s] += tax * count;

      const basket = NEEDS[def.tier];
      let basketCost = 0;
      for (let g = 0; g < GOOD_COUNT; g++) {
        const amount = basket[GOOD_IDS[g]] ?? 0;
        if (amount > 0) basketCost += amount * safe(market.prices[GOOD_IDS[g]]);
      }
      sol[id] = standardOfLiving(consumptionScale(net, basketCost));
    }
  }
}
