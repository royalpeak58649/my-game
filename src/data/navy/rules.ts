// Tunable constants for navies, convoys and naval invasions. See docs/NAVY.md.
//
// Convoys follow the pre-"Great Wave" model: ports produce an abstract pool of convoys; overseas
// states, sea trade and overseas armies consume it; enemy fleets raid it.

// --- fleets
/** Sailors per flotilla (one naval base level). */
export const FLOTILLA_SIZE = 500;
/** Flotillas per admiral; at most MAX_ADMIRALS. */
export const FLOTILLAS_PER_ADMIRAL = 20;
export const MAX_ADMIRALS = 4;
/** Strength bonus per admiral skill point. */
export const ADMIRAL_SKILL_BONUS = 0.08;
/** Fleet quality never drops below this, however short of supplies the naval bases are. */
export const MIN_NAVY_QUALITY = 0.4;

// --- convoys
/** Convoys per fully staffed port level. */
export const CONVOYS_PER_PORT = 20;
/** Overseas state (not land-connected to the capital): base convoys + per 1,000 km from the capital. */
export const OVERSEAS_BASE = 0.5;
export const OVERSEAS_PER_1000KM = 0.25;
/** Value of sea trade (imports + exports, at local prices) carried per convoy per week. */
export const TRADE_VALUE_PER_CONVOY = 2500;
/** Trade access with no convoys at all, as a share of normal (coastal countries only). */
export const TRADE_FLOOR = 0.3;
/** Strength of an army fighting overseas with no convoys at all, as a share of normal. */
export const OVERSEAS_SUPPLY_FLOOR = 0.4;
/** Share of destroyed convoys replaced per week. */
export const CONVOY_REPAIR = 0.05;

// --- raiding
/** Convoys a raiding flotilla sinks per week against no escorts. */
export const RAID_PER_FLOTILLA = 0.3;
/** Weight of escorting flotillas against raiders. */
export const ESCORT_WEIGHT = 2;
/** Share of raiding flotillas lost per week against a fully escorted enemy. */
export const RAIDER_LOSS = 0.01;

// --- naval battles and invasions
/** Share of committed flotillas lost by the loser / winner of a naval battle. */
export const NAVAL_LOSER_LOSSES = 0.15;
export const NAVAL_WINNER_LOSSES = 0.05;
/** Allies of the defending country commit this share of their home fleet. */
export const ALLY_NAVY_SHARE = 0.5;
/** Escort strength needed over the enemy's for the AI to try an invasion. */
export const AI_SUPERIORITY = 1.2;
/** Weeks at sea: 1 + path km / INVASION_KM_PER_WEEK. */
export const INVASION_KM_PER_WEEK = 3000;
/** Strength of troops landing from the sea. */
export const LANDING_PENALTY = 0.7;
/** Garrison of a coastal state: army × state's population share × GARRISON_SHARE (≤ 1/4 of the army). */
export const GARRISON_SHARE = 1.5;
export const MIN_GARRISON = 2;
/** Share of the landing force lost when the landing fails / succeeds. */
export const LANDING_FAIL_LOSSES = 0.2;
export const LANDING_WIN_LOSSES = 0.05;
/** Share of the landing force lost when its escort loses the naval battle. */
export const SUNK_TRANSPORT_LOSSES = 0.25;
/** AI: flotillas needed before planning invasions; share of the army it sends. */
export const AI_MIN_FLOTILLAS = 3;
export const AI_INVASION_SHARE = 0.35;
/** AI considers invasions every N weeks. */
export const AI_INVASION_INTERVAL = 4;

/** Flotillas in 1836 (≈ ships of the line and frigates in tens). Unlisted coastal countries get 1. */
export const START_NAVIES: Record<string, number> = {
  GBR: 70, FRA: 35, RUS: 25, USA: 15, OTT: 14, NET: 12, SPA: 10, EGY: 8, SWE: 8, DEN: 7,
  AUS: 6, POR: 6, QNG: 6, EIC: 6, SAR: 5, SIC: 5, BRZ: 5, NOR: 3, MEX: 2, JAP: 2, GRE: 2,
  PRU: 2, CHL: 2, ARG: 2, TUN: 1, MOR: 1,
};
