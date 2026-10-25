// Runs the real world for N weeks and prints an economy report.
//   npx vite-node scripts/soak.ts -- 520
import statesJson from '../src/data/states.json';
import countriesJson from '../src/data/countries.json';
import { createGameState } from '../src/sim/state';
import { initEconomy } from '../src/sim/economy/init';
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
  }
}

let t0 = performance.now();
let s = initEconomy(createGameState(statesJson as StateDef[], countriesJson as Record<string, CountryDef>, null));
console.log(`init ${(performance.now() - t0).toFixed(0)} ms, states ${Object.keys(s.economy.states).length}, buildings ${Object.values(s.economy.states).reduce((n, e) => n + Object.keys(e.buildings).length, 0)}`);
report(s, 'start');
const times: number[] = [];
for (let w = 1; w <= weeks; w++) {
  t0 = performance.now(); s = tick(s); times.push(performance.now() - t0);
  if (w === 1 || w === 4 || w === 26 || w % 52 === 0) report(s, `week ${w}`);
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
