// Runs the real world for N weeks and prints an economy report.
//   npx vite-node scripts/soak.ts -- 520
import statesJson from '../src/data/states.json';
import countriesJson from '../src/data/countries.json';
import { createGameState } from '../src/sim/state';
import { initEconomy } from '../src/sim/economy/init';
import { withStartEconomy } from '../src/sim/economy/start';
import { initPolitics } from '../src/sim/politics/init';
import { initDiplomacy } from '../src/sim/diplomacy/init';
import { initMilitary } from '../src/sim/war/init';
import { IGS } from '../src/data/politics/igs';
import { tick } from '../src/sim/tick';
import { GOODS, GOOD_IDS } from '../src/data/economy/goods';
import { POP_TYPE_IDS } from '../src/data/economy/pops';
import type { CountryDef, StateDef } from '../src/sim/types';
import type { GameState } from '../src/sim/types';

const weeks = Number(process.argv[process.argv.length - 1]) || 104;
const TAGS = ['GBR', 'FRA', 'PRU', 'USA', 'RUS', 'QNG', 'JAP', 'EGY', 'BRZ'];

function report(s: GameState, label: string) {
  console.log(`\n=== ${label}  (${s.date.year}-${s.date.month}-${s.date.day})`);
  for (const tag of TAGS) {
    const c = s.economy.countries[tag]; const m = s.economy.markets[tag];
    if (!c || !m) continue;
    let pop = 0, employed = 0, solW = 0, levels = 0, profit = 0;
    for (const [id, se] of Object.entries(s.economy.states)) {
      if (s.states[id]?.owner !== tag) continue;
      for (const t of POP_TYPE_IDS) { pop += se.pops[t]; solW += se.pops[t] * se.sol[t]; if (t !== 'peasants') employed += se.pops[t]; }
      for (const b of Object.values(se.buildings)) { levels += b.level; profit += b.lastProfit; }
    }
    const rel = GOOD_IDS.map((g) => m.prices[g] / GOODS[g].basePrice);
    const low = GOOD_IDS.filter((g, i) => rel[i] <= 0.3), high = GOOD_IDS.filter((g, i) => rel[i] >= 1.7);
    console.log(`${tag}: pop ${(pop / 1e6).toFixed(2)}M emp ${(100 * employed / pop).toFixed(1)}% sol ${(solW / pop).toFixed(1)} lv ${levels} ` +
      `treasury ${c.treasury.toFixed(0)} inc ${c.lastIncome.toFixed(0)} exp ${c.lastExpenses.toFixed(0)} cp ${c.constructionPoints.toFixed(0)} profit ${profit.toFixed(0)}` +
      `\n     floor: ${low.join(' ') || '-'} | ceiling: ${high.join(' ') || '-'}`);
    const p = s.politics.countries[tag];
    if (p) {
      const igs = Object.entries(p.igs).sort((a, b) => b[1].clout - a[1].clout).slice(0, 4)
        .map(([k, v]) => `${IGS[k as keyof typeof IGS].name} ${(v.clout * 100).toFixed(0)}% ${v.approval.toFixed(1)}`).join(', ');
      console.log(`     legit ${p.legitimacy.toFixed(0)} gov [${p.government.join(',')}] techs ${p.techs.length} rp ${p.researchPoints.toFixed(1)} ` +
        `res ${p.researching ?? '-'} enact ${p.enacting ? p.enacting.law + ' ' + (p.enacting.progress * 100).toFixed(0) + '%' : '-'} ` +
        `moves ${p.movements.map((m) => m.ig + '>' + m.law + ':' + m.radicalism.toFixed(0)).join(' ') || '-'}\n     ${igs}`);
    }
  }
}

