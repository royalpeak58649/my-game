// Wars: fronts, battles, casualties, war score, exhaustion and peace — see docs/WAR.md, "Wars".
//
// Everything here is pure: the returned GameState shares every untouched part with the input and
// copies the military / diplomacy / economy parts it changes. Countries are processed in sorted
// tag order and wars in id order, so the result is deterministic. No NaN is ever stored: every
// division is guarded and every number written back is finite.

import ADJACENCY_JSON from '../../data/adjacency.json';
import { nameHash } from '../../data/diplomacy/names';
import {
  BATTALION_SIZE, CAPITULATION_EXHAUSTION, DEFENDER_BONUS, EXHAUSTION_BASE, EXHAUSTION_PER_LOSS,
  EXHAUSTION_PER_OCCUPIED, GENERAL_SKILL_BONUS, LOSER_CASUALTIES, MAX_WAR_WEEKS, PRESTIGE_WAR_WIN,
  TRUCE_WEEKS, WINNER_CASUALTIES,
} from '../../data/diplomacy/rules';
import { pairKey } from '../diplomacy/pair';
import type {
  Army, Battle, DiplomaticPlay, Front, General, War, WarGoal, WarSide,
} from '../diplomacy/types';
import type { CountryEconomy, EconomyState, StateEconomy } from '../economy/types';
import type { GameState } from '../types';

/** Land borders: `{ stateId: neighbourIds[] }`, symmetric. */
export type Adjacency = Record<string, string[]>;

const ADJACENCY = ADJACENCY_JSON as Adjacency;

/** Battles kept per war. */
const MAX_BATTLES = 12;
/** A side with no battalions loses a contact state every other week. */
const FREE_OCCUPY_INTERVAL = 2;
/** Exhaustion at which an AI leader accepts a white peace offer. */
export const WHITE_PEACE_EXHAUSTION = 50;

const SIDES: readonly WarSide[] = ['attackers', 'defenders'];

// ------------------------------------------------------------------ helpers

function clamp(x: number, lo: number, hi: number): number {
  if (!Number.isFinite(x)) return lo;
  return x < lo ? lo : x > hi ? hi : x;
}

function fin(x: number | undefined, fallback = 0): number {
  return x !== undefined && Number.isFinite(x) ? x : fallback;
}

