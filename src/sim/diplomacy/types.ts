// Diplomacy and war types. GameState.diplomacy holds relations, pacts and plays;
// GameState.military holds armies and wars. See docs/WAR.md.

/** Pair key: the two tags sorted and joined with '|' (e.g. "FRA|GBR"). */
export type PairKey = string;

export type WarGoalKind = 'conquer_state' | 'make_subject' | 'humiliate';

export interface WarGoal {
  kind: WarGoalKind;
  /** Country that receives the goal when it is enforced (the initiator or a supporter). */
  holder: string;
  /** Country that must give it up. */
  target: string;
  /** conquer_state only. */
  stateId?: string;
}

export type PlaySide = 'initiator' | 'target';

export interface DiplomaticPlay {
  id: number;
  initiator: string;
  target: string;
  goals: WarGoal[];
  /** Countries backing each side (leaders not included). */
  supporters: Record<PlaySide, string[]>;
  /** Weeks until the play resolves (backs down or war). */
  weeksLeft: number;
  startedTick: number;
}

export interface CountryDiplomacy {
  /** Diplomatic capacity; every alliance and relation improvement uses 1. */
  influence: number;
  influenceUsed: number;
  /** Countries this country is actively improving relations with. */
  improving: string[];
  rivals: string[];
  /** Weekly computed: GDP, army and technology plus prestigeBonus. */
  prestige: number;
  /** From wars won / humiliations; decays 1% per week. */
  prestigeBonus: number;
}

export interface DiplomacyState {
  /** −100..100, keyed by PairKey; missing = 0. */
  relations: Record<PairKey, number>;
  alliances: PairKey[];
  /** subject tag -> overlord tag */
  subjects: Record<string, string>;
  /** Weeks left of a truce between two countries after a war, keyed by PairKey. */
  truces: Record<PairKey, number>;
  countries: Record<string, CountryDiplomacy>;
  plays: DiplomaticPlay[];
  /** Tags by prestige, highest first; the first GREAT_POWER_COUNT are great powers. */
  ranking: string[];
  nextPlayId: number;
}

// ------------------------------------------------------------------ military

export type GeneralTrait = 'offensive' | 'defensive' | 'balanced';

export interface General {
  id: string;
  name: string;
  /** 1..5 */
  skill: number;
  trait: GeneralTrait;
}

export interface Army {
  /** Battalions from staffed barracks (1 per BATTALION_SIZE soldiers employed). Weekly computed. */
  battalions: number;
  mobilized: boolean;
  /** 0..1, share of battalions at full equipment (small arms supplied). Weekly computed. */
  equipment: number;
  generals: General[];
}

export type WarSide = 'attackers' | 'defenders';

export interface Front {
  /** `${attackerTag}|${defenderTag}` — one front per bordering pair of opposing countries. */
  id: string;
  attacker: string;
  defender: string;
  /** Battalions committed this week by each side. */
  attackerBattalions: number;
  defenderBattalions: number;
  attackerGeneral: string | null;
  defenderGeneral: string | null;
}

export interface Battle {
  tick: number;
  front: string;
  /** Which side attacked and whether it won. */
  attackingSide: WarSide;
  won: boolean;
  /** State that changed hands, if any. */
  stateId: string | null;
  attackerLosses: number;
  defenderLosses: number;
}

export interface War {
  id: number;
  name: string;
  attackers: string[];
  defenders: string[];
  /** Leaders: index 0 of each side. */
  goals: WarGoal[];
  /** stateId -> occupying tag */
  occupation: Record<string, string>;
  /** 0..100 per side */
  exhaustion: Record<WarSide, number>;
  /** −100..100; positive favours the attackers. Weekly computed from occupation and battles. */
  warScore: number;
  fronts: Front[];
  /** Most recent battles, newest first (at most 12). */
  battles: Battle[];
  startedTick: number;
}

export interface MilitaryState {
  armies: Record<string, Army>;
  wars: War[];
  nextWarId: number;
}
