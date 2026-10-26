import { beforeAll, describe, expect, it } from 'vitest';
import statesJson from '../../data/states.json';
import countriesJson from '../../data/countries.json';
import stateEconomyJson from '../../data/stateEconomy.json';
import { createGameState } from '../state';
import { withStartEconomy } from '../economy/start';
import { initPolitics } from '../politics/init';
import { initDiplomacy } from '../diplomacy/init';
import { initMilitary } from '../war/init';
import { startWar } from '../war/wars';
import { warTick } from '../war/tick';
import { buildingCap } from '../economy/queries';
import { queueConstruction } from '../economy/commands';
import { possibleWarGoals } from '../war/queries';
import { navyStep, convoysAvailable } from './navy';
import { freeBattalions, invasionStep, invasionTargets } from './invasions';
import { cancelInvasion, launchInvasion, setRaidShare } from './commands';
import { SEA_ZONES, seaPath, zoneOfState } from './seas';
import type { CountryDef, GameState, StateDef } from '../types';

const STATE_ECO = stateEconomyJson as unknown as Record<string, { coastal: boolean }>;
let world: GameState;

beforeAll(() => {
  world = initMilitary(initDiplomacy(initPolitics(withStartEconomy(
    createGameState(statesJson as StateDef[], countriesJson as Record<string, CountryDef>, 'GBR'),
  ))));
});

function atWar(s: GameState, a: string, b: string, goal: string): GameState {
  return startWar(s, {
    id: 999, initiator: a, target: b, startedTick: s.tickCount, weeksLeft: 0,
    goals: [{ kind: 'conquer_state', holder: a, target: b, stateId: goal }],
    supporters: { initiator: [], target: [] },
  });
}

describe('sea zones', () => {
  it('gives almost every coastal state a sea zone', () => {
    const coastal = Object.keys(STATE_ECO).filter((id) => STATE_ECO[id]?.coastal);
    const zoned = coastal.filter((id) => zoneOfState(id) !== null);
    expect(zoned.length / coastal.length).toBeGreaterThan(0.98);
  });

  it('connects the oceans (only lakes and ice-locked Arctic waters are cut off)', () => {
    const start = SEA_ZONES[0]!.id;
    const unreachable = SEA_ZONES.filter((z) => z.id !== start && seaPath([start], z.id) === null);
    expect(unreachable.map((z) => z.name)).toContain('Caspian Sea');
    expect(unreachable.length).toBeLessThanOrEqual(4);
  });

  it('routes London to Hong Kong the long way round (no Suez Canal in 1836)', () => {
    const route = seaPath([zoneOfState('GBR_04')!], zoneOfState('HKG_01')!);
    expect(route).not.toBeNull();
    expect(route!.km).toBeGreaterThan(18000);
  });
});

describe('fleets and convoys', () => {
  it('starts with the Royal Navy as the largest fleet and every convoy need met', () => {
    const navies = Object.entries(world.military.navies).sort((a, b) => b[1].flotillas - a[1].flotillas);
    expect(navies[0]?.[0]).toBe('GBR');
    expect(world.military.navies.GBR!.admirals.length).toBeGreaterThan(0);
    for (const [, n] of navies) expect(n.supply).toBeCloseTo(1, 5);
    expect(world.military.navies.GBR!.overseasStates).toBeGreaterThan(20);
  });

  it('only builds naval bases and ports on the coast', () => {
    const inland = Object.keys(world.economy.states).find((id) => world.states[id]?.owner === 'GBR' && !world.economy.states[id]?.coastal);
    const coast = Object.keys(world.economy.states).find((id) => world.states[id]?.owner === 'GBR' && world.economy.states[id]?.coastal);
    expect(inland && coast).toBeTruthy();
    expect(buildingCap(world, inland!, 'port')).toBe(0);
    expect(buildingCap(world, coast!, 'port')).toBeNull();
    expect(queueConstruction(world, 'GBR', inland!, 'naval_base')).toBe(world);
    expect(queueConstruction(world, 'GBR', coast!, 'naval_base')).not.toBe(world);
    for (const se of Object.values(world.economy.states)) {
      if (se.buildings.naval_base || se.buildings.port) expect(se.coastal).toBe(true);
    }
  });

  it('raids the convoys of a weaker navy in wartime, deterministically', () => {
    const s = atWar({ ...world, player: null }, 'GBR', 'FRA', 'FRA_06');
    const run = () => {
      let x = s;
      for (let i = 0; i < 6; i++) x = navyStep({ ...x, tickCount: x.tickCount + 1 });
      return x;
    };
    const a = run();
    expect(a.military.navies.FRA!.convoysLost).toBeGreaterThan(0);
    expect(convoysAvailable(a.military.navies.FRA!)).toBeLessThan(world.military.navies.FRA!.convoyCapacity);
    expect(JSON.stringify(run().military.navies)).toBe(JSON.stringify(a.military.navies));
  });

  it('clamps the raid share', () => {
    expect(setRaidShare(world, 'GBR', 2).military.navies.GBR!.raidShare).toBe(1);
    expect(setRaidShare(world, 'GBR', 0.36).military.navies.GBR!.raidShare).toBe(0.4);
  });
});

describe('naval invasions', () => {
  it('lets a fleet demand overseas states', () => {
    expect(possibleWarGoals(world, 'GBR', 'QNG').some((g) => g.stateId === 'HKG_01')).toBe(true);
  });

  it('refuses invasions outside a war', () => {
    expect(launchInvasion(world, 'GBR', 1, 'HKG_01', 10)).toBe(world);
  });

  it('sails, fights and lands, holding the troops out of the land war meanwhile', () => {
    let s = atWar(world, 'GBR', 'QNG', 'HKG_01');
    const war = s.military.wars.at(-1)!;
    const target = invasionTargets(s, 'GBR', war.id).find((t) => t.stateId === 'HKG_01');
    expect(target).toBeDefined();
    const free = freeBattalions(s, 'GBR');
    s = launchInvasion(s, 'GBR', war.id, 'HKG_01', free / 2);
    expect(s.military.invasions).toHaveLength(1);
    expect(freeBattalions(s, 'GBR')).toBeCloseTo(free / 2, 5);
    expect(cancelInvasion(s, 'GBR', s.military.invasions[0]!.id).military.invasions).toHaveLength(0);
    for (let i = 0; i < target!.weeks; i++) s = invasionStep({ ...s, tickCount: s.tickCount + 1 });
    expect(s.military.invasions).toHaveLength(0);
    const battles = s.military.wars.find((w) => w.id === war.id)!.battles;
    expect(battles.some((b) => b.kind === 'landing' || b.kind === 'naval')).toBe(true);
  });

  it('lets the AI invade when there is no land front', () => {
    let s = atWar({ ...world, player: null }, 'GBR', 'QNG', 'HKG_01');
    let launched = false;
    for (let i = 0; i < 12 && !launched; i++) {
      s = warTick({ ...s, tickCount: s.tickCount + 1 });
      launched = s.military.invasions.some((inv) => inv.tag === 'GBR')
        || s.military.wars.some((w) => w.battles.some((b) => b.kind === 'landing'));
    }
    expect(launched).toBe(true);
  });
});
