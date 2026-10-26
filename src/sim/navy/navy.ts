// Weekly navy step (docs/NAVY.md): fleets from naval bases, admirals, convoys from ports and
// their use, and convoy raiding in wartime.
//
// Pure: the returned GameState shares every untouched part with the input. Countries are
// processed in sorted tag order, so the result is deterministic.

import { generalName, generalSkill, generalTrait } from '../../data/diplomacy/names';
import { BUILDINGS } from '../../data/economy/buildings';
import {
  CONVOY_REPAIR, ESCORT_WEIGHT, FLOTILLA_SIZE, FLOTILLAS_PER_ADMIRAL, MAX_ADMIRALS, MIN_NAVY_QUALITY,
  RAID_PER_FLOTILLA, RAIDER_LOSS,
} from '../../data/navy/rules';
import type { General, MilitaryState, Navy, War } from '../diplomacy/types';
import type { StateEconomy } from '../economy/types';
import type { GameState } from '../types';
import { convoyAccounts } from './convoys';

const SAILORS = BUILDINGS.naval_base?.methods[0]?.employment.soldiers ?? FLOTILLA_SIZE;

function fin(x: number | undefined, fallback = 0): number {
  return x !== undefined && Number.isFinite(x) ? x : fallback;
}

export function emptyNavy(): Navy {
  return {
    flotillas: 0, quality: 1, admirals: [], raidShare: 0, convoyCapacity: 0, convoysLost: 0,
    convoyNeedOverseas: 0, convoyNeedTrade: 0, supply: 1, overseasStates: 0,
  };
}

export function navyOf(state: GameState, tag: string): Navy {
  return state.military.navies?.[tag] ?? emptyNavy();
}

/** Convoys left after raiding losses. */
export function convoysAvailable(navy: Navy): number {
  return Math.max(0, navy.convoyCapacity - navy.convoysLost);
}

export function convoyNeed(navy: Navy): number {
  return navy.convoyNeedOverseas + navy.convoyNeedTrade;
}

/** Best admiral by skill (ties by id), or null. */
export function bestAdmiral(navy: Navy): General | null {
  let best: General | null = null;
  for (const a of navy.admirals) if (!best || a.skill > best.skill || (a.skill === best.skill && a.id < best.id)) best = a;
  return best;
}

/** Sailors and supply of each country's naval bases. */
function fleetsOf(state: GameState): Map<string, { sailors: number; fill: number; levels: number }> {
  const out = new Map<string, { sailors: number; fill: number; levels: number }>();
  for (const sid of Object.keys(state.economy.states).sort()) {
    const tag = state.states[sid]?.owner;
    const base = state.economy.states[sid]?.buildings.naval_base;
    if (!tag || !base || base.level <= 0) continue;
    const f = out.get(tag) ?? { sailors: 0, fill: 0, levels: 0 };
    const men = Math.max(0, fin(base.employed.soldiers));
    f.sailors += men;
    f.fill += men * Math.max(0, Math.min(1, fin(base.inputFill, 1)));
    f.levels += base.level;
    out.set(tag, f);
  }
  return out;
}

export function makeAdmiral(tag: string, n: number): General {
  const id = `${tag}-adm-${n}`;
  return { id, name: generalName(id), skill: generalSkill(id), trait: generalTrait(id) };
}

function sideOf(war: War, tag: string): 'attackers' | 'defenders' | null {
  if (war.attackers.includes(tag)) return 'attackers';
  if (war.defenders.includes(tag)) return 'defenders';
  return null;
}

/** Every country `tag` is at war with, sorted. */
export function enemiesOf(state: GameState, tag: string): string[] {
  const out = new Set<string>();
  for (const war of state.military.wars) {
    const side = sideOf(war, tag);
    if (side === null) continue;
    for (const t of side === 'attackers' ? war.defenders : war.attackers) out.add(t);
  }
  return [...out].sort();
}

/** Fleet strength: flotillas × quality × admiral bonus. */
export function fleetStrength(navy: Navy, flotillas = navy.flotillas): number {
  const admiral = bestAdmiral(navy);
  return Math.max(0, flotillas) * navy.quality * (1 + 0.08 * (admiral?.skill ?? 0));
}

/** Removes `flotillas` worth of sailors from a country's naval bases, proportionally. */
export function sinkFlotillas(state: GameState, tag: string, flotillas: number): GameState {
  const sailors = flotillas * SAILORS;
  if (!(sailors > 0)) return state;
  const ids = Object.keys(state.economy.states).sort().filter((id) => state.states[id]?.owner === tag && state.economy.states[id]?.buildings.naval_base);
  let total = 0;
  for (const id of ids) total += Math.max(0, fin(state.economy.states[id]?.buildings.naval_base?.employed.soldiers));
  if (total <= 0) return state;
  const take = Math.min(sailors, total);
  const states = { ...state.economy.states };
  for (const id of ids) {
    const se = states[id] as StateEconomy;
    const base = se.buildings.naval_base;
    if (!base) continue;
    const men = Math.max(0, fin(base.employed.soldiers));
    const lost = Math.min(men, (take * men) / total);
    if (lost <= 0) continue;
    states[id] = {
      ...se,
      pops: { ...se.pops, soldiers: Math.max(0, fin(se.pops.soldiers) - lost) },
      buildings: { ...se.buildings, naval_base: { ...base, employed: { ...base.employed, soldiers: men - lost } } },
    };
  }
  const navy = state.military.navies[tag];
  const military = navy
    ? { ...state.military, navies: { ...state.military.navies, [tag]: { ...navy, flotillas: Math.max(0, navy.flotillas - take / SAILORS) } } }
    : state.military;
  return { ...state, economy: { ...state.economy, states }, military };
}

