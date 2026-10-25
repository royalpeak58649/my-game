import type { GameState, StateDef } from './types';

export function statesOf(state: GameState, tag: string): StateDef[] {
  return Object.values(state.states).filter((s) => s.owner === tag);
}

export function totalArea(state: GameState, tag: string): number {
  return statesOf(state, tag).reduce((sum, s) => sum + s.area, 0);
}
