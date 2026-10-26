// Prints every navy's fleet and convoy balance at the 1836 start (or after N weeks).
//   npx vite-node scripts/navy-report.ts -- [weeks]
import statesJson from '../src/data/states.json';
import countriesJson from '../src/data/countries.json';
import { createGameState } from '../src/sim/state';
import { withStartEconomy } from '../src/sim/economy/start';
import { initPolitics } from '../src/sim/politics/init';
import { initDiplomacy } from '../src/sim/diplomacy/init';
import { initMilitary } from '../src/sim/war/init';
import { tick } from '../src/sim/tick';
import type { CountryDef, StateDef } from '../src/sim/types';

const weeks = Number(process.argv.at(-1)) || 0;
let s = initMilitary(initDiplomacy(initPolitics(withStartEconomy(
  createGameState(statesJson as StateDef[], countriesJson as Record<string, CountryDef>, null)))));
for (let i = 0; i < weeks; i++) s = tick(s);
const rows = Object.entries(s.military.navies)
  .filter(([, n]) => n.flotillas > 0.5 || n.convoyCapacity > 0)
  .sort((a, b) => b[1].flotillas - a[1].flotillas);
console.log('tag   flot  qual  adm  convoys cap/lost  need(overseas+trade)  supply  overseas');
for (const [t, n] of rows.slice(0, 30)) {
  console.log(`${t.padEnd(5)} ${n.flotillas.toFixed(1).padStart(5)} ${n.quality.toFixed(2)} ${String(n.admirals.length).padStart(4)}  ${n.convoyCapacity.toFixed(0).padStart(6)}/${n.convoysLost.toFixed(0).padEnd(4)} ${n.convoyNeedOverseas.toFixed(0).padStart(8)}+${n.convoyNeedTrade.toFixed(0).padEnd(8)} ${n.supply.toFixed(2).padStart(6)} ${String(n.overseasStates).padStart(6)}`);
}
const short = rows.filter(([, n]) => n.supply < 0.95).map(([t, n]) => `${t}:${n.supply.toFixed(2)}`);
console.log(`countries with navies/ports: ${rows.length}; short of convoys: ${short.join(' ') || 'none'}`);
