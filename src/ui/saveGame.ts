import { daysInMonth } from '../sim/date';
import type { GameState } from '../sim/types';

export const SAVE_FORMAT = 'grand-strategy-1836';
export const SAVE_VERSION = 1;

interface SaveEnvelope {
  format: typeof SAVE_FORMAT;
  version: typeof SAVE_VERSION;
  savedAt: string;
  game: GameState;
}

type JsonRecord = Record<string, unknown>;

export class SaveGameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaveGameError';
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recordField(parent: JsonRecord, key: string): JsonRecord {
  const value = parent[key];
  if (!isRecord(value)) throw new SaveGameError(`Missing or invalid ${key}.`);
  return value;
}

function arrayField(parent: JsonRecord, key: string): unknown[] {
  const value = parent[key];
  if (!Array.isArray(value)) throw new SaveGameError(`Missing or invalid ${key}.`);
  return value;
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new SaveGameError(`Missing or invalid ${label}.`);
  }
  return value;
}

function nonNegativeInteger(value: unknown, label: string): number {
  const number = finiteNumber(value, label);
  if (!Number.isInteger(number) || number < 0) throw new SaveGameError(`Invalid ${label}.`);
  return number;
}

function stringField(parent: JsonRecord, key: string): string {
  const value = parent[key];
  if (typeof value !== 'string') throw new SaveGameError(`Missing or invalid ${key}.`);
  return value;
}

function sameKeys(actual: JsonRecord, expected: Record<string, unknown>): boolean {
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every((key, index) => key === expectedKeys[index])
  );
}

function requireSameKeys(actual: JsonRecord, expected: Record<string, unknown>, label: string): void {
  if (!sameKeys(actual, expected)) throw new SaveGameError(`This save uses different ${label}.`);
}

function validateJsonTree(value: unknown, path: string): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new SaveGameError(`Non-finite number at ${path}.`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => validateJsonTree(entry, `${path}[${index}]`));
    return;
  }
  if (isRecord(value)) {
    for (const [key, entry] of Object.entries(value)) validateJsonTree(entry, `${path}.${key}`);
    return;
  }
  throw new SaveGameError(`Unsupported value at ${path}.`);
}

function validateDate(game: JsonRecord): void {
  const date = recordField(game, 'date');
  const year = finiteNumber(date['year'], 'date.year');
  const month = finiteNumber(date['month'], 'date.month');
  const day = finiteNumber(date['day'], 'date.day');
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new SaveGameError('Invalid game date.');
  }
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new SaveGameError('Invalid game date.');
  }
}

function validateCountries(game: JsonRecord, expected: GameState): JsonRecord {
  const countries = recordField(game, 'countries');
  if (!sameKeys(countries, expected.countries)) {
    throw new SaveGameError('This save uses a different country data set.');
  }
  for (const [tag, raw] of Object.entries(countries)) {
    if (!isRecord(raw) || raw['tag'] !== tag) throw new SaveGameError(`Invalid country ${tag}.`);
    const expectedCountry = expected.countries[tag];
    if (
      !expectedCountry ||
      stringField(raw, 'name') !== expectedCountry.name ||
      stringField(raw, 'color') !== expectedCountry.color ||
      stringField(raw, 'capital') !== expectedCountry.capital
    ) {
      throw new SaveGameError(`Country data changed for ${tag}.`);
    }
  }
  return countries;
}

function validateStates(game: JsonRecord, expected: GameState, countries: JsonRecord): JsonRecord {
  const states = recordField(game, 'states');
  if (!sameKeys(states, expected.states)) {
    throw new SaveGameError('This save uses a different map data set.');
  }
  for (const [id, raw] of Object.entries(states)) {
    if (!isRecord(raw) || raw['id'] !== id) throw new SaveGameError(`Invalid state ${id}.`);
    const expectedState = expected.states[id];
    if (
      !expectedState ||
      stringField(raw, 'name') !== expectedState.name ||
      stringField(raw, 'adm0') !== expectedState.adm0
    ) {
      throw new SaveGameError(`State data changed for ${id}.`);
    }
    const owner = raw['owner'];
    if (owner !== null && (typeof owner !== 'string' || !(owner in countries))) {
      throw new SaveGameError(`Invalid owner for state ${id}.`);
    }
    const area = finiteNumber(raw['area'], `state ${id} area`);
    if (area < 0 || area !== expectedState.area) throw new SaveGameError(`Invalid area for state ${id}.`);
    const centroid = raw['centroid'];
    if (!Array.isArray(centroid) || centroid.length !== 2) {
      throw new SaveGameError(`Invalid centroid for state ${id}.`);
    }
    const longitude = finiteNumber(centroid[0], `state ${id} longitude`);
    const latitude = finiteNumber(centroid[1], `state ${id} latitude`);
    if (longitude !== expectedState.centroid[0] || latitude !== expectedState.centroid[1]) {
      throw new SaveGameError(`State coordinates changed for ${id}.`);
    }
  }
  for (const [tag, raw] of Object.entries(countries)) {
    const capital = (raw as JsonRecord)['capital'];
    if (typeof capital !== 'string' || !(capital in states)) {
      throw new SaveGameError(`Invalid capital for country ${tag}.`);
    }
  }
  return states;
}

