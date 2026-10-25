import type { CountryDef, GameState, StateDef } from './types';

export const START_DATE = { year: 1836, month: 1, day: 1 } as const;

export function createGameState(
  states: StateDef[],
  countries: Record<string, CountryDef>,
  player: string | null,
): GameState {
  return {
    date: { ...START_DATE },
    tickCount: 0,
    player,
    states: Object.fromEntries(states.map((s) => [s.id, { ...s, centroid: [s.centroid[0], s.centroid[1]] }])),
    countries: Object.fromEntries(Object.entries(countries).map(([k, c]) => [k, { ...c }])),
  };
}
