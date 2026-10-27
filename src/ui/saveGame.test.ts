import { describe, expect, it } from 'vitest';
import statesJson from '../data/states.json';
import countriesJson from '../data/countries.json';
import { withStartEconomy } from '../sim/economy/start';
import { initDiplomacy } from '../sim/diplomacy/init';
import { initPolitics } from '../sim/politics/init';
import { createGameState } from '../sim/state';
import type { CountryDef, GameState, StateDef } from '../sim/types';
import { initMilitary } from '../sim/war/init';
import { parseGameSave, saveFileName, SaveGameError, serializeGameSave } from './saveGame';

const states: StateDef[] = [
  { id: 'GBR_01', name: 'London', owner: 'GBR', adm0: 'United Kingdom', area: 10, centroid: [0, 51] },
];
const countries: Record<string, CountryDef> = {
  GBR: { tag: 'GBR', name: 'United Kingdom', color: '#aa0000', capital: 'GBR_01' },
};

function game() {
  return createGameState(states, countries, 'GBR');
}

describe('save games', () => {
  it('round-trips a game state through the versioned envelope', () => {
    const current = game();
    const source = serializeGameSave(current, '2026-10-28T00:00:00.000Z');
    expect(parseGameSave(source, current)).toEqual(current);
  });

  it('round-trips the complete 1836 starting world', () => {
    const current = initMilitary(
      initDiplomacy(
        initPolitics(
          withStartEconomy(
            createGameState(
              statesJson as StateDef[],
              countriesJson as Record<string, CountryDef>,
              'GBR',
            ),
          ),
        ),
      ),
    );
    const restored: GameState = parseGameSave(serializeGameSave(current), current);
    expect(restored).toEqual(current);
  });

  it('rejects invalid JSON and unsupported versions', () => {
    const current = game();
    expect(() => parseGameSave('{', current)).toThrow(SaveGameError);
    const unsupported = JSON.stringify({
      format: 'grand-strategy-1836',
      version: 99,
      savedAt: '2026-10-28T00:00:00.000Z',
      game: current,
    });
    expect(() => parseGameSave(unsupported, current)).toThrow('save version');
  });

  it('rejects saves made with a different map data set', () => {
    const current = game();
    const changed = { ...current, states: {} };
    expect(() => parseGameSave(serializeGameSave(changed), current)).toThrow('different map');
  });

  it('uses the player and in-game date in the filename', () => {
    expect(saveFileName(game())).toBe('1836-GBR-1836-01-01.json');
  });
});
