// Weekly army step — see docs/WAR.md, "Armies".
//
// Pure: the military state is copied once (it is small) and the returned GameState shares
// everything else with the input. Countries are processed in sorted tag order, so the result is
// deterministic. Battalions come from staffed barracks; equipment from the country's market.

import { BATTALION_SIZE, MOBILIZATION_MULT } from '../../data/diplomacy/rules';
import { generalName, generalSkill, generalTrait } from '../../data/diplomacy/names';
import type { Army, General, MilitaryState } from '../diplomacy/types';
import { modifiersOf } from '../politics/unlocks';
import type { GameState } from '../types';

/** Equipment never drops below this share, however scarce small arms are. */
export const MIN_EQUIPMENT = 0.3;
/** Soldiers per general. */
export const SOLDIERS_PER_GENERAL = 60;
/** Generals a country may have at most. */
export const MAX_GENERALS = 6;

function fin(x: number | undefined, fallback = 0): number {
  return x !== undefined && Number.isFinite(x) ? x : fallback;
}

/** Country tags that own at least one state with an economy, sorted. */
function existingTags(state: GameState): string[] {
  const tags = new Set<string>();
  for (const stateId of Object.keys(state.economy.states)) {
    const owner = state.states[stateId]?.owner;
    if (owner) tags.add(owner);
  }
  return [...tags].sort();
}

/** Soldiers employed by the barracks of every state owned by `tag`. */
function soldiersOf(state: GameState, tag: string): number {
  let soldiers = 0;
  for (const stateId of Object.keys(state.economy.states)) {
    if (state.states[stateId]?.owner !== tag) continue;
    const barracks = state.economy.states[stateId]?.buildings.barracks;
    if (!barracks) continue;
    soldiers += Math.max(0, fin(barracks.employed.soldiers));
  }
  return soldiers;
}

/** Battalions of `tag` from its staffed barracks, doubled while mobilised. */
export function battalionsOf(state: GameState, tag: string): number {
  const battalions = soldiersOf(state, tag) / BATTALION_SIZE;
  return state.military.armies[tag]?.mobilized === true ? battalions * MOBILIZATION_MULT : battalions;
}

/** Share of the country's battalions at full equipment (0.3..1). */
export function equipmentOf(state: GameState, tag: string): number {
  const fill = fin(state.economy.markets[tag]?.buyFill.small_arms, 1);
  return Math.max(MIN_EQUIPMENT, Math.min(1, fill));
}

/** Equipment × the army quality modifier. */
export function qualityOf(state: GameState, tag: string): number {
  return equipmentOf(state, tag) * fin(modifiersOf(state, tag).armyQualityMult, 1);
}

/** Strength of `tag`'s army: battalions × quality. */
export function armyStrength(state: GameState, tag: string): number {
  return battalionsOf(state, tag) * qualityOf(state, tag);
}

/** Generals `tag` should have for `battalions` (1..6). */
export function generalCount(battalions: number): number {
  const wanted = Math.round(Math.max(0, fin(battalions)) / SOLDIERS_PER_GENERAL);
  return Math.max(1, Math.min(MAX_GENERALS, wanted));
}

/** A new general with a deterministic id, name, skill and trait. */
export function makeGeneral(tag: string, n: number): General {
  const id = `${tag}-${n}`;
  return { id, name: generalName(id), skill: generalSkill(id), trait: generalTrait(id) };
}

/** Adds generals until the army has `generalCount(battalions)` of them. Mutates `army`. */
export function fillGenerals(tag: string, army: Army): void {
  const wanted = generalCount(army.battalions);
  while (army.generals.length < wanted) {
    army.generals.push(makeGeneral(tag, army.generals.length + 1));
  }
}

/** Recomputes battalions, equipment and generals of every existing country. Pure. */
export function armyStep(state: GameState): GameState {
  const military: MilitaryState = structuredClone(state.military);
  for (const tag of existingTags(state)) {
    const previous = military.armies[tag];
    const army: Army = previous ?? { battalions: 0, mobilized: false, equipment: 1, generals: [] };
    army.battalions = battalionsOf(state, tag);
    army.equipment = equipmentOf(state, tag);
    fillGenerals(tag, army);
    military.armies[tag] = army;
  }
  return { ...state, military };
}
