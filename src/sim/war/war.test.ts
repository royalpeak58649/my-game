import { beforeAll, describe, expect, it } from 'vitest';
import statesJson from '../../data/states.json';
import countriesJson from '../../data/countries.json';
import { createGameState } from '../state';
import { withStartEconomy } from '../economy/start';
import { initPolitics } from '../politics/init';
import { initDiplomacy } from '../diplomacy/init';
import { diplomacyTick } from '../diplomacy/tick';
import { setImproving, setRival } from '../diplomacy/commands';
import { initMilitary } from './init';
import { warTick } from './tick';
import { warStep, startWar } from './wars';
import { setMobilized, startPlay } from './commands';
import { possibleWarGoals } from './queries';
import { PLAY_WEEKS } from '../../data/diplomacy/rules';
import type { CountryDef, GameState, StateDef } from '../types';

let world: GameState;

beforeAll(() => {
  world = initMilitary(initDiplomacy(initPolitics(withStartEconomy(
    createGameState(statesJson as StateDef[], countriesJson as Record<string, CountryDef>, 'GBR'),
  ))));
});

function walk(value: unknown, path: string, out: string[]): void {
  if (typeof value === 'number' && !Number.isFinite(value)) out.push(path);
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`, out);
  }
}

describe('diplomacy', () => {
  it('starts with the 1836 pacts', () => {
    const d = world.diplomacy;
    expect(d.alliances).toContain('AUS|RUS');
    expect(d.alliances).toContain('FRA|GBR');
    expect(d.subjects.WAL).toBe('OTT');
    expect(d.subjects.EIC).toBe('GBR');
    expect(d.relations['AUS|RUS']).toBe(60);
  });

  it('never spends more influence than it has', () => {
    for (const c of Object.values(world.diplomacy.countries)) expect(c.influenceUsed).toBeLessThanOrEqual(c.influence);
  });

  it('ranks the traditional powers as great powers and no subject among them', () => {
    const top = world.diplomacy.ranking.slice(0, 8);
    for (const t of ['GBR', 'FRA', 'RUS', 'AUS']) expect(top).toContain(t);
    for (const t of top) expect(world.diplomacy.subjects[t]).toBeUndefined();
  });

  it('stays bounded and finite over a year', () => {
    let s = world;
    for (let i = 0; i < 52; i++) s = diplomacyTick({ ...s, tickCount: s.tickCount + 1 });
    for (const v of Object.values(s.diplomacy.relations)) expect(Math.abs(v)).toBeLessThanOrEqual(100);
    const bad: string[] = [];
    walk(s.diplomacy, 'diplomacy', bad);
    expect(bad).toEqual([]);
  });

  it('refuses to improve relations with a rival and caps rivals at three', () => {
    expect(world.diplomacy.countries.GBR?.rivals).toContain('RUS');
    expect(setImproving(world, 'GBR', 'RUS', true)).toBe(world);
    let s = world;
    for (const t of ['PRU', 'USA', 'NET']) s = setRival(s, 'GBR', t, true);
    expect(s.diplomacy.countries.GBR?.rivals.length).toBeLessThanOrEqual(3);
  });
});

describe('armies and plays', () => {
  it('gives every country an army sized from 1836', () => {
    expect(world.military.armies.RUS?.battalions ?? 0).toBeGreaterThan(world.military.armies.GBR?.battalions ?? 0);
    expect(world.military.armies.GBR?.generals.length ?? 0).toBeGreaterThan(0);
  });

  it('offers war goals against a bordering country', () => {
    const goals = possibleWarGoals(world, 'GBR', 'USA');
    expect(goals.some((g) => g.kind === 'humiliate')).toBe(true);
    expect(goals.some((g) => g.kind === 'conquer_state')).toBe(true);
  });

  it('refuses plays against allies and subjects', () => {
    const humiliate = (target: string) => [{ kind: 'humiliate' as const, holder: 'GBR', target }];
    expect(startPlay(world, 'GBR', 'FRA', humiliate('FRA'))).toBe(world);
    expect(startPlay(world, 'GBR', 'EIC', humiliate('EIC'))).toBe(world);
  });

  it('resolves a play within PLAY_WEEKS (back-down or war)', () => {
    const goal = possibleWarGoals(world, 'GBR', 'USA').find((g) => g.kind === 'conquer_state');
    expect(goal).toBeDefined();
    let s = startPlay(world, 'GBR', 'USA', [goal!]);
    expect(s.diplomacy.plays.length).toBe(world.diplomacy.plays.length + 1);
    for (let i = 0; i <= PLAY_WEEKS; i++) s = warTick({ ...s, tickCount: s.tickCount + 1 });
    const play = s.diplomacy.plays.find((p) => p.initiator === 'GBR' && p.target === 'USA');
    expect(play).toBeUndefined();
    const changedHands = s.states[goal!.stateId!]?.owner === 'GBR';
    const atWar = s.military.wars.some((w) => w.attackers.includes('GBR') && w.defenders.includes('USA'));
    expect(changedHands || atWar).toBe(true);
  });

  it('toggles mobilisation', () => {
    const on = setMobilized(world, 'GBR', true);
    expect(on.military.armies.GBR?.mobilized).toBe(true);
    expect(setMobilized(on, 'GBR', false).military.armies.GBR?.mobilized).toBe(false);
  });
});

describe('wars', () => {
  // A war on a hand-made line of four states: A1 – A2 – B1 – B2 (AAA attacks BBB).
  function lineWar(): { s: GameState; adjacency: Record<string, string[]> } {
    const ids = Object.keys(world.economy.states).sort().slice(0, 4) as [string, string, string, string];
    const [a1, a2, b1, b2] = ids;
    const states = { ...world.states };
    for (const [id, owner] of [[a1, 'GBR'], [a2, 'GBR'], [b1, 'USA'], [b2, 'USA']] as const) {
      states[id] = { ...states[id]!, owner };
    }
    const adjacency = { [a1]: [a2], [a2]: [a1, b1], [b1]: [a2, b2], [b2]: [b1] };
    let s: GameState = { ...world, states };
    s = startWar(s, {
      id: 999, initiator: 'GBR', target: 'USA', startedTick: s.tickCount, weeksLeft: 0,
      goals: [{ kind: 'conquer_state', holder: 'GBR', target: 'USA', stateId: b1 }],
      supporters: { initiator: [], target: [] },
    });
    // make the defender hopelessly outnumbered
    const usa = s.military.armies.USA!;
    s = { ...s, military: { ...s.military, armies: { ...s.military.armies, USA: { ...usa, battalions: 1 } } } };
    return { s, adjacency };
  }

  it('builds a front, occupies, wears the loser down and transfers the goal', () => {
    const { s: start, adjacency } = lineWar();
    const war0 = start.military.wars.find((w) => w.attackers.includes('GBR') && w.defenders.includes('USA'))!;
    const target = war0.goals[0]!.stateId!;
    let s = warStep({ ...start, tickCount: start.tickCount + 1 }, adjacency);
    const war1 = s.military.wars.find((w) => w.id === war0.id);
    expect(war1?.fronts.map((f) => f.id)).toEqual(['GBR|USA']);
    expect(war1?.fronts[0]?.attackerBattalions ?? 0).toBeGreaterThan(0);
    let ended = false;
    for (let i = 0; i < 200 && !ended; i++) {
      s = warStep({ ...s, tickCount: s.tickCount + 1 }, adjacency);
      ended = !s.military.wars.some((w) => w.id === war0.id);
    }
    expect(ended).toBe(true);
    expect(s.states[target]?.owner).toBe('GBR');
    expect(s.ownershipVersion).toBeGreaterThan(start.ownershipVersion);
  });

  it('is deterministic', () => {
    const { s, adjacency } = lineWar();
    const run = () => {
      let x = s;
      for (let i = 0; i < 20; i++) x = warStep({ ...x, tickCount: x.tickCount + 1 }, adjacency);
      return JSON.stringify(x.military);
    };
    expect(run()).toBe(run());
  });
});
