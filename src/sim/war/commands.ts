// Player commands for plays and wars — see docs/WAR.md, "Commands".
//
// Pure: an invalid command returns the very same GameState object. A valid one copies only the
// diplomacy and military containers (and the economy when a state changes hands).

import {
  CAPITULATION_EXHAUSTION, PLAY_WEEKS, PRESTIGE_WAR_WIN, TRUCE_WEEKS,
} from '../../data/diplomacy/rules';
import { pairKey } from '../diplomacy/pair';
import type {
  DiplomaticPlay, DiplomacyState, MilitaryState, PlaySide, War, WarGoal,
} from '../diplomacy/types';
import type { GameState } from '../types';
import {
  MAX_PLAY_GOALS, canStartPlay, goalAllowed, possibleWarGoals,
} from './plays';
import { enforceGoals } from './wars';

function fin(x: number | undefined, fallback = 0): number {
  return x !== undefined && Number.isFinite(x) ? x : fallback;
}

/** Adds to a country's prestige bonus (creating the entry when missing). Mutates `diplomacy`. */
function addPrestigeBonus(diplomacy: DiplomacyState, tag: string, amount: number): void {
  const country = diplomacy.countries[tag];
  if (!country) return;
  country.prestigeBonus = fin(country.prestigeBonus) + amount;
}

/** Sets a truce between two countries. Mutates `diplomacy`. */
function setTruce(diplomacy: DiplomacyState, a: string, b: string): void {
  diplomacy.truces[pairKey(a, b)] = TRUCE_WEEKS;
}

/** Removes a play. Mutates `diplomacy`. */
function removePlay(diplomacy: DiplomacyState, playId: number): void {
  diplomacy.plays = diplomacy.plays.filter((p) => p.id !== playId);
}

/** The war `warId`, or undefined. */
function warOf(state: GameState, warId: number): War | undefined {
  return state.military.wars.find((w) => w.id === warId);
}

/** True if `tag` leads one of the war's sides. */
function isLeader(war: War, tag: string): boolean {
  return war.attackers[0] === tag || war.defenders[0] === tag;
}

/** True if `tag` takes part in the war. */
function inWar(war: War, tag: string): boolean {
  return war.attackers.includes(tag) || war.defenders.includes(tag);
}

/** True if `tag` is at war with anyone. */
function atWarWithAnyone(state: GameState, tag: string): boolean {
  return state.military.wars.some((w) => inWar(w, tag));
}

/** Demobilises AI participants that are no longer at war. Mutates `military`. */
function demobiliseIdle(state: GameState, military: MilitaryState, tags: readonly string[]): void {
  for (const tag of tags) {
    if (tag === state.player) continue;
    if (atWarWithAnyone({ ...state, military }, tag)) continue;
    const army = military.armies[tag];
    if (army) army.mobilized = false;
  }
}

/** Removes a war and clears its occupation. Mutates `military`. */
function removeWar(military: MilitaryState, warId: number): void {
  military.wars = military.wars.filter((w) => w.id !== warId);
}

/** Sets truces for every attacker–defender pair of a war. Mutates `diplomacy`. */
function truceAll(diplomacy: DiplomacyState, war: War): void {
  for (const attacker of war.attackers) {
    for (const defender of war.defenders) setTruce(diplomacy, attacker, defender);
  }
}

/**
 * Starts a diplomatic play of `tag` against `target` with 1–3 goals from
 * `possibleWarGoals(state, tag, target)`. Returns the same state when invalid.
 */
export function startPlay(
  state: GameState,
  tag: string,
  target: string,
  goals: readonly WarGoal[],
): GameState {
  if (!canStartPlay(state, tag, target)) return state;
  if (goals.length < 1 || goals.length > MAX_PLAY_GOALS) return state;
  const allowed = possibleWarGoals(state, tag, target);
  for (const goal of goals) {
    if (goal.holder !== tag || goal.target !== target) return state;
    if (!goalAllowed(goal, allowed)) return state;
  }

  const diplomacy: DiplomacyState = structuredClone(state.diplomacy);
  const play: DiplomaticPlay = {
    id: diplomacy.nextPlayId,
    initiator: tag,
    target,
    goals: goals.map((g) => ({ ...g })),
    supporters: { initiator: [], target: [] },
    weeksLeft: PLAY_WEEKS,
    startedTick: state.tickCount,
  };
  diplomacy.nextPlayId += 1;
  diplomacy.plays = [...diplomacy.plays, play];
  return { ...state, diplomacy };
}

/**
 * The leader of one side of a play backs down: the other side's goals are enforced at once,
 * a truce is signed and the initiator gains half a war win of prestige (or loses 10 when the
 * initiator itself backs down). Returns the same state when invalid.
 */
