// Seeds GameState.military: one (unmobilised) army per existing country, then the first army
// step. See docs/WAR.md, "Armies". Pure: returns a new GameState.

import type { Army, MilitaryState } from '../diplomacy/types';
import type { GameState } from '../types';
import { armyStep } from './armies';

/** Country tags that own at least one state with an economy, sorted. */
function existingTags(state: GameState): string[] {
  const tags = new Set<string>();
  for (const stateId of Object.keys(state.economy.states)) {
    const owner = state.states[stateId]?.owner;
    if (owner) tags.add(owner);
  }
  return [...tags].sort();
}

/** Creates an army for every existing country (mobilised false) and runs one army step. */
export function initMilitary(state: GameState): GameState {
  const armies: Record<string, Army> = {};
  for (const tag of existingTags(state)) {
    const previous = state.military.armies[tag];
    armies[tag] = {
      battalions: previous?.battalions ?? 0,
      mobilized: false,
      equipment: previous?.equipment ?? 1,
      generals: previous?.generals ?? [],
    };
  }
  const military: MilitaryState = { ...state.military, armies };
  return armyStep({ ...state, military });
}
