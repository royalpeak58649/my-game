import { addDays } from './date';
import type { GameState } from './types';

export const DAYS_PER_TICK = 7;

/** Advances the simulation by one week. Pure: returns a new state. */
export function tick(state: GameState): GameState {
  return {
    ...state,
    date: addDays(state.date, DAYS_PER_TICK),
    tickCount: state.tickCount + 1,
  };
}