/** mulberry32 seeded with nameHash(seed); the first output is in [0, 1). */
export function rng(seed: string): number {
  let a = nameHash(seed) >>> 0;
  a = (a + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function otherSide(side: WarSide): WarSide {
  return side === 'attackers' ? 'defenders' : 'attackers';
}

function sideOf(war: War, tag: string): WarSide | null {
  if (war.attackers.includes(tag)) return 'attackers';
  if (war.defenders.includes(tag)) return 'defenders';
  return null;
}

function sideTags(war: War, side: WarSide): string[] {
  return side === 'attackers' ? war.attackers : war.defenders;
}

function leaderOf(war: War, side: WarSide): string | null {
  return sideTags(war, side)[0] ?? null;
}

/** Controller of a state in one war: the occupier, else the owner. */
export function controllerIn(war: War, state: GameState, stateId: string): string | null {
  return war.occupation[stateId] ?? state.states[stateId]?.owner ?? null;
}

/** Controller of a state across all wars: the occupier in any war, else the owner. */
export function controllerOf(state: GameState, stateId: string): string | null {
  for (const war of state.military.wars) {
    const occupier = war.occupation[stateId];
    if (occupier !== undefined) return occupier;
  }
  return state.states[stateId]?.owner ?? null;
}

/** True if `a` and `b` are on opposite sides of some war. */
export function isAtWar(state: GameState, a: string, b: string): boolean {
  if (a === b) return false;
  for (const war of state.military.wars) {
    const side = sideOf(war, a);
    if (side === null) continue;
    if (sideTags(war, otherSide(side)).includes(b)) return true;
  }
  return false;
}

/** Total people of a state economy. */
function populationOf(se: StateEconomy | undefined): number {
  if (!se) return 0;
  let total = 0;
  for (const count of Object.values(se.pops)) total += fin(count);
  return total;
}

/** Army of a tag, or a neutral one when the tag has none. */
function armyOf(state: GameState, tag: string): Army {
  return state.military.armies[tag] ?? { battalions: 0, mobilized: false, equipment: 1, generals: [] };
}

/** Army quality: equipment × the country's army quality modifier. */
function qualityOf(state: GameState, tag: string): number {
  const equipment = clamp(fin(armyOf(state, tag).equipment, 1), 0, 1);
  const mult = fin(state.politics.countries[tag]?.modifiers.armyQualityMult, 1);
  return equipment * (mult > 0 ? mult : 1);
}

/** Best general by skill (ties by id), or null. */
export function bestGeneral(generals: readonly General[]): General | null {
  let best: General | null = null;
  for (const g of generals) {
    if (!best || g.skill > best.skill || (g.skill === best.skill && g.id < best.id)) best = g;
  }
  return best;
}

function generalSkillOf(state: GameState, tag: string, generalId: string | null): number {
  if (generalId === null) return 0;
  const general = armyOf(state, tag).generals.find((g) => g.id === generalId);
  return general ? clamp(fin(general.skill), 0, 5) : 0;
}

/** Replaces one army, keeping the rest of the military state untouched. */
function withArmy(military: GameState['military'], tag: string, army: Army): GameState['military'] {
  return { ...military, armies: { ...military.armies, [tag]: army } };
}

/** Replaces one state economy, keeping the rest of the economy untouched. */
function withStateEconomy(economy: EconomyState, stateId: string, se: StateEconomy): EconomyState {
  return { ...economy, states: { ...economy.states, [stateId]: se } };
}

/** Replaces one country economy, keeping the rest of the economy untouched. */
function withCountryEconomy(economy: EconomyState, tag: string, country: CountryEconomy): EconomyState {
  return { ...economy, countries: { ...economy.countries, [tag]: country } };
}

/** Adds `amount` to a country's prestige bonus (no-op for unknown countries). */
function addPrestige(state: GameState, tag: string, amount: number): GameState {
  const country = state.diplomacy.countries[tag];
  if (!country) return state;
  const prestigeBonus = fin(country.prestigeBonus) + amount;
  return {
    ...state,
    diplomacy: {
      ...state.diplomacy,
      countries: { ...state.diplomacy.countries, [tag]: { ...country, prestigeBonus } },
    },
  };
}

/** Sets a truce between two countries, keeping the longer one. */
function withTruce(state: GameState, a: string, b: string): GameState {
  const key = pairKey(a, b);
  const current = fin(state.diplomacy.truces[key]);
  if (current >= TRUCE_WEEKS) return state;
  return {
    ...state,
    diplomacy: { ...state.diplomacy, truces: { ...state.diplomacy.truces, [key]: TRUCE_WEEKS } },
  };
}

// ------------------------------------------------------------------ startWar

/** "British–French War" from the two leaders' country names. */
function warName(state: GameState, a: string, b: string): string {
  const nameA = state.countries[a]?.name ?? a;
  const nameB = state.countries[b]?.name ?? b;
  return `${nameA}–${nameB} War`;
}

/**
 * Turns a resolved diplomatic play into a war: creates the War, mobilises every participant and
 * removes the play from the diplomacy state.
 */
export function startWar(state: GameState, play: DiplomaticPlay): GameState {
  const attackers = [play.initiator, ...play.supporters.initiator.filter((t) => t !== play.initiator)];
  const defenders = [play.target, ...play.supporters.target.filter((t) => t !== play.target)];
  const war: War = {
    id: state.military.nextWarId,
    name: warName(state, play.initiator, play.target),
    attackers,
    defenders,
    goals: play.goals.map((g) => ({ ...g })),
    occupation: {},
    exhaustion: { attackers: 0, defenders: 0 },
    warScore: 0,
    fronts: [],
    battles: [],
    startedTick: state.tickCount,
  };

  let military: GameState['military'] = {
    ...state.military,
    wars: [...state.military.wars, war],
    nextWarId: state.military.nextWarId + 1,
  };
  for (const tag of [...attackers, ...defenders]) {
    military = withArmy(military, tag, { ...armyOf(state, tag), mobilized: true });
  }

  return {
    ...state,
    military,
    diplomacy: { ...state.diplomacy, plays: state.diplomacy.plays.filter((p) => p.id !== play.id) },
  };
}

// ------------------------------------------------------------------ enforceGoals

/**
 * Enforces war goals (peace or back-down): conquer_state transfers ownership, make_subject makes
 * the target a subject and humiliate moves prestige. Does not run the after-peace steps.
 */
export function enforceGoals(state: GameState, goals: WarGoal[], winner: string, loser: string): GameState {
  let next = state;
  for (const goal of goals) {
    switch (goal.kind) {
      case 'conquer_state': {
        const stateId = goal.stateId;
        if (stateId === undefined) break;
        const def = next.states[stateId];
        if (!def || def.owner !== goal.target) break;
        const oldOwner = goal.target;
        next = {
          ...next,
          states: { ...next.states, [stateId]: { ...def, owner: goal.holder } },
          ownershipVersion: next.ownershipVersion + 1,
        };
        const country = next.economy.countries[oldOwner];
        if (country) {
          const queue = country.queue.filter((item) => item.stateId !== stateId);
          if (queue.length !== country.queue.length) {
            next = { ...next, economy: withCountryEconomy(next.economy, oldOwner, { ...country, queue }) };
          }
        }
        break;
      }
      case 'make_subject': {
        const subjects = { ...next.diplomacy.subjects, [goal.target]: goal.holder };
        const alliances = next.diplomacy.alliances.filter((key) => {
          const [a, b] = key.split('|');
          return a !== goal.target && b !== goal.target;
        });
        next = { ...next, diplomacy: { ...next.diplomacy, subjects, alliances } };
        break;
      }
      case 'humiliate': {
        const amount = PRESTIGE_WAR_WIN / 2;
        next = addPrestige(next, goal.holder, amount);
        next = addPrestige(next, goal.target, -amount);
        break;
      }
      default:
        break;
    }
  }
  // `winner` / `loser` are informational: the goals carry their own holder and target.
  void winner;
  void loser;
  return next;
}

// ------------------------------------------------------------------ warStep

/** Per-tick precomputed world: controllers, controlled states and populations. */
interface World {
  /** stateId -> controller (occupation in any war, else owner). */
  controller: Map<string, string | null>;
  /** tag -> states it controls, sorted. */
  controlled: Map<string, string[]>;
  /** stateId -> population. */
  population: Map<string, number>;
  /** tag -> Σ population of the states it controls. */
  controlledPopulation: Map<string, number>;
}

function buildWorld(state: GameState): World {
  const controller = new Map<string, string | null>();
  const controlled = new Map<string, string[]>();
  const population = new Map<string, number>();
  const controlledPopulation = new Map<string, number>();

  for (const stateId of Object.keys(state.states).sort()) {
    const tag = controllerOf(state, stateId);
    controller.set(stateId, tag);
    const pop = populationOf(state.economy.states[stateId]);
    population.set(stateId, pop);
    if (tag === null) continue;
    const list = controlled.get(tag);
    if (list) list.push(stateId);
    else controlled.set(tag, [stateId]);
    controlledPopulation.set(tag, (controlledPopulation.get(tag) ?? 0) + pop);
  }
  return { controller, controlled, population, controlledPopulation };
}

function neighboursOf(adjacency: Adjacency, stateId: string): string[] {
  return adjacency[stateId] ?? [];
}

/** States controlled by `tag` that are land-adjacent to a state controlled by `other`. */
function contactStates(world: World, adjacency: Adjacency, tag: string, other: string): string[] {
  const out: string[] = [];
  for (const stateId of world.controlled.get(tag) ?? []) {
    for (const neighbour of neighboursOf(adjacency, stateId)) {
      if (world.controller.get(neighbour) === other) {
        out.push(stateId);
        break;
      }
    }
  }
  return out;
}

/** One front per bordering pair of opposing countries (step 1). */
function buildFronts(war: War, world: World, adjacency: Adjacency): Front[] {
  const fronts: Front[] = [];
  for (const attacker of war.attackers) {
    for (const defender of war.defenders) {
      if (contactStates(world, adjacency, attacker, defender).length === 0) continue;
      fronts.push({
        id: `${attacker}|${defender}`,
        attacker,
        defender,
        attackerBattalions: 0,
        defenderBattalions: 0,
        attackerGeneral: null,
        defenderGeneral: null,
      });
    }
  }
  return fronts;
}

/** Battalions a country can commit: its army, doubled while mobilised. */
function availableBattalions(state: GameState, tag: string): number {
  const army = armyOf(state, tag);
  const battalions = Math.max(0, fin(army.battalions));
  return army.mobilized ? battalions * 2 : battalions;
}

/** A country's fronts in one war, with the contact-state count of each. */
interface FrontSlot {
  warId: number;
  frontIndex: number;
  contacts: number;
}

/** Step 2: splits every country's battalions over all its fronts in all wars. */
function allocate(
  state: GameState,
  wars: War[],
  world: World,
  adjacency: Adjacency,
): { wars: War[]; slots: Map<string, FrontSlot[]> } {
  const slots = new Map<string, FrontSlot[]>();

  for (const war of wars) {
    for (let frontIndex = 0; frontIndex < war.fronts.length; frontIndex++) {
      const front = war.fronts[frontIndex];
      if (!front) continue;
      const attackerContacts = contactStates(world, adjacency, front.attacker, front.defender).length;
      const defenderContacts = contactStates(world, adjacency, front.defender, front.attacker).length;
      for (const [tag, count] of [[front.attacker, attackerContacts], [front.defender, defenderContacts]] as const) {
        const list = slots.get(tag);
        const slot: FrontSlot = { warId: war.id, frontIndex, contacts: count };
        if (list) list.push(slot);
        else slots.set(tag, [slot]);
      }
    }
  }

  const nextWars = wars.map((war) => ({
    ...war,
    fronts: war.fronts.map((front): Front => ({ ...front, attackerBattalions: 0, defenderBattalions: 0, attackerGeneral: null, defenderGeneral: null })),
  }));

  for (const tag of [...slots.keys()].sort()) {
    const tagSlots = slots.get(tag) ?? [];
    const total = tagSlots.reduce((sum, slot) => sum + slot.contacts, 0);
    const battalions = availableBattalions(state, tag);
    const generals = [...armyOf(state, tag).generals].sort((a, b) => b.skill - a.skill || a.id.localeCompare(b.id));
    let generalIndex = 0;

    for (const slot of tagSlots) {
      const war = nextWars.find((w) => w.id === slot.warId);
      const front = war?.fronts[slot.frontIndex];
      if (!war || !front) continue;
      const share = total > 0 ? (battalions * slot.contacts) / total : 0;
      const general = generals[generalIndex] ?? null;
      if (general) generalIndex += 1;
      if (front.attacker === tag) {
        front.attackerBattalions = share;
        front.attackerGeneral = general ? general.id : null;
      } else {
        front.defenderBattalions = share;
        front.defenderGeneral = general ? general.id : null;
      }
    }
  }

  return { wars: nextWars, slots };
}

/** Strength of one side of a front: committed × quality × (1 + general bonus). */
function frontStrength(state: GameState, tag: string, battalions: number, generalId: string | null): number {
  const skill = generalSkillOf(state, tag, generalId);
  return Math.max(0, battalions) * qualityOf(state, tag) * (1 + GENERAL_SKILL_BONUS * skill);
}

/** True if `stateId` is owned by `tag` or by one of its subjects. */
function onOwnSoil(state: GameState, tag: string, stateId: string): boolean {
  const owner = state.states[stateId]?.owner;
  if (owner === undefined || owner === null) return false;
  return owner === tag || state.diplomacy.subjects[owner] === tag;
}

/** Least populous state of `candidates` (ties by id). */
function leastPopulous(world: World, candidates: readonly string[]): string | null {
  let best: string | null = null;
  let bestPop = Infinity;
  for (const stateId of candidates) {
    const pop = world.population.get(stateId) ?? 0;
    if (best === null || pop < bestPop || (pop === bestPop && stateId < best)) {
      best = stateId;
      bestPop = pop;
    }
  }
  return best;
}

/** Occupied states of `side` that are adjacent to a state controlled by `attacker`. */
function liberatable(world: World, adjacency: Adjacency, war: War, side: WarSide, attacker: string): string[] {
  const out: string[] = [];
  for (const stateId of Object.keys(war.occupation).sort()) {
    const owner = world.controller.get(stateId);
    if (owner === undefined || owner === null) continue;
    const ownerSide = sideOf(war, owner);
    if (ownerSide !== side) continue;
    if (neighboursOf(adjacency, stateId).some((n) => world.controller.get(n) === attacker)) out.push(stateId);
  }
  return out;
}

/** Removes `soldiers` from a country's barracks and soldier pops, proportionally. */
function applyCasualties(state: GameState, tag: string, soldiers: number): GameState {
  if (!(soldiers > 0)) return state;
  const stateIds = Object.keys(state.economy.states).sort().filter((id) => state.states[id]?.owner === tag);
  let total = 0;
  for (const stateId of stateIds) {
    const se = state.economy.states[stateId];
    if (se) total += Math.max(0, fin(se.buildings.barracks?.employed.soldiers));
  }
  if (total <= 0) return state;

  const take = Math.min(soldiers, total);
  let economy = state.economy;
  for (const stateId of stateIds) {
    const se = economy.states[stateId];
    const employed = Math.max(0, fin(se?.buildings.barracks?.employed.soldiers));
    if (!se || employed <= 0) continue;
    const lost = Math.min(employed, (take * employed) / total);
    const barracks = se.buildings.barracks;
    if (!barracks) continue;
    const nextEmployed = Math.max(0, employed - lost);
    const nextSoldierPops = Math.max(0, fin(se.pops.soldiers) - lost);
    const nextState: StateEconomy = {
      ...se,
      pops: { ...se.pops, soldiers: nextSoldierPops },
      buildings: {
        ...se.buildings,
        barracks: { ...barracks, employed: { ...barracks.employed, soldiers: nextEmployed } },
      },
    };
    economy = withStateEconomy(economy, stateId, nextState);
  }
  return { ...state, economy };
}

/** Population of `side`'s own states occupied by the other side, and its total population. */
function occupiedShare(war: War, world: World, side: WarSide): { occupied: number; total: number } {
  const other = otherSide(side);
  let occupied = 0;
  let total = 0;
  for (const tag of sideTags(war, side)) {
    for (const stateId of world.controlled.get(tag) ?? []) {
      const pop = world.population.get(stateId) ?? 0;
      total += pop;
      const occupier = war.occupation[stateId];
      if (occupier !== undefined && sideOf(war, occupier) === other) occupied += pop;
    }
  }
  return { occupied, total };
}

/** Step 5: war score from −100 to 100, positive favouring the attackers. */
function warScoreOf(war: War, world: World): number {
  const attacker = occupiedShare(war, world, 'attackers');
  const defender = occupiedShare(war, world, 'defenders');
  const attackerShare = attacker.total > 0 ? attacker.occupied / attacker.total : 0;
  const defenderShare = defender.total > 0 ? defender.occupied / defender.total : 0;
  return clamp((defenderShare - attackerShare) * 100, -100, 100);
}

/** Step 6: exhaustion of one side. */
function exhaustionOf(
  war: War,
  world: World,
  side: WarSide,
  losses: number,
  battalions: number,
): number {
  const { occupied, total } = occupiedShare(war, world, side);
  const lossShare = battalions > 0 ? (losses / battalions) * 100 : 0;
  const occupiedSharePct = total > 0 ? (occupied / total) * 100 : 0;
  const current = fin(war.exhaustion[side]);
  return clamp(
    current + EXHAUSTION_BASE + EXHAUSTION_PER_LOSS * lossShare + EXHAUSTION_PER_OCCUPIED * occupiedSharePct,
    0,
    100,
  );
}

/** After-peace steps: winner prestige, clear occupation, truces, AI demobilisation. */
function afterPeace(state: GameState, war: War, winner: string | null): GameState {
  let next = state;
  if (winner !== null) next = addPrestige(next, winner, PRESTIGE_WAR_WIN);
  for (const attacker of war.attackers) {
    for (const defender of war.defenders) next = withTruce(next, attacker, defender);
  }
  return next;
}

/** Demobilises AI countries that are no longer in any war. */
function demobiliseIdle(state: GameState): GameState {
  let military = state.military;
  for (const tag of Object.keys(state.military.armies).sort()) {
    if (tag === state.player) continue;
    const army = state.military.armies[tag];
    if (!army || !army.mobilized) continue;
    if (state.military.wars.some((war) => sideOf(war, tag) !== null)) continue;
    military = withArmy(military, tag, { ...army, mobilized: false });
  }
  return military === state.military ? state : { ...state, military };
}

/** One war's weekly steps 1–7. Returns the new state and the surviving war (null = ended). */
function stepWar(
  state: GameState,
  war: War,
  world: World,
  adjacency: Adjacency,
): { state: GameState; war: War | null } {
  const tick = state.tickCount;

  // 1. Fronts
  const fronts = buildFronts(war, world, adjacency);
  let current: War = { ...war, fronts };

  // 2. Allocation (over all wars of the country, done by the caller)
  // 3. Battles
  const losses: Record<WarSide, number> = { attackers: 0, defenders: 0 };
  const battles: Battle[] = [];
  let occupation: Record<string, string> = { ...current.occupation };

  for (const front of current.fronts) {
    const attackerStrength = frontStrength(state, front.attacker, front.attackerBattalions, front.attackerGeneral);
    const defenderStrength = frontStrength(state, front.defender, front.defenderBattalions, front.defenderGeneral);
    if (attackerStrength <= 0 && defenderStrength <= 0) continue;

    const attackerContacts = contactStates(world, adjacency, front.attacker, front.defender);
    const defenderContacts = contactStates(world, adjacency, front.defender, front.attacker);
    const contested = leastPopulous(world, defenderContacts) ?? leastPopulous(world, attackerContacts);
    const defenderOnOwnSoil = contested !== null && onOwnSoil(state, front.defender, contested);
    const attackerOnOwnSoil = contested !== null && onOwnSoil(state, front.attacker, contested);

    const attackerScore = attackerStrength * (attackerOnOwnSoil ? DEFENDER_BONUS : 1);
    const defenderScore = defenderStrength * (defenderOnOwnSoil ? DEFENDER_BONUS : 1);

    const attackingSide: WarSide = attackerScore >= defenderScore ? 'attackers' : 'defenders';
    const attackerIsAttacking = attackingSide === 'attackers';
    const attackStrength = attackerIsAttacking ? attackerScore : defenderScore;
    const defendStrength = attackerIsAttacking ? defenderScore : attackerScore;
    const attackBattalions = attackerIsAttacking ? front.attackerBattalions : front.defenderBattalions;
    const defendBattalions = attackerIsAttacking ? front.defenderBattalions : front.attackerBattalions;
    const attackTag = attackerIsAttacking ? front.attacker : front.defender;
    const defendTag = attackerIsAttacking ? front.defender : front.attacker;
    const attackSide: WarSide = attackerIsAttacking ? 'attackers' : 'defenders';
    const defendSide = otherSide(attackSide);

    // No defenders: the attacker takes a contact state without a battle every other week.
    if (defendBattalions <= 0) {
      if (tick % FREE_OCCUPY_INTERVAL !== 0) continue;
      const target = leastPopulous(world, attackerIsAttacking ? defenderContacts : attackerContacts);
      if (target === null) continue;
      occupation = { ...occupation, [target]: attackTag };
      battles.push({
        tick, front: front.id, attackingSide: attackSide, won: true, stateId: target,
        attackerLosses: 0, defenderLosses: 0,
      });
      continue;
    }

    const p = (attackStrength * attackStrength) / (attackStrength * attackStrength + defendStrength * defendStrength);
    const won = rng(`${current.id}:${front.id}:${tick}`) < p;
    const attackLosses = attackBattalions * (won ? WINNER_CASUALTIES : LOSER_CASUALTIES);
    const defendLosses = defendBattalions * (won ? LOSER_CASUALTIES : WINNER_CASUALTIES);
    losses[attackSide] += attackLosses;
    losses[defendSide] += defendLosses;

    let captured: string | null = null;
    if (won) {
      const own = liberatable(world, adjacency, { ...current, occupation }, attackSide, attackTag);
      const target = own.length > 0 ? leastPopulous(world, own) : leastPopulous(world, attackerIsAttacking ? defenderContacts : attackerContacts);
      if (target !== null) {
        occupation = { ...occupation, [target]: attackTag };
        captured = target;
      }
    }
    battles.push({
      tick, front: front.id, attackingSide: attackSide, won, stateId: captured,
      attackerLosses: attackLosses, defenderLosses: defendLosses,
    });
    void defendTag;
  }

  current = { ...current, occupation, battles: [...battles.reverse(), ...current.battles].slice(0, MAX_BATTLES) };

  // 4. Casualties
  let next = state;
  for (const side of SIDES) {
    const soldiers = losses[side] * BATTALION_SIZE;
    if (!(soldiers > 0)) continue;
    const tags = sideTags(current, side);
    const battalions = tags.reduce((sum, tag) => sum + Math.max(0, fin(armyOf(state, tag).battalions)), 0);
    if (battalions <= 0) continue;
    for (const tag of tags) {
      const share = Math.max(0, fin(armyOf(state, tag).battalions)) / battalions;
      next = applyCasualties(next, tag, soldiers * share);
    }
  }

  // 5. War score
  current = { ...current, warScore: warScoreOf(current, world) };

  // 6. Exhaustion
  const sideBattalions = (side: WarSide): number =>
    sideTags(current, side).reduce((sum, tag) => sum + Math.max(0, fin(armyOf(state, tag).battalions)), 0);
  current = {
    ...current,
    exhaustion: {
      attackers: exhaustionOf(current, world, 'attackers', losses.attackers, sideBattalions('attackers')),
      defenders: exhaustionOf(current, world, 'defenders', losses.defenders, sideBattalions('defenders')),
    },
  };

  // 7. Peace
  const attackerLeader = leaderOf(current, 'attackers');
  const defenderLeader = leaderOf(current, 'defenders');
  const defendersOut = current.exhaustion.defenders >= CAPITULATION_EXHAUSTION;
  const attackersOut = current.exhaustion.attackers >= CAPITULATION_EXHAUSTION;
  const tooLong = tick - current.startedTick >= MAX_WAR_WEEKS;

  if (defendersOut && !attackersOut) {
    next = enforceGoals(next, current.goals, attackerLeader ?? '', defenderLeader ?? '');
    next = afterPeace(next, current, attackerLeader);
    return { state: next, war: null };
  }
  if (attackersOut && !defendersOut) {
    if (attackerLeader !== null) next = addPrestige(next, attackerLeader, -10);
    next = afterPeace(next, current, defenderLeader);
    return { state: next, war: null };
  }
  if ((defendersOut && attackersOut) || tooLong) {
    next = afterPeace(next, current, null);
    return { state: next, war: null };
  }

  return { state: next, war: current };
}

/**
 * Weekly war tick (docs/WAR.md, "Wars"): fronts, allocation, battles, casualties, war score,
 * exhaustion and peace for every war in id order, then the after-peace steps.
 * `adjacency` defaults to the real land borders; tests inject a tiny graph.
 */
export function warStep(state: GameState, adjacency: Adjacency = ADJACENCY): GameState {
  if (state.military.wars.length === 0) return state;

  const world = buildWorld(state);
  const wars = [...state.military.wars].sort((a, b) => a.id - b.id);

  // Step 1 + 2 for every war at once: a country splits its battalions over all its fronts.
  const withFronts = wars.map((war) => ({ ...war, fronts: buildFronts(war, world, adjacency) }));
  const allocated = allocate(state, withFronts, world, adjacency).wars;

  let next = state;
  const surviving: War[] = [];
  for (const war of allocated) {
    const result = stepWar(next, war, world, adjacency);
    next = result.state;
    if (result.war) surviving.push(result.war);
  }

  next = { ...next, military: { ...next.military, wars: surviving } };
  return demobiliseIdle(next);
}
