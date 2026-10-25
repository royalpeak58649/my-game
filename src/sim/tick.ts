import { addDays } from './date';
import { economyTick } from './economy/tick';
import { politicsTick } from './politics/tick';
import type { GameState } from './types';

export const DAYS_PER_TICK = 7;

/** Advances the simulation by one week. Pure: returns a new state. */
export function tick(state: GameState): GameState {
  const advanced: GameState = {
    ...state,
    date: addDays(state.date, DAYS_PER_TICK),
    tickCount: state.tickCount + 1,
  };
  // Politics runs after the economy: it reads this week's pops, living standards and taxes.
  return politicsTick(economyTick(advanced));
}
