// Sea zones and sea lanes for the navy.
//   npm run data:seas        (after `npm run data` and `npm run data:economy`)
//
// 1. Rasterise land at RES degrees; carve the narrow straits a coarse grid would close.
// 2. Seed ZONES zones by k-means over the shore points of coastal states.
// 3. Partition all water cells between the seeds by distance through water (multi-source
//    Dijkstra), so zones cover the open ocean too and never connect across land
//    (no Suez or Panama canal in 1836).
// 4. Zones whose water touches are neighbours; lane length = great-circle distance between
//    their water centroids.
// Output: src/data/seas.json
//   { zones: [{ id, name, anchor: [lon, lat], neighbours: { [zoneId]: km } }], stateZone: { [stateId]: zoneId } }
import fs from 'node:fs';
import { geoBounds, geoContains } from 'd3-geo';
import { feature } from 'topojson-client';

const RES = 0.5;
const ZONES = 90;
const W = Math.round(360 / RES), H = Math.round(180 / RES);
const root = new URL('..', import.meta.url);
const read = (p) => JSON.parse(fs.readFileSync(new URL(p, root), 'utf8'));

const topo = read('src/data/world.topo.json');
const stateEco = read('src/data/stateEconomy.json');
const marine = read('data-raw/ne_10m_geography_marine_polys.geojson');

const R = 6371;
const rad = Math.PI / 180;
function distKm([lon1, lat1], [lon2, lat2]) {
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(Math.min(1, a)));
}
const cellLon = (x) => -180 + (x + 0.5) * RES;
const cellLat = (y) => 90 - (y + 0.5) * RES;
const cellOf = ([lon, lat]) => [Math.min(W - 1, Math.max(0, Math.floor((lon + 180) / RES))), Math.min(H - 1, Math.max(0, Math.floor((90 - lat) / RES)))];

// ---------------------------------------------------------------- 1. land mask
const features = feature(topo, topo.objects.states).features;
const land = new Uint8Array(W * H);
let t0 = Date.now();
for (const f of features) {
  let [[w, s], [e, n]] = geoBounds(f);
  const ranges = w <= e ? [[w, e]] : [[w, 180], [-180, e]];
  for (const [a, b] of ranges) {
    const [x0, y0] = cellOf([a, n]);
    const [x1, y1] = cellOf([b, s]);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * W + x;
      if (!land[i] && geoContains(f, [cellLon(x), cellLat(y)])) land[i] = 1;
    }
  }
}
console.log(`land mask ${((Date.now() - t0) / 1000).toFixed(1)}s, land cells ${land.reduce((a, b) => a + b, 0)}`);

// pack ice: no sailing north of ICE_LAT (closes the Northwest and Northeast Passages in 1836)
// or south of -ICE_LAT_S
const ICE_LAT = 72, ICE_LAT_S = -66;
for (let y = 0; y < H; y++) {
  const lat = cellLat(y);
  if (lat <= ICE_LAT && lat >= ICE_LAT_S) continue;
  for (let x = 0; x < W; x++) land[y * W + x] = 1;
}

// straits closed by the coarse grid: carve water along these segments
const STRAITS = [
  ['Gibraltar', [-6.2, 35.9], [-5.0, 36.0]],
  ['Dardanelles–Bosphorus', [26.0, 40.0], [26.7, 40.4], [27.5, 40.7], [28.9, 41.0], [29.2, 41.4]],
  ['Øresund', [12.6, 56.3], [12.7, 55.6], [12.9, 55.2]],
  ['Great Belt', [10.9, 56.0], [11.0, 55.3], [10.9, 54.7]],
  ['Kerch', [36.4, 45.5], [36.6, 45.0]],
  ['Messina', [15.6, 38.4], [15.6, 38.0]],
  ['Bab-el-Mandeb', [43.2, 13.0], [43.5, 12.4]],
  ['Hormuz', [56.2, 26.8], [56.6, 26.2]],
  ['Juan de Fuca', [-124.8, 48.45], [-123.6, 48.25], [-123.0, 48.3]],
  ['Kanmon–Seto', [130.85, 33.95], [131.1, 33.95]],
  ['Malacca–Singapore', [100.0, 3.0], [103.9, 1.2], [104.5, 1.3]],
];
for (const [, ...pts] of STRAITS) {
  for (let k = 0; k + 1 < pts.length; k++) {
    const [a, b] = [pts[k], pts[k + 1]];
    const steps = Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / (RES / 3)) + 1;
    for (let s = 0; s <= steps; s++) {
      const [x, y] = cellOf([a[0] + ((b[0] - a[0]) * s) / steps, a[1] + ((b[1] - a[1]) * s) / steps]);
      land[y * W + x] = 0;
    }
  }
}
const water = (i) => land[i] === 0;
function neighbours(i) {
  const x = i % W, y = (i - x) / W;
  const out = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const ny = y + dy;
    if (ny < 0 || ny >= H) continue;
    const nx = (x + dx + W) % W; // wrap the antimeridian
    out.push(ny * W + nx);
  }
  return out;
}
const cellKm = (i, j) => distKm([cellLon(i % W), cellLat(Math.floor(i / W))], [cellLon(j % W), cellLat(Math.floor(j / W))]);

