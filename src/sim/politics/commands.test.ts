import { beforeAll, describe, expect, it } from 'vitest';
import countriesJson from '../../data/countries.json';
import statesJson from '../../data/states.json';
import { IG_IDS } from '../../data/politics/igs';
import { withStartEconomy } from '../economy/start';
import { createGameState } from '../state';
import type { CountryDef, GameState, StateDef } from '../types';
import {
  cancelEnactment, setGovernment, setResearch, startEnactment,
} from './commands';
import { initPolitics } from './init';
import { combineModifiers } from './modifiers';
import { politicsTick } from './tick';
import type { CountryPolitics, IgId, Movement } from './types';

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

/** A copy of `state` with GBR's politics replaced by `country`. */
function withGbr(state: GameState, country: CountryPolitics): GameState {
  return {
    ...state,
    politics: { countries: { ...state.politics.countries, GBR: country } },
  };
}

/** GBR's politics, cloned so tests can mutate it freely. */
function gbrOf(state: GameState): CountryPolitics {
  const country = state.politics.countries.GBR;
  if (!country) throw new Error('GBR has no politics');
  return structuredClone(country);
}

function runTicks(state: GameState, weeks: number): GameState {
  let current = state;
  for (let i = 0; i < weeks; i++) current = politicsTick(current);
  return current;
}

describe('politics commands', () => {
  let state: GameState;

  beforeAll(() => {
    state = base();
  });

  describe('setGovernment', () => {
    it('rejects an empty government', () => {
      expect(setGovernment(state, 'GBR', [])).toBe(state);
    });

    it('rejects five interest groups', () => {
      const five: IgId[] = IG_IDS.slice(0, 5);
      expect(five).toHaveLength(5);
      expect(setGovernment(state, 'GBR', five)).toBe(state);
    });

    it('rejects duplicate interest groups', () => {
      expect(setGovernment(state, 'GBR', ['landowners', 'landowners'])).toBe(state);
    });

    it('accepts a valid government', () => {
      const next = setGovernment(state, 'GBR', ['industrialists', 'merchants']);
      expect(next).not.toBe(state);
      expect(next.politics.countries.GBR?.government).toEqual(['industrialists', 'merchants']);
    });

    it('lowers the approval of an IG leaving the government by 3', () => {
      const before = gbrOf(state);
      const leaving = before.government[0];
      expect(leaving).toBeDefined();
      if (!leaving) return;
      const approvalBefore = before.igs[leaving].approval;

      const keep = IG_IDS.filter((ig) => ig !== leaving).slice(0, 2);
      const next = setGovernment(state, 'GBR', keep);
      const after = next.politics.countries.GBR;
      expect(after).toBeDefined();
      if (!after) return;

      expect(after.government).not.toContain(leaving);
      expect(after.igs[leaving].approval).toBeCloseTo(
        Math.max(-10, Math.min(10, approvalBefore - 3)),
        9,
      );
    });
  });

  describe('startEnactment', () => {
    it('rejects the law already in force', () => {
      const gbr = gbrOf(state);
      expect(startEnactment(state, 'GBR', gbr.laws.governance)).toBe(state);
    });

    it('rejects a law whose tech is missing', () => {
      const gbr = gbrOf(state);
      expect(gbr.techs).not.toContain('popular_sovereignty');
      expect(startEnactment(state, 'GBR', 'manhood_franchise')).toBe(state);
    });

    it('rejects a second enactment while one is running', () => {
      const started = startEnactment(state, 'GBR', 'free_trade');
      expect(started).not.toBe(state);
      expect(started.politics.countries.GBR?.enacting?.law).toBe('free_trade');
      expect(startEnactment(started, 'GBR', 'graduated_tax')).toBe(started);
    });
  });

  describe('cancelEnactment', () => {
    it('clears the enactment in progress', () => {
      const started = startEnactment(state, 'GBR', 'free_trade');
      expect(started.politics.countries.GBR?.enacting).not.toBeNull();

      const cancelled = cancelEnactment(started, 'GBR');
      expect(cancelled.politics.countries.GBR?.enacting).toBeNull();
    });

    it('returns the same state when nothing is being enacted', () => {
      expect(cancelEnactment(state, 'GBR')).toBe(state);
    });
  });

  describe('enacting free trade', () => {
    it('completes within 200 weeks and puts free_trade in force', () => {
      const gbr = gbrOf(state);
      if (!gbr.techs.includes('political_economy')) gbr.techs.push('political_economy');
      gbr.government = ['industrialists', 'merchants', 'intelligentsia'];
      gbr.enacting = null;

      const prepared = withGbr(state, gbr);
      const started = startEnactment(prepared, 'GBR', 'free_trade');
      expect(started).not.toBe(prepared);
      expect(started.politics.countries.GBR?.enacting?.law).toBe('free_trade');

      const after = runTicks(started, 200);
      const result = after.politics.countries.GBR;
      expect(result).toBeDefined();
      expect(result?.laws.trade).toBe('free_trade');
      expect(result?.enacting).toBeNull();
    });
  });

  describe('setResearch', () => {
    it('rejects a tech with missing prerequisites', () => {
      const gbr = gbrOf(state);
      expect(gbr.techs).not.toContain('railways');
      expect(setResearch(state, 'GBR', 'railways')).toBe(state);
    });

    it('accepts an available tech', () => {
      const gbr = gbrOf(state);
      const available = 'popular_sovereignty';
      expect(gbr.techs).not.toContain(available);
      expect(gbr.techs).toContain('enlightenment');

      const next = setResearch(state, 'GBR', available);
      expect(next).not.toBe(state);
      expect(next.politics.countries.GBR?.researching).toBe(available);
      expect(next.politics.countries.GBR?.researchProgress).toBe(0);
    });
  });

  describe('combineModifiers', () => {
    it('takes tradeShare from free trade plus the canals bonus', () => {
      const gbr = gbrOf(state);
      const laws = { ...gbr.laws, trade: 'free_trade' };
      const expected = gbr.techs.includes('canals') ? 0.7 + 0.05 : 0.7;

      const modifiers = combineModifiers(laws, gbr.techs, []);
      expect(modifiers.tradeShare).toBeCloseTo(expected, 9);
      expect(modifiers.tradeShareAdd).toBeUndefined();
    });

    it('multiplies output by 0.9 when a movement is at full radicalism', () => {
      const gbr = gbrOf(state);
      const calm = combineModifiers(gbr.laws, gbr.techs, []);
      const unrest: Movement[] = [{ ig: 'workers', law: 'worker_protections', radicalism: 100 }];
      const angry = combineModifiers(gbr.laws, gbr.techs, unrest);

      expect(calm.outputMult).toBeDefined();
      expect(angry.outputMult).toBeCloseTo((calm.outputMult ?? 1) * 0.9, 9);
    });
  });
});
