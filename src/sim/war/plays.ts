// Diplomatic plays — see docs/WAR.md, "Diplomatic plays".
//
// Pure: the diplomacy and military states are copied once per step and the returned GameState
// shares everything else with the input. Plays are processed in id order and countries in sorted
// tag order, so the result is deterministic.

import adjacencyJson from '../../data/adjacency.json';
import {
  AI_PLAY_INTERVAL, AI_PLAY_STRENGTH_RATIO, BACK_DOWN_RATIO, GREAT_POWER_COUNT, PLAY_WEEKS,
  PRESTIGE_WAR_WIN, TRUCE_WEEKS,
} from '../../data/diplomacy/rules';
import { pairKey } from '../diplomacy/pair';
import type {
  DiplomaticPlay, DiplomacyState, MilitaryState, PlaySide, WarGoal,
} from '../diplomacy/types';
import type { GameState } from '../types';
import { armyStrength } from './armies';
import { enforceGoals, rng, startWar } from './wars';

const ADJACENCY = adjacencyJson as Record<string, string[]>;

/** Most goals a play may carry. */
export const MAX_PLAY_GOALS = 3;
/** Relations at or above which a great power joins the other side of a play. */
export const GREAT_POWER_JOIN_RELATIONS = 20;
/** Relations below which the AI prefers a country as a play target. */
export const AI_PLAY_HOSTILE_RELATIONS = -20;
/** Chance per AI_PLAY_INTERVAL weeks that an AI country starts a play. */
export const AI_PLAY_CHANCE = 0.3;
/** The initiator backs down when its side is below this share of the target side. */
export const INITIATOR_BACK_DOWN_RATIO = 0.8;

function fin(x: number | undefined, fallback = 0): number {
  return x !== undefined && Number.isFinite(x) ? x : fallback;
}

/** Σ char codes % 26, used to spread AI decisions over the interval. */
export function tagParity(tag: string): number {
  let sum = 0;
  for (let i = 0; i < tag.length; i++) sum += tag.charCodeAt(i);
  return sum % 26;
}

/** Country tags that own at least one state with an economy, sorted. */
export function existingTags(state: GameState): string[] {
  const tags = new Set<string>();
  for (const stateId of Object.keys(state.economy.states)) {
    const owner = state.states[stateId]?.owner;
    if (owner) tags.add(owner);
  }
  return [...tags].sort();
}

/** True if `tag` owns at least one state with an economy. */
export function exists(state: GameState, tag: string): boolean {
  for (const stateId of Object.keys(state.economy.states)) {
    if (state.states[stateId]?.owner === tag) return true;
  }
  return false;
}

/** True if the two countries share a land border. */
export function landBorder(state: GameState, a: string, b: string): boolean {
  if (a === b) return false;
  for (const stateId of Object.keys(state.economy.states)) {
    if (state.states[stateId]?.owner !== a) continue;
    for (const neighbour of ADJACENCY[stateId] ?? []) {
      if (state.states[neighbour]?.owner === b) return true;
    }
  }
  return false;
}

/** States of `tag` that border a state of `other` (land). */
export function adjacentStates(state: GameState, tag: string, other: string): string[] {
  const out: string[] = [];
  for (const stateId of Object.keys(state.economy.states).sort()) {
    if (state.states[stateId]?.owner !== tag) continue;
    if ((ADJACENCY[stateId] ?? []).some((n) => state.states[n]?.owner === other)) out.push(stateId);
  }
  return out;
}

/** Population of a state (0 when it has no economy). */
export function statePopulation(state: GameState, stateId: string): number {
  const economy = state.economy.states[stateId];
  if (!economy) return 0;
  let total = 0;
  for (const count of Object.values(economy.pops)) total += fin(count);
  return total;
}

/** True if `tag` is one of the first GREAT_POWER_COUNT entries of the prestige ranking. */
export function isGreatPower(state: GameState, tag: string): boolean {
  const ranking = state.diplomacy.ranking;
  const index = ranking.indexOf(tag);
  return index >= 0 && index < GREAT_POWER_COUNT;
}

/** Overlord of `tag`, or null. */
export function overlordOf(state: GameState, tag: string): string | null {
  return state.diplomacy.subjects[tag] ?? null;
}

/** True if `a` and `b` are allied. */
export function allied(state: GameState, a: string, b: string): boolean {
  return state.diplomacy.alliances.includes(pairKey(a, b));
}

/** Relations between two countries (0 when unset). */
export function relations(state: GameState, a: string, b: string): number {
  return fin(state.diplomacy.relations[pairKey(a, b)]);
}

