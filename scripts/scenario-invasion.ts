// Naval scenario: Britain declares war on Qing China over Hong Kong (no land front: the war can
// only be fought from the sea). Prints invasions, naval battles, landings and the peace.
//   npx vite-node scripts/scenario-invasion.ts -- [weeks]
import statesJson from '../src/data/states.json';
import countriesJson from '../src/data/countries.json';
import { createGameState } from '../src/sim/state';
import { withStartEconomy } from '../src/sim/economy/start';
import { initPolitics } from '../src/sim/politics/init';
import { initDiplomacy } from '../src/sim/diplomacy/init';
import { initMilitary } from '../src/sim/war/init';
import { startWar } from '../src/sim/war/wars';
import { tick } from '../src/sim/tick';
import type { CountryDef, GameState, StateDef } from '../src/sim/types';

const weeks = Number(process.argv.at(-1)) || 156;
const [A, B, GOAL] = (process.env.WAR ?? 'GBR,QNG,HKG_01').split(',') as [string, string, string];
let s: GameState = initMilitary(initDiplomacy(initPolitics(withStartEconomy(
  createGameState(statesJson as StateDef[], countriesJson as Record<string, CountryDef>, null)))));
s = startWar(s, {
  id: 9999, initiator: A, target: B, startedTick: s.tickCount, weeksLeft: 0,
  goals: [{ kind: 'conquer_state', holder: A, target: B, stateId: GOAL }],
  supporters: { initiator: [], target: [] },
});
const name = (sid: string) => s.states[sid]?.name ?? sid;
const war0 = s.military.wars.at(-1)!;
console.log(`${war0.name}: goal ${name(GOAL)}`);
for (let w = 1; w <= weeks; w++) {
  const before = s;
  s = tick(s);
  const d = `${s.date.year}-${String(s.date.month).padStart(2, '0')}`;
  for (const inv of s.military.invasions) if (!before.military.invasions.some((i) => i.id === inv.id)) console.log(`${d} INVASION ${inv.tag}: ${inv.battalions.toFixed(0)} bn -> ${name(inv.target)} (${inv.weeksLeft} wk at sea)`);
  const war = s.military.wars.find((x) => x.id === war0.id);
  if (war) {
    for (const b of war.battles) if (b.tick === s.tickCount) console.log(`${d}   ${(b.kind ?? 'land').padEnd(7)} ${b.front}: ${b.attackingSide} ${b.won ? 'won' : 'lost'}${b.stateId ? ' -> ' + name(b.stateId) : ''} (losses ${b.attackerLosses.toFixed(1)} / ${b.defenderLosses.toFixed(1)})`);
    if (w % 13 === 0) {
      const na = s.military.navies[A]!, nb = s.military.navies[B]!;
      console.log(`${d} score ${war.warScore.toFixed(0)} exh ${war.exhaustion.attackers.toFixed(0)}/${war.exhaustion.defenders.toFixed(0)} fronts ${war.fronts.map((f) => f.id).join(' ') || '-'} | ${A} ${na.flotillas.toFixed(1)}fl raid ${na.raidShare} cv ${(na.convoyCapacity - na.convoysLost).toFixed(0)}/${(na.convoyNeedOverseas + na.convoyNeedTrade).toFixed(0)} | ${B} ${nb.flotillas.toFixed(1)}fl cv ${(nb.convoyCapacity - nb.convoysLost).toFixed(0)}/${(nb.convoyNeedOverseas + nb.convoyNeedTrade).toFixed(0)} supply ${nb.supply.toFixed(2)}`);
    }
  } else {
    const ended = before.military.wars.find((x) => x.id === war0.id)!;
    console.log(`${d} PEACE after ${s.tickCount - ended.startedTick} wk, score ${ended.warScore.toFixed(0)}; ${name(GOAL)} now ${s.states[GOAL]?.owner}`);
    break;
  }
}