let t0 = performance.now();
const base = createGameState(statesJson as StateDef[], countriesJson as Record<string, CountryDef>, null);
let s = initMilitary(initDiplomacy(initPolitics(process.env.SEED ? initEconomy(base) : withStartEconomy(base))));
console.log(`init ${(performance.now() - t0).toFixed(0)} ms, states ${Object.keys(s.economy.states).length}, buildings ${Object.values(s.economy.states).reduce((n, e) => n + Object.keys(e.buildings).length, 0)}`);
report(s, 'start');
const times: number[] = [];
const seenWars = new Set<number>(), seenPlays = new Set<number>();
const nm = (t: string) => s.countries[t]?.name ?? t;
for (let w = 1; w <= weeks; w++) {
  const before = s;
  t0 = performance.now(); s = tick(s); times.push(performance.now() - t0);
  for (const p of s.diplomacy.plays) if (!seenPlays.has(p.id)) { seenPlays.add(p.id); console.log(`${s.date.year}-${s.date.month}: PLAY ${nm(p.initiator)} -> ${nm(p.target)} [${p.goals.map((g) => g.kind + (g.stateId ? ':' + s.states[g.stateId]?.name : '')).join(', ')}]`); }
  for (const war of s.military.wars) if (!seenWars.has(war.id)) { seenWars.add(war.id); console.log(`${s.date.year}-${s.date.month}: WAR ${war.name}: ${war.attackers.join(',')} vs ${war.defenders.join(',')}`); }
  for (const war of before.military.wars) if (!s.military.wars.some((x) => x.id === war.id)) console.log(`${s.date.year}-${s.date.month}: PEACE ${war.name} after ${s.tickCount - war.startedTick} wk, score ${war.warScore.toFixed(0)}, exh ${war.exhaustion.attackers.toFixed(0)}/${war.exhaustion.defenders.toFixed(0)}, battles ${war.battles.length}`);
  for (const inv of s.military.invasions) if (!before.military.invasions.some((i) => i.id === inv.id)) console.log(`${s.date.year}-${s.date.month}: INVASION ${nm(inv.tag)} sails ${inv.battalions.toFixed(0)} bn to ${s.states[inv.target]?.name} (${inv.weeksLeft} wk)`);
  for (const war of s.military.wars) for (const b of war.battles) if (b.tick === s.tickCount && b.kind && b.kind !== 'land') console.log(`${s.date.year}-${s.date.month}:   ${b.kind.toUpperCase()} in ${war.name} at ${b.front}: ${b.won ? 'won' : 'lost'}${b.stateId ? ' -> ' + s.states[b.stateId]?.name : ''} (losses ${b.attackerLosses.toFixed(1)}/${b.defenderLosses.toFixed(1)})`);
  if (s.ownershipVersion !== before.ownershipVersion) {
    for (const id of Object.keys(s.states)) if (s.states[id]!.owner !== before.states[id]!.owner) console.log(`   ${s.states[id]!.name}: ${nm(before.states[id]!.owner ?? '-')} -> ${nm(s.states[id]!.owner ?? '-')}`);
  }
  if (w === 1 || w % 104 === 0) {
    report(s, `week ${w}`);
    const nv = Object.entries(s.military.navies).sort((a, b) => b[1].flotillas - a[1].flotillas).slice(0, 8);
    console.log('   navies: ' + nv.map(([t, n]) => `${t} ${n.flotillas.toFixed(0)}fl ${(n.convoyCapacity - n.convoysLost).toFixed(0)}/${(n.convoyNeedOverseas + n.convoyNeedTrade).toFixed(0)}cv ${(n.supply * 100).toFixed(0)}%`).join(', '));
  }
}
times.sort((a, b) => a - b);
console.log(`\ntick ms: median ${times[Math.floor(times.length / 2)].toFixed(1)}, p95 ${times[Math.floor(times.length * 0.95)].toFixed(1)}, max ${times[times.length - 1].toFixed(1)}`);

// world supply/demand per good at the end
const ws: Record<string, [number, number, number]> = {};
for (const [tag, m] of Object.entries(s.economy.markets)) {
  for (const g of GOOD_IDS) {
    const w = (ws[g] ??= [0, 0, 0]);
    w[0] += m.supply[g]; w[1] += m.demand[g]; w[2] += (m.prices[g] / GOODS[g].basePrice) * m.demand[g];
  }
  void tag;
}
console.log('\nworld goods (supply / demand / demand-weighted price %):');
for (const g of GOOD_IDS) { const [a, b, c] = ws[g]!; console.log(`  ${g.padEnd(15)} ${a.toFixed(0).padStart(9)} ${b.toFixed(0).padStart(9)}  ${(b > 0 ? (100 * c) / b : 0).toFixed(0)}%`); }