/** True if either country is the other's rival. */
export function rivals(state: GameState, a: string, b: string): boolean {
  return (state.diplomacy.countries[a]?.rivals.includes(b) ?? false)
    || (state.diplomacy.countries[b]?.rivals.includes(a) ?? false);
}

/** True if a truce is in force between the two countries. */
export function truce(state: GameState, a: string, b: string): boolean {
  return fin(state.diplomacy.truces[pairKey(a, b)]) > 0;
}

/** True if the two countries are at war. */
export function atWar(state: GameState, a: string, b: string): boolean {
  return state.military.wars.some((war) => (
    (war.attackers.includes(a) && war.defenders.includes(b))
    || (war.attackers.includes(b) && war.defenders.includes(a))
  ));
}

/** The play `tag` takes part in (as leader or supporter), or null. */
export function playOf(state: GameState, tag: string): DiplomaticPlay | null {
  for (const play of state.diplomacy.plays) {
    if (play.initiator === tag || play.target === tag) return play;
    if (play.supporters.initiator.includes(tag) || play.supporters.target.includes(tag)) return play;
  }
  return null;
}

/** True if `tag` is at war. */
export function inWar(state: GameState, tag: string): boolean {
  return state.military.wars.some((war) => war.attackers.includes(tag) || war.defenders.includes(tag));
}

/** The war goals `tag` may demand from `target`. */
export function possibleWarGoals(state: GameState, tag: string, target: string): WarGoal[] {
  if (tag === target) return [];
  if (!exists(state, tag) || !exists(state, target)) return [];
  const goals: WarGoal[] = [{ kind: 'humiliate', holder: tag, target }];
  if (!isGreatPower(state, target) && overlordOf(state, target) === null) {
    goals.push({ kind: 'make_subject', holder: tag, target });
  }
  for (const stateId of adjacentStates(state, target, tag)) {
    goals.push({ kind: 'conquer_state', holder: tag, target, stateId });
  }
  return goals;
}

/** True if `goal` is one of `allowed` (same kind, holder, target and state). */
export function goalAllowed(goal: WarGoal, allowed: readonly WarGoal[]): boolean {
  return allowed.some((g) => g.kind === goal.kind && g.holder === goal.holder
    && g.target === goal.target && g.stateId === goal.stateId);
}

/** True if `tag` may start a play against `target` (ignoring the goals). */
export function canStartPlay(state: GameState, tag: string, target: string): boolean {
  if (tag === target) return false;
  if (!exists(state, tag) || !exists(state, target)) return false;
  if (allied(state, tag, target)) return false;
  if (overlordOf(state, tag) === target || overlordOf(state, target) === tag) return false;
  if (overlordOf(state, tag) !== null) return false;
  if (truce(state, tag, target) || atWar(state, tag, target)) return false;
  if (playOf(state, tag) !== null || playOf(state, target) !== null) return false;
  return true;
}

/** Countries backing one side of a play, leaders included. */
export function sideMembers(play: DiplomaticPlay, side: PlaySide): string[] {
  const leader = side === 'initiator' ? play.initiator : play.target;
  return [leader, ...play.supporters[side]];
}

/** Army strength of one side of a play (unmobilised). */
export function playSideStrength(state: GameState, play: DiplomaticPlay, side: PlaySide): number {
  let total = 0;
  for (const tag of sideMembers(play, side)) total += armyStrength(state, tag);
  return total;
}

/** Strength of `tag` plus its subjects. */
function ownSideStrength(state: GameState, tag: string): number {
  let total = armyStrength(state, tag);
  for (const [subject, overlord] of Object.entries(state.diplomacy.subjects)) {
    if (overlord === tag) total += armyStrength(state, subject);
  }
  return total;
}

/** Strength of `tag` plus its allies and its overlord. */
function opposingSideStrength(state: GameState, tag: string): number {
  let total = armyStrength(state, tag);
  for (const key of state.diplomacy.alliances) {
    const [a, b] = key.split('|');
    if (a === tag && b !== undefined) total += armyStrength(state, b);
    else if (b === tag && a !== undefined) total += armyStrength(state, a);
  }
  const overlord = overlordOf(state, tag);
  if (overlord !== null) total += armyStrength(state, overlord);
  return total;
}

/** Adds `tag` to a side of `play` unless it is already there. Mutates `play`. */
function addSupporter(play: DiplomaticPlay, side: PlaySide, tag: string): void {
  if (play.initiator === tag || play.target === tag) return;
  if (play.supporters.initiator.includes(tag) || play.supporters.target.includes(tag)) return;
  play.supporters[side].push(tag);
}

