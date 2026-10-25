// Step 1 — employment: fire from unprofitable buildings, hire into open jobs.

import { POP_TYPES, POP_TYPE_IDS } from '../../data/economy/pops';
import { POP_COUNT, POP_INDEX, safe } from '../context';
import type { TickContext } from '../context';
import type { PopTypeId } from '../types';

/** Share of every employed type fired when a building lost money last week. */
export const FIRE_RATE = 0.05;

/** Jobs offered by one level of the building, by pop type index. */
export function jobsOf(ctx: TickContext, stateIndex: number, buildingIndex: number): Float64Array {
  const ref = ctx.states[stateIndex].buildings[buildingIndex];
  const jobs = new Float64Array(POP_COUNT);
  const level = Math.max(0, safe(ref.inst.level));
  const employment = ref.method.employment;
  for (let p = 0; p < POP_COUNT; p++) {
    const perLevel = employment[POP_TYPE_IDS[p]] ?? 0;
    jobs[p] = level * perLevel;
  }
  return jobs;
}

/** Σ employed / Σ jobs, 0 when the building offers no jobs. */
export function staffingOf(inst: { employed: Partial<Record<PopTypeId, number>> }, jobs: Float64Array): number {
  let employed = 0;
  let total = 0;
  for (let p = 0; p < POP_COUNT; p++) {
    employed += Math.max(0, safe(inst.employed[POP_TYPE_IDS[p]] ?? 0));
    total += jobs[p];
  }
  if (!(total > 0)) return 0;
  return Math.min(1, employed / total);
}

export function employmentStep(ctx: TickContext): void {
  for (let s = 0; s < ctx.states.length; s++) {
    const stateRef = ctx.states[s];
    const pops = stateRef.eco.pops;
    const austerity = ctx.austerity[s];
    for (let b = 0; b < stateRef.buildings.length; b++) {
      const ref = stateRef.buildings[b];
      const inst = ref.inst;
      const jobs = jobsOf(ctx, s, b);
      const government = ref.def.owner === 'government';
      const employed = inst.employed;

      // Normalise stored employment first so the arithmetic below is well defined.
      for (let p = 0; p < POP_COUNT; p++) {
        const id = POP_TYPE_IDS[p];
        const current = Math.max(0, safe(employed[id] ?? 0));
        if (current > 0) employed[id] = current;
        else delete employed[id];
      }

      const fire = (!government && safe(inst.lastProfit) < 0) || (government && austerity);
      if (fire) {
        if (government) ctx.fired[s] = true;
        for (let p = 0; p < POP_COUNT; p++) {
          const id = POP_TYPE_IDS[p];
          const current = employed[id] ?? 0;
          if (current <= 0) continue;
          const fired = Math.floor(current * FIRE_RATE);
          if (fired <= 0) continue;
          const left = current - fired;
          if (left > 0) employed[id] = left;
          else delete employed[id];
          pops.peasants = (pops.peasants ?? 0) + fired;
        }
        continue;
      }

      for (let p = 0; p < POP_COUNT; p++) {
        const id = POP_TYPE_IDS[p];
        const open = jobs[p] - (employed[id] ?? 0);
        if (!(open > 0)) continue;
        const peasants = Math.max(0, safe(pops.peasants ?? 0));
        if (peasants <= 0) break;
        const hireRate = POP_TYPES[id].hireRate;
        const wanted = Math.min(open, Math.ceil(open * hireRate));
        const hire = Math.min(wanted, peasants);
        if (!(hire > 0)) continue;
        employed[id] = (employed[id] ?? 0) + hire;
        pops.peasants = peasants - hire;
      }
    }
  }
}

/** Exposed for tests / queries: index of a pop type. */
export function popIndex(id: PopTypeId): number {
  return POP_INDEX[id];
}
