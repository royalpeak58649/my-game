import { TECH_UNLOCKS } from '../../data/politics/techs';
import type { GameState } from '../types';
import type { Modifiers } from './types';

/** True if `tag` may build this building / use this production method. */
export function isUnlocked(state: GameState, tag: string, id: string): boolean {
  const tech = TECH_UNLOCKS[id];
  if (!tech) return true;
  return state.politics.countries[tag]?.techs.includes(tech) ?? false;
}

/** Same check against a known tech list (for hot loops). */
export function unlockedFor(techs: readonly string[] | undefined, id: string): boolean {
  const tech = TECH_UNLOCKS[id];
  return !tech || (techs?.includes(tech) ?? false);
}

export function modifiersOf(state: GameState, tag: string): Modifiers {
  return state.politics.countries[tag]?.modifiers ?? {};
}