/** Step 1: countries joining a play. Mutates `play`. */
function joinStep(state: GameState, play: DiplomaticPlay): void {
  const leaders = [play.initiator, play.target];
  for (const tag of existingTags(state)) {
    if (leaders.includes(tag)) continue;
    if (tag === state.player) continue;
    if (play.supporters.initiator.includes(tag) || play.supporters.target.includes(tag)) continue;

    // Subjects join their overlord's side.
    const overlord = overlordOf(state, tag);
    if (overlord !== null) {
      if (overlord === play.initiator) addSupporter(play, 'initiator', tag);
      else if (overlord === play.target) addSupporter(play, 'target', tag);
      continue;
    }

    // Overlords join the side opposing anyone attacking their subject.
    let joined = false;
    for (const [subject, subjectOverlord] of Object.entries(state.diplomacy.subjects)) {
      if (subjectOverlord !== tag) continue;
      if (subject === play.initiator) { addSupporter(play, 'target', tag); joined = true; break; }
      if (subject === play.target) { addSupporter(play, 'initiator', tag); joined = true; break; }
    }
    if (joined) continue;

    // Allies of exactly one leader join that leader.
    const withInitiator = allied(state, tag, play.initiator);
    const withTarget = allied(state, tag, play.target);
    if (withInitiator !== withTarget) {
      addSupporter(play, withInitiator ? 'initiator' : 'target', tag);
      continue;
    }

    // A great power that rivals one leader and likes the other joins the other.
    if (!isGreatPower(state, tag)) continue;
    const rivalsInitiator = state.diplomacy.countries[tag]?.rivals.includes(play.initiator) ?? false;
    const rivalsTarget = state.diplomacy.countries[tag]?.rivals.includes(play.target) ?? false;
    if (rivalsInitiator && !rivalsTarget && relations(state, tag, play.target) >= GREAT_POWER_JOIN_RELATIONS) {
      addSupporter(play, 'target', tag);
    } else if (rivalsTarget && !rivalsInitiator && relations(state, tag, play.initiator) >= GREAT_POWER_JOIN_RELATIONS) {
      addSupporter(play, 'initiator', tag);
    }
  }
}

/** Sets a truce between two countries. Mutates `diplomacy`. */
function setTruce(diplomacy: DiplomacyState, a: string, b: string): void {
  diplomacy.truces[pairKey(a, b)] = TRUCE_WEEKS;
}

/** Adds to a country's prestige bonus (creating the entry when missing). Mutates `diplomacy`. */
function addPrestigeBonus(diplomacy: DiplomacyState, tag: string, amount: number): void {
  const country = diplomacy.countries[tag];
  if (!country) return;
  country.prestigeBonus = fin(country.prestigeBonus) + amount;
}

/** Removes a play from the list. Mutates `diplomacy`. */
function removePlay(diplomacy: DiplomacyState, playId: number): void {
  diplomacy.plays = diplomacy.plays.filter((p) => p.id !== playId);
}

/** Mobilises every participant of a new war. Mutates `military`. */
function mobilizeAll(military: MilitaryState, tags: readonly string[]): void {
  for (const tag of tags) {
    const army = military.armies[tag];
    if (army) army.mobilized = true;
  }
}

/**
 * Resolves a play whose countdown reached 0: the target backs down, the initiator backs down,
 * or war breaks out. Returns the new state.
 */
function resolvePlay(state: GameState, play: DiplomaticPlay): GameState {
  const initiatorStrength = playSideStrength(state, play, 'initiator');
  const targetStrength = playSideStrength(state, play, 'target');
  const initiatorIsAi = play.initiator !== state.player;
  const targetIsAi = play.target !== state.player;

  if (targetIsAi && targetStrength < BACK_DOWN_RATIO * initiatorStrength) {
    // The target backs down: the goals are enforced at once.
    const diplomacy: DiplomacyState = structuredClone(state.diplomacy);
    removePlay(diplomacy, play.id);
    setTruce(diplomacy, play.initiator, play.target);
    addPrestigeBonus(diplomacy, play.initiator, PRESTIGE_WAR_WIN / 2);
    const next: GameState = { ...state, diplomacy };
    return enforceGoals(next, play.goals, play.initiator, play.target);
  }

  if (initiatorIsAi && initiatorStrength < INITIATOR_BACK_DOWN_RATIO * targetStrength) {
    // The initiator backs down: no goals, a truce and a prestige loss.
    const diplomacy: DiplomacyState = structuredClone(state.diplomacy);
    removePlay(diplomacy, play.id);
    setTruce(diplomacy, play.initiator, play.target);
    addPrestigeBonus(diplomacy, play.initiator, -10);
    return { ...state, diplomacy };
  }

  // War.
  const diplomacy: DiplomacyState = structuredClone(state.diplomacy);
  removePlay(diplomacy, play.id);
  const military: MilitaryState = structuredClone(state.military);
  mobilizeAll(military, [...sideMembers(play, 'initiator'), ...sideMembers(play, 'target')]);
  return startWar({ ...state, diplomacy, military }, play);
}

