// Step 8 — construction: spend the week's construction points on the queue.

import { BUILDINGS, MAX_POINTS_PER_PROJECT } from '../../../data/economy/buildings';
import { safe } from '../context';
import type { TickContext } from '../context';
import type { BuildingInstance, ConstructionItem } from '../types';

/** Creates a fresh level-1 building instance with the default production method. */
export function createBuildingInstance(buildingId: string): BuildingInstance | null {
  const def = BUILDINGS[buildingId];
  if (!def || def.methods.length === 0) return null;
  return {
    id: def.id,
    level: 1,
    method: def.methods[0].id,
    employed: {},
    lastRevenue: 0,
    lastCosts: 0,
    lastProfit: 0,
    inputFill: 1,
  };
}

export function constructionStep(ctx: TickContext): void {
  const tags = Object.keys(ctx.eco.countries).sort();
  for (let t = 0; t < tags.length; t++) {
    const country = ctx.eco.countries[tags[t]];
    if (!country) continue;
    let points = Math.max(0, safe(country.constructionPoints));
    const queue = country.queue;
    if (!Array.isArray(queue) || queue.length === 0) continue;

    const remaining: ConstructionItem[] = [];
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      const def = BUILDINGS[item.buildingId];
      if (!def) continue; // unknown building: drop the item
      const cost = def.cost > 0 ? def.cost : 1;
      const progress = Math.max(0, safe(item.progress));
      if (points <= 0) {
        remaining.push({ stateId: item.stateId, buildingId: item.buildingId, progress });
        continue;
      }
      const spend = Math.min(points, MAX_POINTS_PER_PROJECT);
      points -= spend;
      const next = progress + spend;
      if (next < cost) {
        remaining.push({ stateId: item.stateId, buildingId: item.buildingId, progress: next });
        continue;
      }
      // Completed: add one level to the state's building (creating it if needed).
      const stateEco = ctx.eco.states[item.stateId];
      if (stateEco) {
        const existing = stateEco.buildings[item.buildingId];
        if (existing) {
          existing.level = Math.max(0, safe(existing.level)) + 1;
        } else {
          const created = createBuildingInstance(item.buildingId);
          if (created) stateEco.buildings[item.buildingId] = created;
        }
      }
    }
    country.queue = remaining;
  }
}