/** AI raid share: weaker navies raid more (guerre de course); at peace nobody raids. */
function aiRaidShare(state: GameState, tag: string, navies: Record<string, Navy>): number {
  const enemies = enemiesOf(state, tag);
  if (enemies.length === 0) return 0;
  const mine = fleetStrength(navies[tag] ?? emptyNavy());
  const theirs = enemies.reduce((t, e) => t + fleetStrength(navies[e] ?? emptyNavy()), 0);
  if (mine <= 0) return 0;
  return mine >= theirs ? 0.4 : 0.7;
}

/**
 * Raiding: every country at war sends `raidShare` of its fleet against its enemies' convoys,
 * split by the enemies' convoy capacity. Escorts (the rest of the enemy fleet) blunt the raid
 * and sink raiders. Mutates `navies` (convoy losses) and returns flotilla losses per country.
 */
function raid(state: GameState, navies: Record<string, Navy>): Map<string, number> {
  const sunk = new Map<string, number>();
  for (const tag of Object.keys(navies).sort()) {
    const navy = navies[tag] as Navy;
    const raiders = fleetStrength(navy, navy.flotillas * navy.raidShare);
    if (raiders <= 0) continue;
    const enemies = enemiesOf(state, tag).filter((e) => (navies[e]?.convoyCapacity ?? 0) > 0);
    const capacity = enemies.reduce((t, e) => t + (navies[e]?.convoyCapacity ?? 0), 0);
    if (capacity <= 0) continue;
    for (const e of enemies) {
      const enemy = navies[e] as Navy;
      const share = raiders * (enemy.convoyCapacity / capacity);
      const escort = fleetStrength(enemy, enemy.flotillas * (1 - enemy.raidShare));
      const effect = share / (share + ESCORT_WEIGHT * escort);
      const destroyed = share * RAID_PER_FLOTILLA * effect;
      enemy.convoysLost = Math.min(enemy.convoyCapacity, enemy.convoysLost + destroyed);
      const lost = navy.flotillas * navy.raidShare * (share / raiders) * RAIDER_LOSS * (1 - effect);
      if (lost > 0) sunk.set(tag, (sunk.get(tag) ?? 0) + lost);
    }
  }
  return sunk;
}

/** Recomputes every navy and runs convoy raiding. */
export function navyStep(state: GameState): GameState {
  const fleets = fleetsOf(state);
  const accounts = convoyAccounts(state);
  const tags = [...new Set([...accounts.keys(), ...fleets.keys()])].sort();
  const navies: Record<string, Navy> = {};
  for (const tag of tags) {
    const prev = state.military.navies?.[tag];
    const f = fleets.get(tag);
    const a = accounts.get(tag);
    const navy: Navy = prev ? { ...prev, admirals: [...prev.admirals] } : emptyNavy();
    navy.flotillas = f ? f.sailors / SAILORS : 0;
    navy.quality = f && f.sailors > 0 ? Math.max(MIN_NAVY_QUALITY, f.fill / f.sailors) : 1;
    const wanted = navy.flotillas >= 1 ? Math.max(1, Math.min(MAX_ADMIRALS, Math.round(navy.flotillas / FLOTILLAS_PER_ADMIRAL))) : 0;
    while (navy.admirals.length < wanted) navy.admirals.push(makeAdmiral(tag, navy.admirals.length + 1));
    navy.convoyCapacity = a?.capacity ?? 0;
    navy.convoyNeedOverseas = a?.needOverseas ?? 0;
    navy.convoyNeedTrade = a?.needTrade ?? 0;
    navy.overseasStates = a?.overseasStates ?? 0;
    navy.convoysLost = Math.min(navy.convoyCapacity, fin(navy.convoysLost) * (1 - CONVOY_REPAIR));
    navy.raidShare = tag === state.player
      ? Math.max(0, Math.min(1, fin(navy.raidShare)))
      : aiRaidShare(state, tag, state.military.navies ?? {});
    navies[tag] = navy;
  }

  const sunk = state.military.wars.length > 0 ? raid(state, navies) : new Map<string, number>();
  for (const navy of Object.values(navies)) {
    const need = convoyNeed(navy);
    navy.supply = need > 0 ? Math.max(0, Math.min(1, convoysAvailable(navy) / need)) : 1;
  }

  const military: MilitaryState = { ...state.military, navies };
  let next: GameState = { ...state, military };
  for (const [tag, lost] of [...sunk.entries()].sort()) next = sinkFlotillas(next, tag, lost);
  return next;
}
