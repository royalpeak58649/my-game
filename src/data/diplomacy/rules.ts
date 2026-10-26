// Tunable constants for diplomacy and war. See docs/WAR.md.

export const GREAT_POWER_COUNT = 8;

// --- relations
export const RELATIONS_MIN = -100;
export const RELATIONS_MAX = 100;
/** Weekly gain while improving relations. */
export const IMPROVE_PER_WEEK = 2;
/** Weekly drift towards the baseline (0, or −30 for rivals, +30 for allies and subjects). */
export const RELATION_DRIFT = 0.5;
export const ALLY_BASELINE = 30;
export const RIVAL_BASELINE = -30;
export const ALLIANCE_MIN_RELATIONS = 40;

// --- influence
export const INFLUENCE_BASE = 3;
/** Extra influence per 10 million inhabitants. */
export const INFLUENCE_PER_10M = 1;
export const GREAT_POWER_INFLUENCE = 3;

// --- prestige: GDP/PRESTIGE_GDP_DIV + battalions × PRESTIGE_PER_BATTALION + techs × PRESTIGE_PER_TECH
export const PRESTIGE_GDP_DIV = 2000;
export const PRESTIGE_PER_BATTALION = 0.2;
export const PRESTIGE_PER_TECH = 3;
/** Prestige bonus for a won war (decays 1%/week via the weekly recompute baseline). */
export const PRESTIGE_WAR_WIN = 25;

// --- plays
export const PLAY_WEEKS = 8;
/** At resolution the target backs down if its side's strength < this × the initiator side's. */
export const BACK_DOWN_RATIO = 0.5;
/** AI considers starting a play every N weeks. */
export const AI_PLAY_INTERVAL = 26;
/** AI only targets a neighbour it outguns by this ratio. */
export const AI_PLAY_STRENGTH_RATIO = 2.5;
export const TRUCE_WEEKS = 260;

// --- armies
export const BATTALION_SIZE = 1000;
export const MOBILIZATION_MULT = 2;
/** Upkeep of mobilised battalions (conscript pay, supplies) per battalion per week, from the treasury. */
export const MOBILIZED_UPKEEP = 45;

// --- battles
/** Defender bonus on own (or allied) soil. */
export const DEFENDER_BONUS = 1.25;
/** Strength bonus per general skill point. */
export const GENERAL_SKILL_BONUS = 0.08;
/** Share of committed battalions lost by the loser / winner of a battle. */
export const LOSER_CASUALTIES = 0.06;
export const WINNER_CASUALTIES = 0.03;

// --- exhaustion and peace
/** Weekly exhaustion for every side at war. */
export const EXHAUSTION_BASE = 0.25;
/** Exhaustion per 1% of own battalions lost. */
export const EXHAUSTION_PER_LOSS = 0.4;
/** Weekly exhaustion per 1% of own population under occupation. */
export const EXHAUSTION_PER_OCCUPIED = 0.05;
/** A side at this exhaustion capitulates; if both do, white peace. */
export const CAPITULATION_EXHAUSTION = 100;
/** Wars end in white peace after this many weeks. */
export const MAX_WAR_WEEKS = 520;
