// Step 5 — money: revenue, input costs, wages and profit per building.

import { GOOD_IDS } from '../../../data/economy/goods';
import { POP_TYPES, POP_TYPE_IDS } from '../../../data/economy/pops';
import { GOOD_COUNT, POP_COUNT, POP_INDEX, safe } from '../context';
import type { TickContext } from '../context';
import { inputNeedOf } from './production';

export function settleMoneyStep(ctx: TickContext): void {
  for (let s = 0; s < ctx.states.length; s++) {
    const stateRef = ctx.states[s];
    const market = stateRef.market;
    const wages = ctx.wages[s];
    const dividends = ctx.dividends[s];
    for (let b = 0; b < stateRef.buildings.length; b++) {
      const ref = stateRef.buildings[b];
      const inst = ref.inst;
      const government = ref.def.owner === 'government';
      const need = inputNeedOf(ctx, s, b);

      let revenue = 0;
      let inputCost = 0;
      if (!government) {
        const outputs = ref.method.outputs;
        for (let g = 0; g < GOOD_COUNT; g++) {
          const amount = outputs[GOOD_IDS[g]] ?? 0;
          if (amount <= 0) continue;
          const level = Math.max(0, safe(inst.level));
          const produced = level * amount * (inst.inputFill * staffingFactor(ctx, s, b));
          revenue += produced * safe(market.sellFill[GOOD_IDS[g]], 1) * safe(market.prices[GOOD_IDS[g]]);
        }
      }
      for (let g = 0; g < GOOD_COUNT; g++) {
        const amount = need[g];
        if (amount <= 0) continue;
        inputCost += amount * safe(market.buyFill[GOOD_IDS[g]], 1) * safe(market.prices[GOOD_IDS[g]]);
      }

      let wageBill = 0;
      for (let p = 0; p < POP_COUNT; p++) {
        const id = POP_TYPE_IDS[p];
        const employed = Math.max(0, safe(inst.employed[id] ?? 0));
        if (employed <= 0) continue;
        const wage = employed * POP_TYPES[id].baseWage;
        if (wage <= 0) continue;
        wageBill += wage;
        wages[p] += wage;
      }

      const profit = revenue - inputCost - wageBill;
      inst.lastRevenue = revenue;
      inst.lastCosts = inputCost + wageBill;
      inst.lastProfit = profit;

      if (government) {
        ctx.govCosts[s] += inputCost + wageBill;
      } else if (profit > 0) {
        const owner = ref.def.owner;
        dividends[POP_INDEX[owner]] += profit;
      }
    }
  }
}

/** Staffing of a building, recomputed from its stored employment (cheap, no allocation). */
function staffingFactor(ctx: TickContext, stateIndex: number, buildingIndex: number): number {
  const ref = ctx.states[stateIndex].buildings[buildingIndex];
  const employment = ref.method.employment;
  let employed = 0;
  let jobs = 0;
  const level = Math.max(0, safe(ref.inst.level));
  for (let p = 0; p < POP_COUNT; p++) {
    const id = POP_TYPE_IDS[p];
    employed += Math.max(0, safe(ref.inst.employed[id] ?? 0));
    jobs += level * (employment[id] ?? 0);
  }
  if (!(jobs > 0)) return 0;
  return Math.min(1, employed / jobs);
}
