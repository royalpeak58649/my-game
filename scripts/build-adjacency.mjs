// Land adjacency between states, from shared borders in the map topology.
//   npm run data:adjacency     (after `npm run data`)
// Output: src/data/adjacency.json  { [stateId]: string[] }  (sorted, symmetric)
import fs from 'node:fs';
import { neighbors } from 'topojson-client';

const topo = JSON.parse(fs.readFileSync(new URL('../src/data/world.topo.json', import.meta.url), 'utf8'));
const geoms = topo.objects.states.geometries;
const adj = neighbors(geoms);
const out = {};
geoms.forEach((g, i) => {
  out[String(g.id)] = [...new Set(adj[i].map((j) => String(geoms[j].id)))].sort();
});
fs.writeFileSync(new URL('../src/data/adjacency.json', import.meta.url), JSON.stringify(out));
const degrees = Object.values(out).map((a) => a.length);
console.log(`states ${degrees.length}, isolated ${degrees.filter((d) => d === 0).length}, mean neighbours ${(degrees.reduce((a, b) => a + b, 0) / degrees.length).toFixed(2)}`);