/** Nearest water cell to a point (spiral search). */
function nearestWater([lon, lat]) {
  const [cx, cy] = cellOf([lon, lat]);
  for (let r = 0; r < 40; r++) {
    let best = -1, bd = Infinity;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const y = cy + dy;
      if (y < 0 || y >= H) continue;
      const i = y * W + ((cx + dx + W) % W);
      if (!water(i)) continue;
      const d = distKm([lon, lat], [cellLon(i % W), cellLat(Math.floor(i / W))]);
      if (d < bd) { bd = d; best = i; }
    }
    if (best >= 0) return best;
  }
  return -1;
}

// ---------------------------------------------------------------- 2. shore points and seeds
// shore point of a coastal state = mean of the vertices of its coastline arcs
const arcUse = new Map();
const arcsOf = (g) => {
  const out = [];
  const walk = (a) => (Array.isArray(a) ? (typeof a[0] === 'number' ? a.forEach((i) => out.push(i < 0 ? ~i : i)) : a.forEach(walk)) : null);
  walk(g.arcs);
  return out;
};
const geoms = topo.objects.states.geometries;
for (const g of geoms) for (const a of new Set(arcsOf(g))) arcUse.set(a, (arcUse.get(a) ?? 0) + 1);
const { scale, translate } = topo.transform;
function arcPoints(a) {
  let x = 0, y = 0;
  return topo.arcs[a].map(([dx, dy]) => { x += dx; y += dy; return [x * scale[0] + translate[0], y * scale[1] + translate[1]]; });
}
const shore = new Map(); // stateId -> water cell
for (const g of geoms) {
  const id = String(g.id);
  if (!stateEco[id]?.coastal) continue;
  const pts = [];
  for (const a of new Set(arcsOf(g))) if (arcUse.get(a) === 1) pts.push(...arcPoints(a));
  if (!pts.length) continue;
  // 3D mean avoids antimeridian trouble
  let X = 0, Y = 0, Z = 0;
  for (const [lon, lat] of pts) { X += Math.cos(lat * rad) * Math.cos(lon * rad); Y += Math.cos(lat * rad) * Math.sin(lon * rad); Z += Math.sin(lat * rad); }
  const p = [Math.atan2(Y, X) / rad, Math.atan2(Z, Math.hypot(X, Y)) / rad];
  // use the coastline vertex closest to the mean (the mean of a long coast can lie inland)
  let best = pts[0], bd = Infinity;
  for (const q of pts) { const d = distKm(p, q); if (d < bd) { bd = d; best = q; } }
  const cell = nearestWater(best);
  if (cell >= 0) shore.set(id, cell);
}
const coastalIds = [...shore.keys()].sort();
console.log(`coastal states with a shore cell: ${coastalIds.length}`);

// k-means on the unit sphere over shore cells
const vec = (i) => { const lon = cellLon(i % W) * rad, lat = cellLat(Math.floor(i / W)) * rad; return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)]; };
const pts = coastalIds.map((id) => vec(shore.get(id)));
const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
const centers = [pts[0].slice()];
while (centers.length < ZONES) {
  let bi = 0, bd = -1;
  pts.forEach((p, i) => { const d = Math.min(...centers.map((c) => d2(p, c))); if (d > bd) { bd = d; bi = i; } });
  centers.push(pts[bi].slice());
}
let assign = [];
for (let it = 0; it < 30; it++) {
  assign = pts.map((p) => { let b = 0, bd = Infinity; centers.forEach((c, k) => { const d = d2(p, c); if (d < bd) { bd = d; b = k; } }); return b; });
  centers.forEach((c, k) => {
    const m = pts.filter((_, i) => assign[i] === k);
    if (!m.length) return;
    const s = m.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]);
    const n = Math.hypot(...s);
    c[0] = s[0] / n; c[1] = s[1] / n; c[2] = s[2] / n;
  });
}
// seed cell per zone = the member shore cell closest to the centre
let seeds = centers.map((c, k) => {
  let best = -1, bd = Infinity;
  coastalIds.forEach((id, i) => { if (assign[i] !== k) return; const d = d2(pts[i], c); if (d < bd) { bd = d; best = shore.get(id); } });
  return best;
}).filter((s) => s >= 0);

