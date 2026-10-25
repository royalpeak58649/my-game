// Generates the calibrated 1836 start economy.
//   npm run data:start            (after data and data:economy)
//
// Seeds the economy from development levels (initEconomy), then runs a pre-1836
// warm-up in which every country instantly builds what is profitable and shrinks what
// loses money, until markets settle. The result is saved as src/data/start1836.json and
// loaded by the game instead of running initEconomy at startup.
import fs from 'node:fs';
import statesJson from '../src/data/states.json';
import countriesJson from '../src/data/countries.json';
import { createGameState, START_DATE } from '../src/sim/state';
import { initEconomy } from '../src/sim/economy/init';
import { TREASURY_PER_CAPITA } from '../src/data/economy/development';
import { tick } from '../src/sim/tick';
import { GOODS, GOOD_IDS } from '../src/data/economy/goods';
import type { CountryDef, GameState, StateDef } from '../src/sim/types';

const WARMUP_WEEKS = Number(process.env.WARMUP_WEEKS ?? 520);
const SETTLE_WEEKS = 26; // normal rules afterwards, so the investment AI's queue and prices settle

function summary(s: GameState): string {
  let atFloor = 0, atCeil = 0, n = 0;
  for (const m of Object.values(s.economy.markets)) {
    for (const g of GOOD_IDS) {
      if (m.demand[g] < 1 && m.supply[g] < 1) continue;
      const r = m.prices[g] / GOODS[g].basePrice;
      n++; if (r <= 0.3) atFloor++; if (r >= 1.7) atCeil++;
    }
  }
  const levels = Object.values(s.economy.states).reduce((t, e) => t + Object.values(e.buildings).reduce((a, b) => a + b.level, 0), 0);
  return `levels ${levels}, traded goods at floor ${(100 * atFloor / n).toFixed(0)}%, at ceiling ${(100 * atCeil / n).toFixed(0)}%`;
}

let s = initEconomy(createGameState(statesJson as StateDef[], countriesJson as Record<string, CountryDef>, null));
console.log(`seeded: ${summary(s)}`);
s = { ...s, economy: { ...s.economy, warmup: true } };
for (let w = 1; w <= WARMUP_WEEKS; w++) {
  s = tick(s);
  if (w % 52 === 0) console.log(`warm-up year ${w / 52}: ${summary(s)}`);
}
const { warmup: _, ...eco } = s.economy;
s = { ...s, economy: eco };
for (let w = 1; w <= SETTLE_WEEKS; w++) s = tick(s);
console.log(`settled: ${summary(s)}`);

// back to the start date, keep the economy
const economy = structuredClone(s.economy);
// treasuries start fresh (the warm-up's accumulated money is not part of 1836)
const popOf: Record<string, number> = {};
for (const [sid, se] of Object.entries(economy.states)) {
  const tag = s.states[sid]?.owner;
  if (tag) popOf[tag] = (popOf[tag] ?? 0) + Object.values(se.pops).reduce((a, b) => a + b, 0);
}
for (const [tag, c] of Object.entries(economy.countries)) {
  c.queue = [];
  c.treasury = (popOf[tag] ?? 0) * TREASURY_PER_CAPITA;
}
fs.writeFileSync(new URL('../src/data/start1836.json', import.meta.url), JSON.stringify({ date: START_DATE, economy }));
console.log('wrote src/data/start1836.json', (JSON.stringify(economy).length / 1e6).toFixed(2), 'MB');

const ws: Record<string, [number, number, number]> = {};
for (const m of Object.values(s.economy.markets)) for (const g of GOOD_IDS) {
  const w = (ws[g] ??= [0, 0, 0]); w[0] += m.supply[g]; w[1] += m.demand[g]; w[2] += (m.prices[g] / GOODS[g].basePrice) * m.demand[g];
}
console.log('world goods (supply / demand / demand-weighted price %):');
for (const g of GOOD_IDS) { const [a, b, c] = ws[g]!; console.log(`  ${g.padEnd(15)} ${a.toFixed(0).padStart(9)} ${b.toFixed(0).padStart(9)}  ${(b > 0 ? (100 * c) / b : 0).toFixed(0)}%`); }
