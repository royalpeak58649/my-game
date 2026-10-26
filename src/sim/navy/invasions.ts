// Naval invasions (docs/NAVY.md, "Naval invasions"): an army sails under escort to an enemy
// coastal state, fights the enemy fleet if it is there, then lands against the garrison. A
// successful landing occupies the state, after which the ordinary land fronts take over.
//
// Pure: every function returns a new GameState. Invasions are processed in id order and every
// random draw is seeded from ids and the tick, so the result is deterministic.

import ADJACENCY_JSON from '../../data/adjacency.json';
import { BATTALION_SIZE, DEFENDER_BONUS } from '../../data/diplomacy/rules';
import {
  AI_INVASION_INTERVAL, AI_INVASION_SHARE, AI_MIN_FLOTILLAS, AI_SUPERIORITY, ALLY_NAVY_SHARE,
  GARRISON_SHARE, INVASION_KM_PER_WEEK, LANDING_FAIL_LOSSES, LANDING_PENALTY, LANDING_WIN_LOSSES,
  MIN_GARRISON, NAVAL_LOSER_LOSSES, NAVAL_WINNER_LOSSES, OVERSEAS_SUPPLY_FLOOR, SUNK_TRANSPORT_LOSSES,
} from '../../data/navy/rules';
import type { Army, Battle, Invasion, War, WarSide } from '../diplomacy/types';
import type { GameState } from '../types';
import { applyCasualties, committedBattalions, rng } from '../war/wars';
import { bestAdmiral, fleetStrength, navyOf, sinkFlotillas } from './navy';
import { seaPath, zoneOfState } from './seas';

const MAX_BATTLES = 12;
/** Weeks the AI waits after a landing before sending more troops in the same war. */
const AI_LANDING_COOLDOWN = 13;
const ADJACENCY = ADJACENCY_JSON as Record<string, string[]>;

function fin(x: number | undefined, fallback = 0): number {
  return x !== undefined && Number.isFinite(x) ? x : fallback;
}

function sideOf(war: War, tag: string): WarSide | null {
  if (war.attackers.includes(tag)) return 'attackers';
  if (war.defenders.includes(tag)) return 'defenders';
  return null;
}

function enemySide(war: War, tag: string): string[] {
  const side = sideOf(war, tag);
  return side === 'attackers' ? war.defenders : side === 'defenders' ? war.attackers : [];
}

function armyOf(state: GameState, tag: string): Army {
  return state.military.armies[tag] ?? { battalions: 0, mobilized: false, equipment: 1, generals: [] };
}

function qualityOf(state: GameState, tag: string): number {
  const equipment = Math.max(0, Math.min(1, fin(armyOf(state, tag).equipment, 1)));
  const mult = fin(state.politics.countries[tag]?.modifiers.armyQualityMult, 1);
  return equipment * (mult > 0 ? mult : 1);
}

/** Controller of a state across all wars: the occupier in any war, else the owner. */
function controllerOf(state: GameState, stateId: string): string | null {
  for (const war of state.military.wars) {
    const occupier = war.occupation[stateId];
    if (occupier !== undefined) return occupier;
  }
  return state.states[stateId]?.owner ?? null;
}

/** Sea zones of the coastal states `tag` controls (where its fleet can sail from). */
export function homeZones(state: GameState, tag: string): string[] {
  const out = new Set<string>();
  for (const sid of Object.keys(state.economy.states)) {
    if (state.states[sid]?.owner !== tag || !state.economy.states[sid]?.coastal) continue;
    if (controllerOf(state, sid) !== tag) continue;
    const z = zoneOfState(sid);
    if (z) out.add(z);
  }
  return [...out].sort();
}

/** Battalions `tag` can still send (army minus troops already at sea). */
export function freeBattalions(state: GameState, tag: string): number {
  return Math.max(0, fin(armyOf(state, tag).battalions) - committedBattalions(state, tag));
}

/** Strength of the escort `tag` can give an invasion (its non-raiding fleet). */
export function escortStrength(state: GameState, tag: string): number {
  const navy = navyOf(state, tag);
  return fleetStrength(navy, navy.flotillas * (1 - navy.raidShare));
}

/** Enemy fleet that contests a landing in `war` at a state held by `holder`. */
export function opposingFleet(state: GameState, war: War, tag: string, holder: string): number {
  let total = 0;
  for (const e of enemySide(war, tag)) total += escortStrength(state, e) * (e === holder ? 1 : ALLY_NAVY_SHARE);
  return total;
}

