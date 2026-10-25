import { describe, expect, it } from 'vitest';
import statesJson from '../data/states.json';
import countriesJson from '../data/countries.json';
import { createGameState } from './state';
import { tick } from './tick';
import { statesOf } from './queries';
import type { CountryDef, StateDef } from './types';

const states = statesJson as StateDef[];
const countries = countriesJson as Record<string, CountryDef>;

describe('world data integrity', () => {
  it('has unique state ids', () => {
    expect(new Set(states.map((s) => s.id)).size).toBe(states.length);
  });
  it('every owner is a known country', () => {
    for (const s of states) if (s.owner) expect(countries[s.owner], s.id).toBeDefined();
  });
  it('every country owns its capital and at least one state', () => {
    const byId = new Map(states.map((s) => [s.id, s]));
    for (const c of Object.values(countries)) {
      expect(byId.get(c.capital)?.owner, c.tag).toBe(c.tag);
    }
  });
});

describe('simulation', () => {
  const base = createGameState(states, countries, 'FRA');

  it('starts on 1 January 1836', () => {
    expect(base.date).toEqual({ year: 1836, month: 1, day: 1 });
  });
  it('tick advances one week without mutating input', () => {
    const next = tick(base);
    expect(next.date).toEqual({ year: 1836, month: 1, day: 8 });
    expect(next.tickCount).toBe(1);
    expect(base.date.day).toBe(1);
  });
  it('is deterministic', () => {
    let a = base, b = base;
    for (let i = 0; i < 60; i++) { a = tick(a); b = tick(b); }
    expect(a).toEqual(b);
    expect(a.date.year).toBe(1837);
  });
  it('survives a JSON round-trip', () => {
    const s = tick(tick(base));
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
  it('queries states of a country', () => {
    expect(statesOf(base, 'FRA').length).toBeGreaterThan(5);
  });
});