export function backDown(state: GameState, tag: string, playId: number): GameState {
  const play = state.diplomacy.plays.find((p) => p.id === playId);
  if (!play) return state;
  if (play.initiator !== tag && play.target !== tag) return state;

  const diplomacy: DiplomacyState = structuredClone(state.diplomacy);
  removePlay(diplomacy, playId);
  setTruce(diplomacy, play.initiator, play.target);

  if (tag === play.initiator) {
    addPrestigeBonus(diplomacy, play.initiator, -10);
    return { ...state, diplomacy };
  }

  addPrestigeBonus(diplomacy, play.initiator, PRESTIGE_WAR_WIN / 2);
  return enforceGoals({ ...state, diplomacy }, play.goals, play.initiator, play.target);
}

/**
 * Adds `tag` to one side of a play. Valid when the play exists, `tag` is not a leader and not
 * already on a side, and `tag` is not in another play or war. Returns the same state when invalid.
 */
export function joinPlay(state: GameState, tag: string, playId: number, side: PlaySide): GameState {
  const play = state.diplomacy.plays.find((p) => p.id === playId);
  if (!play) return state;
  if (tag === play.initiator || tag === play.target) return state;
  if (play.supporters.initiator.includes(tag) || play.supporters.target.includes(tag)) return state;
  if (state.economy.countries[tag] === undefined) return state;
  for (const other of state.diplomacy.plays) {
    if (other.id === playId) continue;
    if (other.initiator === tag || other.target === tag) return state;
    if (other.supporters.initiator.includes(tag) || other.supporters.target.includes(tag)) return state;
  }
  if (atWarWithAnyone(state, tag)) return state;

  const diplomacy: DiplomacyState = structuredClone(state.diplomacy);
  const target = diplomacy.plays.find((p) => p.id === playId);
  if (!target) return state;
  target.supporters[side] = [...target.supporters[side], tag];
  return { ...state, diplomacy };
}

/** Mobilises or demobilises the army of `tag`. Returns the same state when invalid. */
export function setMobilized(state: GameState, tag: string, on: boolean): GameState {
  const army = state.military.armies[tag];
  if (!army) return state;
  if (army.mobilized === on) return state;
  const military: MilitaryState = structuredClone(state.military);
  const next = military.armies[tag];
  if (!next) return state;
  next.mobilized = on;
  return { ...state, military };
}

/**
 * The leader of one side of a war capitulates: the other side's goals are enforced, the winner
 * gains a war win of prestige, occupation is cleared, truces are signed and idle AI participants
 * demobilise. Returns the same state when invalid.
 */
export function capitulate(state: GameState, tag: string, warId: number): GameState {
  const war = warOf(state, warId);
  if (!war) return state;
  if (!isLeader(war, tag)) return state;

  const winnerSide = war.attackers[0] === tag ? 'defenders' : 'attackers';
  const winner = winnerSide === 'attackers' ? war.attackers[0] : war.defenders[0];
  const loser = tag;
  if (winner === undefined) return state;

  const diplomacy: DiplomacyState = structuredClone(state.diplomacy);
  const military: MilitaryState = structuredClone(state.military);
  removeWar(military, warId);
  truceAll(diplomacy, war);
  addPrestigeBonus(diplomacy, winner, PRESTIGE_WAR_WIN);
  demobiliseIdle(state, military, [...war.attackers, ...war.defenders]);

  const goals = winnerSide === 'attackers' ? war.goals : [];
  return enforceGoals({ ...state, diplomacy, military }, goals, winner, loser);
}

/**
 * Offers a white peace in a war. Accepted when `tag` leads a side and the opposing leader is an
 * AI whose exhaustion is at least 50 or whose war score is not in its favour. Ends the war with
 * no goals, clears its occupation and signs truces. Returns the same state when invalid.
 */
export function offerWhitePeace(state: GameState, tag: string, warId: number): GameState {
  const war = warOf(state, warId);
  if (!war) return state;
  if (!isLeader(war, tag)) return state;

  const tagIsAttacker = war.attackers[0] === tag;
  const opposingLeader = tagIsAttacker ? war.defenders[0] : war.attackers[0];
  if (opposingLeader === undefined) return state;
  if (opposingLeader === state.player) return state;

  const opposingExhaustion = fin(war.exhaustion[tagIsAttacker ? 'defenders' : 'attackers']);
  const opposingScore = tagIsAttacker ? -fin(war.warScore) : fin(war.warScore);
  if (opposingExhaustion < CAPITULATION_EXHAUSTION / 2 && opposingScore > 0) return state;

  const diplomacy: DiplomacyState = structuredClone(state.diplomacy);
  const military: MilitaryState = structuredClone(state.military);
  removeWar(military, warId);
  truceAll(diplomacy, war);
  demobiliseIdle(state, military, [...war.attackers, ...war.defenders]);
  return { ...state, diplomacy, military };
}