/** Population of the states `tag` controls, and of one state. */
function popOf(state: GameState, stateId: string): number {
  let n = 0;
  for (const v of Object.values(state.economy.states[stateId]?.pops ?? {})) n += fin(v);
  return n;
}

/**
 * Battalions guarding a coastal state: the holder's army in proportion to the state's share of
 * its population (×GARRISON_SHARE weight, at most a quarter of the army), at least MIN_GARRISON.
 */
export function garrisonBattalions(state: GameState, holder: string, stateId: string): number {
  let total = 0;
  for (const sid of Object.keys(state.economy.states)) if (controllerOf(state, sid) === holder) total += popOf(state, sid);
  const share = total > 0 ? popOf(state, stateId) / total : 1;
  const army = fin(armyOf(state, holder).battalions);
  return Math.max(MIN_GARRISON, army * Math.min(0.25, share * GARRISON_SHARE));
}

/** Defenders of a coastal state against a landing. */
export function garrisonStrength(state: GameState, holder: string, stateId: string): number {
  const battalions = garrisonBattalions(state, holder, stateId);
  const owner = state.states[stateId]?.owner;
  const own = owner === holder || (owner !== null && owner !== undefined && state.diplomacy.subjects[owner] === holder);
  return battalions * qualityOf(state, holder) * (own ? DEFENDER_BONUS : 1);
}

/** Strength of `battalions` landing from the sea, with overseas supply. */
export function landingStrength(state: GameState, tag: string, battalions: number): number {
  const supply = navyOf(state, tag).supply;
  return Math.max(0, battalions) * qualityOf(state, tag) * LANDING_PENALTY * (OVERSEAS_SUPPLY_FLOOR + (1 - OVERSEAS_SUPPLY_FLOOR) * supply);
}

export interface InvasionTarget {
  stateId: string;
  holder: string;
  zone: string;
  from: string;
  km: number;
  weeks: number;
  /** Our escort vs their fleet, our landing need vs their garrison. */
  escort: number;
  enemyFleet: number;
  garrison: number;
}

/** Enemy-held coastal states `tag` could invade in `war`, nearest first. */
export function invasionTargets(state: GameState, tag: string, warId: number): InvasionTarget[] {
  const war = state.military.wars.find((w) => w.id === warId);
  if (!war || sideOf(war, tag) === null) return [];
  const from = homeZones(state, tag);
  if (from.length === 0 || navyOf(state, tag).flotillas < 1) return [];
  const enemies = new Set(enemySide(war, tag));
  const escort = escortStrength(state, tag);
  const out: InvasionTarget[] = [];
  const paths = new Map<string, ReturnType<typeof seaPath>>();
  for (const sid of Object.keys(state.economy.states).sort()) {
    if (!state.economy.states[sid]?.coastal) continue;
    const holder = controllerOf(state, sid);
    if (holder === null || !enemies.has(holder)) continue;
    const zone = zoneOfState(sid);
    if (!zone) continue;
    if (!paths.has(zone)) paths.set(zone, seaPath(from, zone));
    const path = paths.get(zone);
    if (!path) continue;
    out.push({
      stateId: sid, holder, zone, from: path.path[0] ?? zone, km: path.km,
      weeks: 1 + Math.ceil(path.km / INVASION_KM_PER_WEEK),
      escort, enemyFleet: opposingFleet(state, war, tag, holder), garrison: garrisonStrength(state, holder, sid),
    });
  }
  return out.sort((a, b) => a.km - b.km || a.stateId.localeCompare(b.stateId));
}

/** Sends `battalions` to invade `stateId` in war `warId`. Invalid orders return `state`. */
export function launchInvasion(state: GameState, tag: string, warId: number, stateId: string, battalions: number): GameState {
  const target = invasionTargets(state, tag, warId).find((t) => t.stateId === stateId);
  if (!target) return state;
  if (state.military.invasions.some((i) => i.tag === tag && i.warId === warId)) return state;
  const sent = Math.min(freeBattalions(state, tag), Math.max(0, fin(battalions)));
  if (sent < 1) return state;
  const invasion: Invasion = {
    id: state.military.nextInvasionId, warId, tag, target: stateId, from: target.from, zone: target.zone,
    battalions: sent, weeksLeft: target.weeks, admiral: bestAdmiral(navyOf(state, tag))?.id ?? null,
    startedTick: state.tickCount,
  };
  return {
    ...state,
    military: { ...state.military, invasions: [...state.military.invasions, invasion], nextInvasionId: invasion.id + 1 },
  };
}

