// Builds per-state economic data for 1836: population, coastal flag, urban capacity and
// natural resources.
//
//   npm run data:economy      (run after `npm run data`)
//
// Inputs:  src/data/states.json, src/data/world.topo.json
//          data-raw/ne_10m_populated_places_simple.geojson (downloaded if missing)
//          data-raw/ne_50m_admin_0_countries.geojson      (downloaded if missing)
//          scripts/population-1836.mjs
// Output:  src/data/stateEconomy.json  { [stateId]: { population, coastal, urbanCap, resources } }

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoBounds, geoContains } from 'd3-geo';
import { feature } from 'topojson-client';
import { POP_1836, DEFAULT_DENSITY, STATE_POP } from './population-1836.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raw = (f) => path.join(root, 'data-raw', f);
const data = (f) => path.join(root, 'src', 'data', f);
const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';

async function ensure(file) {
  if (fs.existsSync(raw(file))) return;
  fs.mkdirSync(path.dirname(raw(file)), { recursive: true });
  console.log(`Downloading ${file}…`);
  const res = await fetch(NE + file);
  if (!res.ok) throw new Error(`Download failed ${file}: ${res.status}`);
  fs.writeFileSync(raw(file), Buffer.from(await res.arrayBuffer()));
}

// ---------------------------------------------------------------- helpers
const R = 6371;
function distKm([lon1, lat1], [lon2, lat2]) {
  const r = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296; // [0,1)
}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// Major historical coal and iron deposits: [lon, lat, levels].
// Each is given to the nearest state (by centroid) within 400 km.
const COAL = [
  [7.2, 51.5, 20], [7.0, 49.3, 6], [18.7, 50.3, 15], [4.4, 50.4, 10], [3.0, 50.4, 8], [6.2, 49.1, 5],
  [-1.5, 53.8, 20], [-1.6, 55.0, 10], [-3.4, 51.7, 15], [-4.0, 55.8, 10], [-77.5, 41.0, 20],
  [-81.0, 39.5, 10], [38.0, 48.0, 12], [12.9, 50.8, 5], [13.8, 50.6, 6], [112.5, 37.8, 15],
  [123.5, 41.5, 6], [87.1, 23.6, 6], [130.6, 33.6, 5], [-5.8, 43.3, 4], [86.5, 54.0, 8],
  [151.6, -32.9, 4], [-60.2, 46.1, 3], [31.8, 41.4, 3], [-2.1, 52.6, 8],
];
const IRON = [
  [6.2, 49.1, 12], [15.0, 60.0, 10], [20.2, 67.8, 8], [60.0, 57.0, 12], [33.4, 47.9, 10],
  [-2.9, 43.3, 8], [-3.2, 54.5, 5], [-2.1, 52.6, 6], [-77.5, 41.0, 8], [-87.5, 46.5, 10],
  [8.0, 50.9, 5], [15.0, 47.4, 6], [18.7, 50.3, 4], [10.3, 42.8, 3], [115.0, 30.1, 5],
  [112.5, 37.8, 5], [-43.9, -19.9, 6], [85.5, 22.5, 6], [-1.5, 53.8, 4],
];

// Plantation crops: predicate on state facts -> crop present. Amount scales with population.
const CROPS = {
  cotton: (s) =>
    (s.adm0 === 'USA' && s.lat < 36.5 && s.lon > -100) || s.adm0 === 'EGY' ||
    (s.adm0 === 'IND' && s.lat < 26) || (s.adm0 === 'BRA' && s.lat > -12) ||
    ['UZB', 'TKM'].includes(s.adm0) || (s.adm0 === 'MEX' && s.lat < 24) || (s.adm0 === 'TUR' && s.lat < 38.5),
  sugar: (s) =>
    ['CUB', 'JAM', 'HTI', 'DOM', 'PRI', 'BRB', 'TTO', 'GLP', 'MTQ', 'MUS', 'GUY', 'SUR'].includes(s.adm0) ||
    (s.adm0 === 'BRA' && s.lat > -25) || (s.adm0 === 'IDN' && s.lon < 115) || (s.adm0 === 'IND' && s.lat < 28) ||
    s.adm0 === 'PHL' || (s.adm0 === 'USA' && s.lat < 31.5 && s.lon > -94 && s.lon < -89) || (s.adm0 === 'CHN' && s.lat < 25),
  coffee: (s) =>
    (s.adm0 === 'BRA' && s.lat < -15 && s.lat > -25 && s.lon > -50) || (s.adm0 === 'IDN' && s.lon < 115) ||
    ['LKA', 'VEN', 'CRI', 'GTM', 'YEM', 'HTI', 'CUB', 'ETH'].includes(s.adm0),
  tea: (s) => (s.adm0 === 'CHN' && s.lat > 22 && s.lat < 32 && s.lon > 105) || s.adm0 === 'JPN',
  tobacco: (s) =>
    (s.adm0 === 'USA' && s.lat > 35 && s.lat < 39.5 && s.lon > -88 && s.lon < -75) || s.adm0 === 'CUB' ||
    (s.adm0 === 'TUR' && s.lon < 36) || s.adm0 === 'PHL' || (s.adm0 === 'BRA' && s.lat > -15 && s.lat < -10),
  dye: (s) => (s.adm0 === 'IND' && s.lat > 21 && s.lat < 27.5 && s.lon > 82) || ['GTM', 'SLV'].includes(s.adm0),
  silk: (s) =>
    (s.adm0 === 'CHN' && s.lat < 33 && s.lon > 100) || s.adm0 === 'JPN' || (s.adm0 === 'ITA' && s.lat > 44) ||
    (s.adm0 === 'FRA' && s.lon > 3.5 && s.lat < 46) || (s.adm0 === 'IRN' && s.lat > 36 && s.lon > 48 && s.lon < 55) ||
    s.adm0 === 'LBN',
};