// one zone per enclosed sea (Caspian, ice-locked Arctic gulfs): drop extra seeds in small
// water bodies so they are not split
const comp = new Int32Array(W * H).fill(-1);
const compSize = [];
for (let i = 0; i < W * H; i++) {
  if (!water(i) || comp[i] >= 0) continue;
  const id = compSize.length;
  let n = 0;
  const stack = [i];
  comp[i] = id;
  while (stack.length) {
    const c = stack.pop();
    n++;
    for (const j of neighbours(c)) if (water(j) && comp[j] < 0) { comp[j] = id; stack.push(j); }
  }
  compSize.push(n);
}
const totalWater = compSize.reduce((a, b) => a + b, 0);
const seededComp = new Set();
const kept = [];
for (const sd of seeds) {
  const c = comp[sd];
  if (compSize[c] < totalWater * 0.02) {
    if (seededComp.has(c)) continue;
    seededComp.add(c);
  }
  kept.push(sd);
}
seeds.length = 0;
seeds.push(...kept);

// ---------------------------------------------------------------- 3. water partition
const zoneOf = new Int32Array(W * H).fill(-1);
const dist = new Float64Array(W * H).fill(Infinity);
// binary heap
const heap = [];
const push = (d, i, z) => { heap.push([d, i, z]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
seeds.forEach((s, z) => { dist[s] = 0; push(0, s, z); });
t0 = Date.now();
while (heap.length) {
  const [d, i, z] = pop();
  if (d > dist[i]) continue;
  zoneOf[i] = z;
  for (const j of neighbours(i)) {
    if (!water(j)) continue;
    const nd = d + cellKm(i, j);
    if (nd < dist[j]) { dist[j] = nd; push(nd, j, z); }
  }
}
console.log(`partition ${((Date.now() - t0) / 1000).toFixed(1)}s`);

// ---------------------------------------------------------------- 4. zones, neighbours, names
const Z = seeds.length;
const acc = Array.from({ length: Z }, () => [0, 0, 0, 0]);
const touch = Array.from({ length: Z }, () => new Set());
for (let i = 0; i < W * H; i++) {
  const z = zoneOf[i];
  if (z < 0) continue;
  // weight cells near the coast more so the anchor sits where ships actually sail
  const v = vec(i), w = Math.cos(cellLat(Math.floor(i / W)) * rad) / (1 + dist[i] / 500);
  acc[z][0] += v[0] * w; acc[z][1] += v[1] * w; acc[z][2] += v[2] * w; acc[z][3] += w;
  for (const j of neighbours(i)) { const o = zoneOf[j]; if (o >= 0 && o !== z) touch[z].add(o); }
}
// anchor: the zone's water cell nearest its (coast-weighted) centre, so markers sit at sea
const anchor = acc.map(([x, y, zz], z) => {
  const n = Math.hypot(x, y, zz) || 1;
  const c = [x / n, y / n, zz / n];
  let best = seeds[z], bd = Infinity;
  for (let i = 0; i < W * H; i++) {
    if (zoneOf[i] !== z || dist[i] < 60) continue; // keep off the coast line itself
    const d = d2(vec(i), c);
    if (d < bd) { bd = d; best = i; }
  }
  return [+cellLon(best % W).toFixed(2), +cellLat(Math.floor(best / W)).toFixed(2)];
});

// name: majority vote over sampled cells of the zone, each cell voting for the most specific
// (highest scalerank) marine polygon containing it
const named = marine.features.filter((f) => f.properties.name).map((f) => ({ f, b: geoBounds(f), name: tidy(f.properties.name), rank: f.properties.scalerank }));
function tidy(n) { return n === n.toUpperCase() ? n.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : n.replace(/'$/, ''); }
const inBounds = ([lon, lat], [[w, s], [e, n]]) => lat >= s && lat <= n && (w <= e ? lon >= w && lon <= e : lon >= w || lon <= e);
function nameAt(pt) {
  let best = null;
  for (const m of named) if (inBounds(pt, m.b) && (!best || m.rank > best.rank) && geoContains(m.f, pt)) best = m;
  return best?.name ?? null;
}
// voters: the shore cells of the zone's coastal states (where ships actually sail), else its water
const shoreZone = new Map(coastalIds.map((id) => [id, zoneOf[shore.get(id)]]));
const cellsOf = Array.from({ length: seeds.length }, () => []);
for (let i = 0; i < W * H; i++) if (zoneOf[i] >= 0) cellsOf[zoneOf[i]].push(i);
const voters = cellsOf.map((cells, z) => {
  const own = coastalIds.filter((id) => shoreZone.get(id) === z).map((id) => shore.get(id));
  if (own.length) return own;
  const step = Math.max(1, Math.floor(cells.length / 60));
  return cells.filter((_, k) => k % step === 0);
});
const rawNames = voters.map((cells, z) => {
  const votes = {};
  for (const i of cells) {
    const n = nameAt([cellLon(i % W), cellLat(Math.floor(i / W))]);
    if (n) votes[n] = (votes[n] ?? 0) + 1;
  }
  const top = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : 'Open Sea';
});
// duplicates: "<sea> off <country with most shore in the zone>", else a compass qualifier
const states = read('src/data/states.json');
const countries = read('src/data/countries.json');
const ownerOf = Object.fromEntries(states.map((st) => [st.id, st.owner]));
function offWhom(z) {
  const n = {};
  for (const id of coastalIds) if (shoreZone.get(id) === z && ownerOf[id]) n[ownerOf[id]] = (n[ownerOf[id]] ?? 0) + 1;
  const top = Object.entries(n).sort((a, b) => b[1] - a[1])[0];
  return top ? countries[top[0]]?.name : null;
}
const groups = {};
rawNames.forEach((n, z) => (groups[n] ??= []).push(z));
const names = rawNames.slice();
for (const [n, members] of Object.entries(groups)) {
  if (members.length === 1) continue;
  const mean = (k) => members.reduce((a, z) => a + anchor[z][k], 0) / members.length;
  const [mx, my] = [mean(0), mean(1)];
  for (const z of members) {
    const off = offWhom(z);
    if (off) { names[z] = `${n} off ${off}`; continue; }
    const dx = anchor[z][0] - mx, dy = anchor[z][1] - my;
    const ns = dy > 4 ? 'North' : dy < -4 ? 'South' : '';
    const ew = dx > 6 ? 'East' : dx < -6 ? 'West' : '';
    names[z] = `${n} (${[ns, ew.toLowerCase()].filter(Boolean).join('-') || 'central'})`.replace('(-', '(');
  }
}
const seenName = {};
names.forEach((n, z) => { seenName[n] = (seenName[n] ?? 0) + 1; if (seenName[n] > 1) names[z] = `${n} ${seenName[n]}`; });

const zones = seeds.map((_, z) => ({
  id: `sea_${String(z + 1).padStart(2, '0')}`,
  name: names[z],
  anchor: anchor[z],
  neighbours: Object.fromEntries([...touch[z]].sort((a, b) => a - b).map((o) => [`sea_${String(o + 1).padStart(2, '0')}`, Math.round(distKm(anchor[z], anchor[o]))])),
}));
// a shore cell in a water pocket the partition never reached (narrow gulfs, lagoons):
// take the nearest zoned water within POCKET_KM; beyond that the state stays landlocked (Aral)
const POCKET_KM = 220;
function zoneNear(cell) {
  if (zoneOf[cell] >= 0) return zoneOf[cell];
  const p = [cellLon(cell % W), cellLat(Math.floor(cell / W))];
  const [cx, cy] = cellOf(p);
  let best = -1, bd = POCKET_KM;
  const r = Math.ceil(POCKET_KM / 55 / RES) + 1;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const y = cy + dy;
    if (y < 0 || y >= H) continue;
    const i = y * W + ((cx + dx + W) % W);
    if (zoneOf[i] < 0) continue;
    const d = distKm(p, [cellLon(i % W), cellLat(y)]);
    if (d < bd) { bd = d; best = zoneOf[i]; }
  }
  return best;
}
const stateZone = {};
for (const id of coastalIds) { const z = zoneNear(shore.get(id)); if (z >= 0) stateZone[id] = zones[z].id; }

fs.writeFileSync(new URL('src/data/seas.json', root), JSON.stringify({ zones, stateZone }));
const iso = zones.filter((z) => !Object.keys(z.neighbours).length).length;
console.log(`zones ${zones.length}, isolated ${iso}, states with a zone ${Object.keys(stateZone).length}`);
console.log(zones.slice(0, 90).map((z) => z.name).join(' | '));