/** Recalls an invasion still at sea (the troops return home). */
export function cancelInvasion(state: GameState, tag: string, invasionId: number): GameState {
  const invasions = state.military.invasions.filter((i) => !(i.id === invasionId && i.tag === tag));
  if (invasions.length === state.military.invasions.length) return state;
  return { ...state, military: { ...state.military, invasions } };
}

function withWar(state: GameState, war: War): GameState {
  return { ...state, military: { ...state.military, wars: state.military.wars.map((w) => (w.id === war.id ? war : w)) } };
}

function addBattle(war: War, battle: Battle): War {
  return { ...war, battles: [battle, ...war.battles].slice(0, MAX_BATTLES) };
}

/** Resolves one invasion that has arrived. */
function land(state: GameState, inv: Invasion): GameState {
  const war = state.military.wars.find((w) => w.id === inv.warId);
  const side = war ? sideOf(war, inv.tag) : null;
  if (!war || side === null) return state;
  const holder = controllerOf(state, inv.target);
  if (holder === null || !enemySide(war, inv.tag).includes(holder)) return state; // already ours
  const tick = state.tickCount;
  const attackingSide: WarSide = side;
  let next = state;
  let current = war;

  // 1. naval battle against the enemy fleet, if it has one
  const navy = navyOf(state, inv.tag);
  const escortFlotillas = navy.flotillas * (1 - navy.raidShare);
  const escort = fleetStrength(navy, escortFlotillas);
  const enemy = opposingFleet(state, war, inv.tag, holder);
  if (enemy > 0) {
    const p = escort > 0 ? (escort * escort) / (escort * escort + enemy * enemy) : 0;
    const won = rng(`naval:${inv.id}:${tick}`) < p;
    const holderNavy = navyOf(state, holder);
    const holderFlotillas = holderNavy.flotillas * (1 - holderNavy.raidShare);
    // the winner's losses shrink when it vastly outguns the loser
    const ratio = (a: number, b: number) => (a > 0 ? Math.min(1, b / a) : 1);
    const ourLoss = escortFlotillas * (won ? NAVAL_WINNER_LOSSES * ratio(escort, enemy) : NAVAL_LOSER_LOSSES);
    const theirLoss = holderFlotillas * (won ? NAVAL_LOSER_LOSSES : NAVAL_WINNER_LOSSES * ratio(enemy, escort));
    next = sinkFlotillas(next, inv.tag, ourLoss);
    next = sinkFlotillas(next, holder, theirLoss);
    current = addBattle(current, {
      tick, front: inv.zone, kind: 'naval', attackingSide, won, stateId: null,
      attackerLosses: ourLoss, defenderLosses: theirLoss,
    });
    if (!won) {
      next = applyCasualties(next, inv.tag, inv.battalions * SUNK_TRANSPORT_LOSSES * BATTALION_SIZE);
      return withWar(next, current);
    }
  }

  // 2. landing against the garrison
  const attack = landingStrength(next, inv.tag, inv.battalions);
  const defend = garrisonStrength(next, holder, inv.target);
  const p = (attack * attack) / (attack * attack + defend * defend);
  const won = rng(`landing:${inv.id}:${tick}`) < p;
  const ourLoss = inv.battalions * (won ? LANDING_WIN_LOSSES : LANDING_FAIL_LOSSES);
  const theirLoss = garrisonBattalions(next, holder, inv.target) * (won ? LANDING_FAIL_LOSSES : LANDING_WIN_LOSSES);
  next = applyCasualties(next, inv.tag, ourLoss * BATTALION_SIZE);
  next = applyCasualties(next, holder, theirLoss * BATTALION_SIZE);
  if (won) {
    const owner = next.states[inv.target]?.owner ?? null;
    const occupation = { ...current.occupation };
    // landing in our own side's occupied land liberates it
    if (owner !== null && sideOf(current, owner) === side) delete occupation[inv.target];
    else occupation[inv.target] = inv.tag;
    current = { ...current, occupation };
  }
  current = addBattle(current, {
    tick, front: inv.zone, kind: 'landing', attackingSide, won, stateId: won ? inv.target : null,
    attackerLosses: ourLoss, defenderLosses: theirLoss,
  });
  return withWar(next, current);
}

