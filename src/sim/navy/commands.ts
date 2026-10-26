// Player navy commands (docs/NAVY.md). Invalid orders return the same state.

import type { GameState } from '../types';

export { cancelInvasion, launchInvasion } from './invasions';

/** Share of the fleet sent raiding enemy convoys in wartime (0..1, in steps of 0.1). */
export function setRaidShare(state: GameState, tag: string, share: number): GameState {
  const navy = state.military.navies[tag];
  if (!navy || !Number.isFinite(share)) return state;
  const raidShare = Math.round(Math.max(0, Math.min(1, share)) * 10) / 10;
  if (raidShare === navy.raidShare) return state;
  return { ...state, military: { ...state.military, navies: { ...state.military.navies, [tag]: { ...navy, raidShare } } } };
}
