// Step 2 — production: input needs and outputs, scaled by staffing and last week's input fill.

import { GOOD_IDS } from '../../../data/economy/goods';
import { GOOD_COUNT, clamp, safe } from '../context';
import type { TickContext } from '../context';
import { jobsOf, staffingOf } from './employment';

/** Per state, per building: input need by good index (reused across ticks). */
const inputNeedCache = new WeakMap<object, Float64Array[]>();

function inputNeedBuffer(key: object, count: number): Float64Array[] {
  let buffers = inputNeedCache.get(key);
  if (!buffers || buffers.length !== count) {
    buffers = [];
    for (let i = 0; i < count; i++) buffers.push(new Float64Array(GOOD_COUNT));
    inputNeedCache.set(key, buffers);
  }
  return buffers;
}

/** Input need of a building this week, by good index. */
export function inputNeedOf(ctx: TickContext, stateIndex: number, buildingIndex: number): Float64Array {
  const stateRef = ctx.states[stateIndex];
  const buffers = inputNeedBuffer(stateRef.eco.buildings, stateRef.buildings.length);
  return buffers[buildingIndex];
}

export function productionStep(ctx: TickContext): void {
  for (let s = 0; s < ctx.states.length; s++) {
    const stateRef = ctx.states[s];
    const market = stateRef.market;
    const buffers = inputNeedBuffer(stateRef.eco.buildings, stateRef.buildings.length);
    for (let b = 0; b < stateRef.buildings.length; b++) {
      const ref = stateRef.buildings[b];
      const inst = ref.inst;
      const jobs = jobsOf(ctx, s, b);
      const staffing = staffingOf(inst, jobs);
      const level = Math.max(0, safe(inst.level));
      const inputs = ref.method.inputs;

      // inputFill = min over the building's inputs of last week's buyFill.
      let inputFill = 1;
      let hasInputs = false;
      for (let g = 0; g < GOOD_COUNT; g++) {
        const amount = inputs[GOOD_IDS[g]] ?? 0;
        if (!(amount > 0)) continue;
        hasInputs = true;
        const fill = clamp(safe(market.buyFill[GOOD_IDS[g]], 1), 0, 1);
        if (fill < inputFill) inputFill = fill;
      }
      if (!hasInputs) inputFill = 1;
      inst.inputFill = inputFill;

      const need = buffers[b];
      need.fill(0);
      for (let g = 0; g < GOOD_COUNT; g++) {
        const amount = inputs[GOOD_IDS[g]] ?? 0;
        if (amount > 0) need[g] = level * amount * staffing;
      }

      const scale = staffing * inputFill;
      const outputs = ref.method.outputs;
      for (let g = 0; g < GOOD_COUNT; g++) {
        const amount = outputs[GOOD_IDS[g]] ?? 0;
        if (amount > 0) market.supply[GOOD_IDS[g]] = (market.supply[GOOD_IDS[g]] ?? 0) + level * amount * scale;
      }
      const construction = ref.method.construction ?? 0;
      if (construction > 0) ctx.construction[s] += level * construction * scale;
    }
  }
}
