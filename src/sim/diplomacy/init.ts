// Seeds the 1836 diplomacy from static data. See docs/WAR.md, "Diplomacy", "Init".
// Pure: returns a new GameState and never mutates the input.

import {
  PRESTIGE_GDP_DIV, PRESTIGE_PER_BATTALION, PRESTIGE_PER_TECH, RELATIONS_MAX, RELATIONS_MIN,
} from '../../data/diplomacy/rules';
import { START_ALLIANCES, START_RIVALRIES, START_SUBJECTS } from '../../data/diplomacy/start1836';
import type { GameState } from '../types';
import { addAlliance, existingCountries, setRelations } from './internal';
import { updateInfluenceAndPrestige } from './steps';
import type { CountryDiplomacy, DiplomacyState } from './types';

/** Relations between allies. */
export const ALLY_RELATIONS = 60;
/** Relations between a subject and its overlord. */
export const SUBJECT_RELATIONS = 50;
/** Relations lost by a one-way rivalry. */
export const RIVAL_RELATIONS = -50;
/** Relations lost when both countries are each other's rival. */
export const MUTUAL_RIVAL_RELATIONS = -60;

/** Empty diplomacy for one country. */
function emptyCountry(): CountryDiplomacy {
  return { influence: 0, influenceUsed: 0, improving: [], rivals: [], prestige: 0, prestigeBonus: 0 };
}

/** Builds the starting diplomacy of the existing countries. */
export function initDiplomacy(state: GameState): GameState {
  const tags = existingCountries(state);
  const exists = new Set(tags);

  const countries: Record<string, CountryDiplomacy> = {};
  for (const tag of tags) countries[tag] = emptyCountry();

  const diplomacy: DiplomacyState = {
    relations: {},
    alliances: [],
    subjects: {},
    truces: {},
    countries,
    plays: [],
    ranking: [],
    nextPlayId: 1,
  };

  // Alliances (both directions).
  for (const [a, b] of START_ALLIANCES) {
    if (!exists.has(a) || !exists.has(b) || a === b) continue;
    addAlliance(diplomacy, a, b);
  }

  // Subjects: only when both countries exist; a subject of a subject answers to the top overlord.
  for (const [subject, overlord] of Object.entries(START_SUBJECTS)) {
    if (!exists.has(subject) || !exists.has(overlord) || subject === overlord) continue;
    diplomacy.subjects[subject] = overlord;
  }

  // Rivalries (one-way entries; mutual pairs are listed both ways in the data).
  for (const [tag, target] of START_RIVALRIES) {
    if (!exists.has(tag) || !exists.has(target) || tag === target) continue;
    const country = diplomacy.countries[tag];
    if (!country) continue;
    if (!country.rivals.includes(target)) country.rivals = [...country.rivals, target].sort();
  }

  // Relations: allies, then subject–overlord, then rivalries (mutual ones are stronger).
  for (const key of diplomacy.alliances) {
    const [a, b] = key.split('|');
    if (a === undefined || b === undefined) continue;
    setRelations(diplomacy.relations, a, b, ALLY_RELATIONS, RELATIONS_MIN, RELATIONS_MAX);
  }
  for (const [subject, overlord] of Object.entries(diplomacy.subjects)) {
    setRelations(diplomacy.relations, subject, overlord, SUBJECT_RELATIONS, RELATIONS_MIN, RELATIONS_MAX);
  }
  for (const tag of tags) {
    for (const target of diplomacy.countries[tag]?.rivals ?? []) {
      const mutual = (diplomacy.countries[target]?.rivals ?? []).includes(tag);
      const value = mutual ? MUTUAL_RIVAL_RELATIONS : RIVAL_RELATIONS;
      setRelations(diplomacy.relations, tag, target, value, RELATIONS_MIN, RELATIONS_MAX);
    }
  }

  // A rival cannot be an ally.
  diplomacy.alliances = diplomacy.alliances.filter((key) => {
    const [a, b] = key.split('|');
    if (a === undefined || b === undefined) return false;
    const rival = (diplomacy.countries[a]?.rivals ?? []).includes(b)
      || (diplomacy.countries[b]?.rivals ?? []).includes(a);
    return !rival;
  });

  // Steps 3–4 once, so influence, prestige and the ranking are ready on day one.
  updateInfluenceAndPrestige(state, diplomacy, PRESTIGE_GDP_DIV, PRESTIGE_PER_BATTALION, PRESTIGE_PER_TECH);

  return { ...state, diplomacy };
}
