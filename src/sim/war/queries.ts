// Read-only helpers over armies, plays and wars. Used by the UI and by commands.
// See docs/WAR.md, "Queries".

import type { Army, DiplomaticPlay, War, WarSide } from '../diplomacy/types';
import type { GameState } from '../types';
import { armyStrength } from './armies';
import { possibleWarGoals } from './plays';
import { controllerOf, isAtWar } from './wars';

export { armyStrength, possibleWarGoals, controllerOf, isAtWar };

/** The army of `tag`, or null when it has none. */
export function armyOf(state: GameState, tag: string): Army | null {
  return state.military.armies[tag] ?? null;
}

/** Plays `tag` takes part in (as leader or supporter). */
export function playsOf(state: GameState, tag: string): DiplomaticPlay[] {
  return state.diplomacy.plays.filter((play) => (
    play.initiator === tag || play.target === tag
    || play.supporters.initiator.includes(tag) || play.supporters.target.includes(tag)
  ));
}

/** Wars `tag` takes part in. */
export function warsOf(state: GameState, tag: string): War[] {
  return state.military.wars.filter((war) => war.attackers.includes(tag) || war.defenders.includes(tag));
}

/** The side of `war` that `tag` fights on, or null when it is not a participant. */
export function sideOf(war: War, tag: string): WarSide | null {
  if (war.attackers.includes(tag)) return 'attackers';
  if (war.defenders.includes(tag)) return 'defenders';
  return null;
}

/** The play `tag` takes part in, or null. */
export function playOf(state: GameState, tag: string): DiplomaticPlay | null {
  return state.diplomacy.plays.find((play) => (
    play.initiator === tag || play.target === tag
    || play.supporters.initiator.includes(tag) || play.supporters.target.includes(tag)
  )) ?? null;
}

/** The war `tag` fights in, or null. */
export function warOf(state: GameState, tag: string): War | null {
  return state.military.wars.find((war) => war.attackers.includes(tag) || war.defenders.includes(tag)) ?? null;
}

/** True if `tag` is at war with anyone. */
export function atWar(state: GameState, tag: string): boolean {
  return warsOf(state, tag).length > 0;
}

/** True if `tag` is mobilised. */
export function isMobilized(state: GameState, tag: string): boolean {
  return state.military.armies[tag]?.mobilized === true;
}

/** The war with this id, or null. */
export function warById(state: GameState, warId: number): War | null {
  return state.military.wars.find((war) => war.id === warId) ?? null;
}

/** The play with this id, or null. */
export function playById(state: GameState, playId: number): DiplomaticPlay | null {
  return state.diplomacy.plays.find((play) => play.id === playId) ?? null;
}

export { playSideStrength } from './plays';