/**
 * Weekly invasion step: invasions of ended wars are dropped (the troops come home), the rest
 * sail one week; those that arrive fight and land.
 */
export function invasionStep(state: GameState): GameState {
  if (state.military.invasions.length === 0) return state;
  const warIds = new Set(state.military.wars.map((w) => w.id));
  const sailing: Invasion[] = [];
  const arrived: Invasion[] = [];
  for (const inv of [...state.military.invasions].sort((a, b) => a.id - b.id)) {
    if (!warIds.has(inv.warId)) continue;
    const weeksLeft = inv.weeksLeft - 1;
    if (weeksLeft <= 0) arrived.push({ ...inv, weeksLeft: 0 });
    else sailing.push({ ...inv, weeksLeft });
  }
  // keep wars with troops at sea alive (NO_FRONT_WEEKS)
  const wars = state.military.wars.map((w) =>
    sailing.some((i) => i.warId === w.id) || arrived.some((i) => i.warId === w.id) ? { ...w, lastFightTick: state.tickCount } : w);
  let next: GameState = { ...state, military: { ...state.military, wars, invasions: sailing } };
  for (const inv of arrived) next = land(next, inv);
  return next;
}

/**
 * AI invasions: every AI_INVASION_INTERVAL weeks an AI country at war with a fleet, no troops at
 * sea and no land front against the enemy (or a war goal it cannot reach over land) picks the
 * best coastal target it has naval superiority over and sends part of its army.
 */
export function aiInvasions(state: GameState): GameState {
  if (state.military.wars.length === 0 || state.tickCount % AI_INVASION_INTERVAL !== 0) return state;
  let next = state;
  for (const war of [...state.military.wars].sort((a, b) => a.id - b.id)) {
    for (const tag of [...war.attackers, ...war.defenders]) {
      if (tag === next.player) continue;
      if (navyOf(next, tag).flotillas < AI_MIN_FLOTILLAS) continue;
      if (next.military.invasions.some((i) => i.tag === tag)) continue;
      const current = next.military.wars.find((w) => w.id === war.id);
      if (!current) break;
      const hasFront = current.fronts.some((f) => f.attacker === tag || f.defender === tag);
      const goals = current.goals.filter((g) => g.holder === tag && g.kind === 'conquer_state' && g.stateId)
        .map((g) => g.stateId as string)
        .filter((sid) => controllerOf(next, sid) !== tag);
      // a goal with no state of ours next to it can only be reached from the sea
      const goalOverseas = goals.some((sid) => !(ADJACENCY[sid] ?? []).some((n) => controllerOf(next, n) === tag));
      if (hasFront && !goalOverseas) continue;
      // let the last landing play out before sending more troops
      const side = sideOf(current, tag);
      if (current.battles.some((b) => b.kind === 'landing' && b.attackingSide === side && next.tickCount - b.tick < AI_LANDING_COOLDOWN)) continue;
      const free = freeBattalions(next, tag);
      const send = Math.floor(free * AI_INVASION_SHARE);
      if (send < 2) continue;
      const landing = landingStrength(next, tag, send);
      // a beachhead next to the holder's main army is only worth it for a war goal
      const ours = free * qualityOf(next, tag);
      const goalSet = new Set(goals);
      const options = invasionTargets(next, tag, war.id).filter((t) => {
        if (t.escort < t.enemyFleet * AI_SUPERIORITY || landing < t.garrison * 1.3) return false;
        if (goalSet.has(t.stateId)) return true;
        const theirs = fin(armyOf(next, t.holder).battalions) * qualityOf(next, t.holder) * DEFENDER_BONUS;
        const island = !(ADJACENCY[t.stateId] ?? []).some((n) => controllerOf(next, n) === t.holder);
        return island || ours >= theirs * 0.6;
      });
      if (options.length === 0) continue;
      const pick = options.find((t) => goalSet.has(t.stateId))
        ?? options.find((t) => t.holder === (sideOf(current, tag) === 'attackers' ? current.defenders[0] : current.attackers[0]))
        ?? options[0];
      if (pick) next = launchInvasion(next, tag, war.id, pick.stateId, send);
    }
  }
  return next;
}
