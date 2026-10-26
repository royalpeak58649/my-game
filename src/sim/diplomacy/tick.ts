// Weekly diplomacy tick — see docs/WAR.md, "Diplomacy", "Weekly".
//
// Pure: the diplomacy state is copied once (it is small) and the returned GameState shares
// everything else with the input. Countries are processed in sorted tag order, so the result is
// deterministic.

import {
  PRESTIGE_GDP_DIV, PRESTIGE_PER_BATTALION, PRESTIGE_PER_TECH,
} from '../../data/diplomacy/rules';
import type { GameState } from '../types';
import { aiStep } from './ai';
import { updateInfluence, updatePrestige, updateRelations, updateTruces } from './steps';
import type { DiplomacyState } from './types';

/** Advances diplomacy by one week. Pure: returns a new GameState. */
export function diplomacyTick(state: GameState): GameState {
  const diplomacy: DiplomacyState = structuredClone(state.diplomacy);

  // 1. Relations.
  updateRelations(state, diplomacy);
  // 2. Truces.
  updateTruces(diplomacy);
  // 3. Influence.
  updateInfluence(state, diplomacy);
  // 4. Prestige and ranking.
  updatePrestige(state, diplomacy, PRESTIGE_GDP_DIV, PRESTIGE_PER_BATTALION, PRESTIGE_PER_TECH);
  // 5. AI.
  aiStep(state, diplomacy);

  return { ...state, diplomacy };
}