// 1836 settlement frontiers: modern cities would otherwise pull population into lands
// that were barely settled (the American West, Siberia, inland Australia…).
function frontier(adm0, [lon, lat]) {
  switch (adm0) {
    case 'USA': return lat < 31 && lon > -88 ? 0.05 : lon > -90 ? 1 : lon > -95 ? 0.5 : 0.02;
    case 'CAN': return lon > -80 ? 1 : 0.05;
    case 'AUS': return lon > 140 && lat < -28 ? 1 : 0.1;
    case 'BRA': return lon > -50 ? 1 : 0.2;
    case 'ARG': return lat > -36 ? 1 : 0.1;
    case 'RUS': return lon < 60 ? 1 : 0.15;
    case 'CHL': return lat > -38 ? 1 : 0.1;
    case 'CHN': return lon < 100 || lat > 40.5 ? 0.12 : 1;
    case 'MNG': case 'KAZ': return 0.6;
    default: return Math.abs(lat) > 60 ? 0.15 : 1;
  }
}

async function main() {
  await ensure('ne_10m_populated_places_simple.geojson');
  await ensure('ne_50m_admin_0_countries.geojson');
  const states = JSON.parse(fs.readFileSync(data('states.json'), 'utf8'));
  const topo = JSON.parse(fs.readFileSync(data('world.topo.json'), 'utf8'));
  const places = JSON.parse(fs.readFileSync(raw('ne_10m_populated_places_simple.geojson'), 'utf8')).features;
  const adm0s = JSON.parse(fs.readFileSync(raw('ne_50m_admin_0_countries.geojson'), 'utf8')).features;

  const continent = {};
  for (const f of adm0s) continent[f.properties.ADM0_A3] = f.properties.CONTINENT;

  // --- coastal: a state is coastal if one of its arcs is used by no other state
  const arcUse = new Map();
  const arcsOf = (g) => {
    const out = [];
    const walk = (a) => (Array.isArray(a) ? (typeof a[0] === 'number' ? a.forEach((i) => out.push(i < 0 ? ~i : i)) : a.forEach(walk)) : null);
    walk(g.arcs);
    return out;
  };
  const geoms = topo.objects.states.geometries;
  for (const g of geoms) for (const a of new Set(arcsOf(g))) arcUse.set(a, (arcUse.get(a) ?? 0) + 1);
  const coastal = new Set(geoms.filter((g) => arcsOf(g).some((a) => arcUse.get(a) === 1)).map((g) => String(g.id)));

  // --- city weight: sqrt of modern city populations, assigned to the nearest state of the same modern country
  const byAdm0 = new Map();
  for (const s of states) {
    if (!byAdm0.has(s.adm0)) byAdm0.set(s.adm0, []);
    byAdm0.get(s.adm0).push(s);
  }
  // Point-in-polygon against the game's state shapes (falls back to the nearest centroid
  // of the same modern country for points that miss every simplified polygon).
  const shapes = new Map();
  for (const f of feature(topo, topo.objects.states).features) {
    const [[w, so], [e, n]] = geoBounds(f);
    shapes.set(String(f.id), { f, w, so, e, n });
  }
  const cityW = new Map(states.map((s) => [s.id, 0]));
  for (const p of places) {
    const a = p.properties.adm0_a3;
    const cand = byAdm0.get(a);
    if (!cand) continue;
    const pt = [p.properties.longitude, p.properties.latitude];
    let hit = null;
    for (const s of cand) {
      const sh = shapes.get(s.id);
      if (!sh) continue;
      const inLon = sh.w <= sh.e ? pt[0] >= sh.w && pt[0] <= sh.e : pt[0] >= sh.w || pt[0] <= sh.e;
      if (inLon && pt[1] >= sh.so && pt[1] <= sh.n && geoContains(sh.f, pt)) { hit = s; break; }
    }
    if (!hit) {
      let bd = Infinity;
      for (const s of cand) { const d = distKm(pt, s.centroid); if (d < bd) { bd = d; hit = s; } }
      if (bd > 150) continue; // far-away miss: probably belongs to a dropped territory
    }
    cityW.set(hit.id, cityW.get(hit.id) + Math.sqrt(Math.max(0, p.properties.pop_max || 0)));
  }

  // --- population per state
  const pop = new Map();
  for (const [adm0, all] of byAdm0) {
    const fixed = all.filter((s) => STATE_POP[`${adm0}:${s.name}`] !== undefined);
    for (const s of fixed) pop.set(s.id, STATE_POP[`${adm0}:${s.name}`]);
    const ss = all.filter((s) => !fixed.includes(s));
    const fixedTotal = fixed.reduce((t, s) => t + pop.get(s.id), 0);
    const totalPop = POP_1836[adm0] !== undefined
      ? POP_1836[adm0] * 1e6 - fixedTotal
      : ss.reduce((t, s) => t + s.area * frontier(adm0, s.centroid), 0) * (DEFAULT_DENSITY[continent[adm0]] ?? 2);
    const fArea = ss.reduce((t, s) => t + Math.sqrt(s.area) * frontier(adm0, s.centroid), 0);
    const fCity = ss.reduce((t, s) => t + cityW.get(s.id) * frontier(adm0, s.centroid), 0);
    for (const s of ss) {
      const f = frontier(adm0, s.centroid);
      const areaShare = (Math.sqrt(s.area) * f) / (fArea || 1);
      const cityShare = fCity > 0 ? (cityW.get(s.id) * f) / fCity : areaShare;
      pop.set(s.id, (0.3 * areaShare + 0.7 * cityShare) * totalPop);
    }
    // renormalise after the latitude factor
    const sum = ss.reduce((t, s) => t + pop.get(s.id), 0);
    for (const s of ss) pop.set(s.id, Math.round((pop.get(s.id) / (sum || 1)) * totalPop / 100) * 100);
  }

  // --- resources
  const result = {};
  for (const s of states) {
    const [lon, lat] = s.centroid;
    const p = pop.get(s.id) ?? 0;
    const facts = { adm0: s.adm0, lon, lat, pop: p };
    const absLat = Math.abs(lat);
    const res = {};
    const habitable = absLat > 62 ? 0.1 : absLat > 55 ? 0.5 : 1;
    res.arable = Math.max(1, Math.round(p / 9000 + (s.area / 6000) * habitable));
    const forest = (absLat > 45 && absLat < 66) || absLat < 15 ? 1 : 0.3;
    const wood = Math.round(clamp((s.area / 12000) * forest, 0, 30));
    if (wood > 0) res.wood = wood;
    if (coastal.has(s.id)) res.fish = Math.round(clamp(2 + p / 600000, 1, 12));
    // small random deposits
    const big = s.area > 10000;
    if (big && hash(s.id + 'coal') < 0.12) res.coal = 1 + Math.floor(hash(s.id + 'c2') * 3);
    if (big && hash(s.id + 'iron') < 0.12) res.iron = 1 + Math.floor(hash(s.id + 'i2') * 3);
    for (const [crop, pred] of Object.entries(CROPS)) {
      if (pred(facts)) res[crop] = Math.round(clamp(2 + p / 100000, 2, 20));
    }
    result[s.id] = {
      population: p,
      coastal: coastal.has(s.id),
      urbanCap: Math.max(1, Math.round(p / 150000)),
      resources: res,
    };
  }
  // major deposits to nearest state
  for (const [list, key] of [[COAL, 'coal'], [IRON, 'iron']]) {
    for (const [lon, lat, n] of list) {
      let best = null, bd = Infinity;
      for (const s of states) { const d = distKm([lon, lat], s.centroid); if (d < bd) { bd = d; best = s; } }
      if (best && bd < 400) {
        const r = result[best.id].resources;
        r[key] = (r[key] ?? 0) + n;
      } else console.log(`warning: no state near ${key} deposit at ${lon},${lat}`);
    }
  }

  fs.writeFileSync(data('stateEconomy.json'), JSON.stringify(result));
  const world = [...pop.values()].reduce((a, b) => a + b, 0);
  console.log(`world population: ${(world / 1e6).toFixed(0)}M, coastal states: ${coastal.size}/${states.length}`);
  const byOwner = {};
  for (const s of states) if (s.owner) byOwner[s.owner] = (byOwner[s.owner] ?? 0) + pop.get(s.id);
  console.log(Object.entries(byOwner).sort((a, b) => b[1] - a[1]).slice(0, 25)
    .map(([t, v]) => `${t} ${(v / 1e6).toFixed(1)}M`).join(', '));
}

main().catch((e) => { console.error(e); process.exit(1); });