/** Step 2: counts down every play and resolves the ones that reach 0. */
function countdown(state: GameState): GameState {
  let current = state;
  for (const play of [...state.diplomacy.plays].sort((a, b) => a.id - b.id)) {
    const live = current.diplomacy.plays.find((p) => p.id === play.id);
    if (!live) continue;
    if (live.weeksLeft > 1) {
      const diplomacy: DiplomacyState = structuredClone(current.diplomacy);
      const target = diplomacy.plays.find((p) => p.id === play.id);
      if (target) target.weeksLeft = live.weeksLeft - 1;
      current = { ...current, diplomacy };
      continue;
    }
    current = resolvePlay(current, live);
  }
  return current;
}

/** Weekly play step: joining, countdown and resolution. Pure. */
export function playStep(state: GameState): GameState {
  if (state.diplomacy.plays.length === 0) return state;
  const diplomacy: DiplomacyState = structuredClone(state.diplomacy);
  for (const play of diplomacy.plays) joinStep(state, play);
  return countdown({ ...state, diplomacy });
}

/** The AI's preferred goal against `target`: the most populous adjacent state. */
function aiGoal(state: GameState, tag: string, target: string): WarGoal | null {
  const adjacent = adjacentStates(state, target, tag);
  if (adjacent.length === 0) return null;
  let best: string | null = null;
  let bestPop = -1;
  for (const stateId of adjacent) {
    const pop = statePopulation(state, stateId);
    if (pop > bestPop || (pop === bestPop && best !== null && stateId < best)) {
      best = stateId;
      bestPop = pop;
    }
  }
  if (best === null) return null;
  return { kind: 'conquer_state', holder: tag, target, stateId: best };
}

/** True if `tag` is decentralised land (owns states but has no economy of its own). */
function isDecentralised(state: GameState, tag: string): boolean {
  return state.economy.countries[tag] === undefined;
}

/** True if `tag` is already in a play or a war. */
function busy(state: GameState, tag: string): boolean {
  return playOf(state, tag) !== null || inWar(state, tag);
}

/** AI plays: countries not in a play or war may start one against a weak neighbour. Pure. */
export function aiPlays(state: GameState): GameState {
  let current = state;
  for (const tag of existingTags(state)) {
    if (tag === current.player) continue;
    if ((current.tickCount + tagParity(tag)) % AI_PLAY_INTERVAL !== 0) continue;
    if (rng(`${tag}${current.tickCount}`) >= AI_PLAY_CHANCE) continue;
    if (busy(current, tag)) continue;
    if (overlordOf(current, tag) !== null) continue;

    const own = ownSideStrength(current, tag);
    let best: string | null = null;
    let bestScore = 0;
    for (const target of existingTags(current)) {
      if (target === tag) continue;
      if (!canStartPlay(current, tag, target)) continue;
      if (isDecentralised(current, target)) continue;
      if (busy(current, target)) continue;
      const opposing = opposingSideStrength(current, target);
      if (!(opposing * AI_PLAY_STRENGTH_RATIO < own)) continue;
      const hostile = rivals(current, tag, target) || relations(current, tag, target) < AI_PLAY_HOSTILE_RELATIONS;
      const score = (hostile ? 1 : 0) * 1e9 + (own - opposing);
      if (best === null || score > bestScore || (score === bestScore && target < best)) {
        best = target;
        bestScore = score;
      }
    }
    if (best === null) continue;
    const goal = aiGoal(current, tag, best);
    if (goal === null) continue;

    const diplomacy: DiplomacyState = structuredClone(current.diplomacy);
    const play: DiplomaticPlay = {
      id: diplomacy.nextPlayId,
      initiator: tag,
      target: best,
      goals: [goal],
      supporters: { initiator: [], target: [] },
      weeksLeft: PLAY_WEEKS,
      startedTick: current.tickCount,
    };
    diplomacy.nextPlayId += 1;
    diplomacy.plays = [...diplomacy.plays, play];
    current = { ...current, diplomacy };
  }
  return current;
}