function validateSystems(game: JsonRecord, expected: GameState): void {
  const economy = recordField(game, 'economy');
  requireSameKeys(recordField(economy, 'states'), expected.economy.states, 'economy state data');
  requireSameKeys(recordField(economy, 'markets'), expected.economy.markets, 'market data');
  requireSameKeys(recordField(economy, 'countries'), expected.economy.countries, 'economy country data');

  const politics = recordField(game, 'politics');
  requireSameKeys(recordField(politics, 'countries'), expected.politics.countries, 'politics data');

  const diplomacy = recordField(game, 'diplomacy');
  recordField(diplomacy, 'relations');
  arrayField(diplomacy, 'alliances');
  recordField(diplomacy, 'subjects');
  recordField(diplomacy, 'truces');
  requireSameKeys(recordField(diplomacy, 'countries'), expected.diplomacy.countries, 'diplomacy data');
  arrayField(diplomacy, 'plays');
  arrayField(diplomacy, 'ranking');
  nonNegativeInteger(diplomacy['nextPlayId'], 'diplomacy.nextPlayId');

  const military = recordField(game, 'military');
  requireSameKeys(recordField(military, 'armies'), expected.military.armies, 'army data');
  arrayField(military, 'wars');
  nonNegativeInteger(military['nextWarId'], 'military.nextWarId');
  requireSameKeys(recordField(military, 'navies'), expected.military.navies, 'navy data');
  arrayField(military, 'invasions');
  nonNegativeInteger(military['nextInvasionId'], 'military.nextInvasionId');
}

function validateGameState(value: unknown, expected: GameState): asserts value is GameState {
  if (!isRecord(value)) throw new SaveGameError('Missing game state.');
  validateJsonTree(value, 'game');
  validateDate(value);
  nonNegativeInteger(value['tickCount'], 'tickCount');
  nonNegativeInteger(value['ownershipVersion'], 'ownershipVersion');
  const countries = validateCountries(value, expected);
  validateStates(value, expected, countries);
  const player = value['player'];
  if (player !== null && (typeof player !== 'string' || !(player in countries))) {
    throw new SaveGameError('Invalid player country.');
  }
  validateSystems(value, expected);
}

export function serializeGameSave(game: GameState, savedAt = new Date().toISOString()): string {
  const envelope: SaveEnvelope = {
    format: SAVE_FORMAT,
    version: SAVE_VERSION,
    savedAt,
    game,
  };
  return JSON.stringify(envelope);
}

export function parseGameSave(source: string, expected: GameState): GameState {
  let decoded: unknown;
  try {
    decoded = JSON.parse(source) as unknown;
  } catch {
    throw new SaveGameError('The selected file is not valid JSON.');
  }
  if (!isRecord(decoded) || decoded['format'] !== SAVE_FORMAT) {
    throw new SaveGameError('The selected file is not an 1836 save.');
  }
  if (decoded['version'] !== SAVE_VERSION) {
    throw new SaveGameError('This save version is not supported.');
  }
  if (typeof decoded['savedAt'] !== 'string') throw new SaveGameError('Missing save timestamp.');
  const game = decoded['game'];
  validateGameState(game, expected);
  return game;
}

export function saveFileName(game: GameState): string {
  const month = String(game.date.month).padStart(2, '0');
  const day = String(game.date.day).padStart(2, '0');
  const country = game.player ?? 'observer';
  return `1836-${country}-${game.date.year}-${month}-${day}.json`;
}

export function downloadGameSave(game: GameState): void {
  const blob = new Blob([serializeGameSave(game)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = saveFileName(game);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
