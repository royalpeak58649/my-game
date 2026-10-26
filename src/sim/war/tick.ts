// One week of war: armies, then diplomatic plays, then the wars themselves, then the AI's new
// plays. See docs/WAR.md, "Tick order". Pure: every step returns a new GameState.

import type { GameState } from '../types';
import { armyStep } from './armies';
import { aiPlays, playStep } from './plays';
import { warStep } from './wars';

/** Advances the military simulation by one week. */
export function warTick(state: GameState): GameState {
  return aiPlays(warStep(playStep(armyStep(state))));
}
