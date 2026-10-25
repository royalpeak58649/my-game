// Step 9 — population growth: new people enter as peasants.

import { yearlyGrowth } from '../../../data/economy/pops';
import { safe } from '../context';
import type { TickContext } from '../context';

export function growthStep(ctx: TickContext): void {
  for (let s = 0; s < ctx.states.length; s++) {
    const pops = ctx.states[s].eco.pops;
    const total = ctx.population[s];
    if (!(total > 0)) continue;
    const avgSol = ctx.solWeighted[s] / total;
    const growth = (total * yearlyGrowth(safe(avgSol))) / 52;
    const added = Math.round(safe(growth));
    if (added > 0) pops.peasants = Math.max(0, safe(pops.peasants ?? 0)) + added;
  }
}
