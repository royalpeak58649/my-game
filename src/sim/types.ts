import type { GameDate } from './date';
import type { EconomyState } from './economy/types';

export interface StateDef {
  id: string;
  name: string;
  owner: string | null;
  adm0: string;
  area: number; // km²
  centroid: [number, number]; // [lon, lat]
}

export interface CountryDef {
  tag: string;
  name: string;
  color: string;
  capital: string; // state id
}

export interface GameState {
  date: GameDate;
  tickCount: number;
  player: string | null;
  states: Record<string, StateDef>;
  countries: Record<string, CountryDef>;
  economy: EconomyState;
}
