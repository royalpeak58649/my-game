import { beforeAll, describe, expect, it } from 'vitest';
import countriesJson from '../../data/countries.json';
import statesJson from '../../data/states.json';
import { IG_IDS } from '../../data/politics/igs';
import { withStartEconomy } from '../economy/start';
import { createGameState } from '../state';
import type { CountryDef, GameState, StateDef } from '../types';
import { initPolitics } from './init';
import { availableTechs } from './queries';
import { politicsTick } from './tick';
import type { CountryPolitics } from './types';

const base = (): GameState =>
  initPolitics(
    withStartEconomy(
      createGameState(
        statesJson as StateDef[],
        countriesJson as Record<string, CountryDef>,
        'GBR',
      ),
    ),
  );

/** Every number reachable from `value`, with the path that leads to it. */
function numbersIn(value: unknown, path = 'root'): { path: string; value: number }[] {
  if (typeof value === 'number') return [{ path, value }];
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => numbersIn(item, `${path}[${i}]`));
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      numbersIn(child, `${path}.${key}`),
    );
  }
  return [];
}

function runTicks(state: GameState, weeks: number): GameState {
  let current = state;
  for (let i = 0; i < weeks; i++) current = politicsTick(current);
  return current;
}

describe('politics — initialisation and weekly tick', () => {
  let state: GameState;

  beforeAll(() => {
    state = base();
  });

  it('has politics for every country in the economy', () => {
    const tags = Object.keys(state.economy.countries);
    expect(tags.length).toBeGreaterThan(0);
    for (const tag of tags) {
      expect(state.politics.countries[tag], tag).toBeDefined();
    }
  });

  it('gives every country clout shares that sum to 1 and lie in [0, 1]', () => {
    for (const [tag, country] of Object.entries(state.politics.countries)) {
      let sum = 0;
      for (const ig of IG_IDS) {
        const clout = country.igs[ig].clout;
        expect(Number.isFinite(clout), `${tag}.${ig}`).toBe(true);
        expect(clout, `${tag}.${ig}`).toBeGreaterThanOrEqual(0);
        expect(clout, `${tag}.${ig}`).toBeLessThanOrEqual(1);
        sum += clout;
      }
      expect(sum, tag).toBeCloseTo(1, 6);
    }
  });

  it('starts GBR with its 1836 laws', () => {
    const gbr = state.politics.countries.GBR;
    expect(gbr).toBeDefined();
    expect(gbr?.laws.governance).toBe('constitutional_monarchy');
    expect(gbr?.laws.press).toBe('free_press');
    expect(gbr?.laws.taxation).toBe('proportional_tax');
  });

  it('starts RUS with serfdom', () => {
    expect(state.politics.countries.RUS?.laws.labor).toBe('serfdom');
  });

  it('keeps legitimacy within 0..100', () => {
    for (const [tag, country] of Object.entries(state.politics.countries)) {
      expect(Number.isFinite(country.legitimacy), tag).toBe(true);
      expect(country.legitimacy, tag).toBeGreaterThanOrEqual(0);
      expect(country.legitimacy, tag).toBeLessThanOrEqual(100);
    }
  });

  it('gives every non-player country a majority government or three IGs', () => {
    for (const [tag, country] of Object.entries(state.politics.countries)) {
      if (tag === state.player) continue;
      const clout = country.government.reduce((sum, ig) => sum + country.igs[ig].clout, 0);
      const ok = clout >= 0.5 || country.government.length === 3;
      expect(ok, `${tag}: clout ${clout}, ${country.government.length} IGs`).toBe(true);
    }
  });

  it('gives every non-player country a research target or no available tech', () => {
    for (const [tag, country] of Object.entries(state.politics.countries)) {
      if (tag === state.player) continue;
      const hasAvailable = availableTechs(state, tag).some((option) => option.available);
      const ok = country.researching !== null || !hasAvailable;
      expect(ok, tag).toBe(true);
    }
  });

  it('stays finite and bounded after 52 weeks', () => {
    const after = runTicks(state, 52);

    for (const [tag, country] of Object.entries(after.politics.countries)) {
      for (const { path, value } of numbersIn(country, tag)) {
        expect(Number.isNaN(value), path).toBe(false);
        expect(Number.isFinite(value), path).toBe(true);
      }
      for (const ig of IG_IDS) {
        const approval = country.igs[ig].approval;
        expect(approval, `${tag}.${ig}`).toBeGreaterThanOrEqual(-10);
        expect(approval, `${tag}.${ig}`).toBeLessThanOrEqual(10);
      }
      for (const movement of country.movements) {
        expect(movement.radicalism, `${tag}.${movement.ig}`).toBeGreaterThanOrEqual(0);
        expect(movement.radicalism, `${tag}.${movement.ig}`).toBeLessThanOrEqual(100);
      }
    }
  });

  it('is deterministic across independent runs', () => {
    const a = runTicks(base(), 10);
    const b = runTicks(base(), 10);
    expect(a.politics).toEqual(b.politics);
  });

  it('survives a JSON round trip unchanged', () => {
    const after = runTicks(state, 10);
    const roundTripped = JSON.parse(JSON.stringify(after.politics)) as Record<
      string,
      CountryPolitics
    >;
    expect(roundTripped).toEqual(after.politics);
  });
});
