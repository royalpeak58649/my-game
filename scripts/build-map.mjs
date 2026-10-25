// Builds the game's world map data from Natural Earth (public domain) admin-1 boundaries.
//
//   npm run data
//
// Inputs:  data-raw/ne_10m_admin_1_states_provinces.geojson (downloaded if missing)
//          scripts/ownership-1836.mjs (hand-authored 1836 owners)
// Outputs: src/data/world.topo.json  (TopoJSON, object "states", feature id = state id)
//          src/data/states.json      (state metadata)
//          src/data/countries.json   (country metadata)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoArea } from 'd3-geo';
import mapshaper from 'mapshaper';
import { COUNTRIES, DEFAULTS, OVERRIDES, DROP, COLORS } from './ownership-1836.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = path.join(root, 'data-raw');
const outDir = path.join(root, 'src', 'data');
const SRC = path.join(rawDir, 'ne_10m_admin_1_states_provinces.geojson');
const URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson';

const EARTH_R = 6371; // km
const STATE_SIZE = Number(process.env.STATE_SIZE ?? 75); // larger = fewer, bigger states: budget = sqrt(area km²) / STATE_SIZE
const KMEANS_ITERS = 25;

async function ensureSource() {
  if (fs.existsSync(SRC)) return;
  fs.mkdirSync(rawDir, { recursive: true });
  console.log('Downloading Natural Earth admin-1 (~40 MB)…');
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  fs.writeFileSync(SRC, Buffer.from(await res.arrayBuffer()));
}

function areaKm2(feature) {
  let a = geoArea(feature);
  if (a > 2 * Math.PI) a = 4 * Math.PI - a; // ring winding opposite to d3's convention
  return a * EARTH_R * EARTH_R;
}

// Deterministic weighted k-means on (lon, lat) with longitude scaled by latitude.
function cluster(units, k) {
  if (k >= units.length) return units.map((_, i) => i);
  const lat0 = units.reduce((s, u) => s + u.lat, 0) / units.length;
  const sx = Math.cos((lat0 * Math.PI) / 180);
  const pts = units.map((u) => [u.lon * sx, u.lat]);
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  // farthest-point initialisation starting from the largest unit
  let first = 0;
  units.forEach((u, i) => { if (u.area > units[first].area) first = i; });
  const centers = [pts[first].slice()];
  while (centers.length < k) {
    let best = -1, bestD = -1;
    pts.forEach((p, i) => {
      const d = Math.min(...centers.map((c) => d2(p, c))) * Math.sqrt(units[i].area + 1);
      if (d > bestD) { bestD = d; best = i; }
    });
    centers.push(pts[best].slice());
  }
  let assign = new Array(units.length).fill(0);
  for (let it = 0; it < KMEANS_ITERS; it++) {
    assign = pts.map((p) => {
      let bi = 0, bd = Infinity;
      centers.forEach((c, ci) => { const d = d2(p, c); if (d < bd) { bd = d; bi = ci; } });
      return bi;
    });
    centers.forEach((c, ci) => {
      let w = 0, x = 0, y = 0;
      pts.forEach((p, i) => {
        if (assign[i] !== ci) return;
        const wi = Math.sqrt(units[i].area + 1);
        w += wi; x += p[0] * wi; y += p[1] * wi;
      });
      if (w > 0) { c[0] = x / w; c[1] = y / w; }
    });
  }
  // compact cluster indices (drop empties)
  const remap = new Map();
  return assign.map((a) => { if (!remap.has(a)) remap.set(a, remap.size); return remap.get(a); });
}

function color(tag, i) {
  // original, muted palette: golden-angle hues, varied saturation/lightness
  const h = (i * 137.508 + 20) % 360;
  const s = 38 + ((i * 7) % 4) * 7;
  const l = 52 + ((i * 3) % 3) * 6;
  return hsl(h, s, l);
}
function hsl(h, s, l) {
  s /= 100; l /= 100;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

async function main() {
  await ensureSource();
  const fc = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  const warnings = [];
  const usedOverrides = new Set();

  const units = [];
  for (const f of fc.features) {
    const p = f.properties;
    const adm0 = p.adm0_a3;
    if (DROP.includes(adm0)) continue;
    const name = p.name || p.name_en || p.adm1_code;
    const key = `${adm0}:${name}`;
    let owner;
    if (key in OVERRIDES) { owner = OVERRIDES[key]; usedOverrides.add(key); }
    else if (adm0 in DEFAULTS) owner = DEFAULTS[adm0];
    else { warnings.push(`no default owner for ${adm0} (${p.admin})`); owner = null; }
    if (owner && !COUNTRIES[owner]) { warnings.push(`unknown tag ${owner} for ${key}`); owner = null; }
    units.push({
      code: p.adm1_code, adm0, name, region: p.region || '', owner,
      lon: p.longitude, lat: p.latitude, area: areaKm2(f), feature: f,
    });
  }
  for (const k of Object.keys(OVERRIDES)) if (!usedOverrides.has(k)) warnings.push(`override matched nothing: ${k}`);

  // group by modern country + 1836 owner, then merge into game states
  const groups = new Map();
  for (const u of units) {
    const g = `${u.adm0}|${u.owner ?? '-'}`;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(u);
  }
  const states = [];
  const unitState = new Map();
  for (const [g, us] of [...groups.entries()].sort()) {
    us.sort((a, b) => a.code.localeCompare(b.code));
    const total = us.reduce((s, u) => s + u.area, 0);
    const budget = Math.max(1, Math.min(us.length, Math.round(Math.sqrt(total) / STATE_SIZE)));
    const assign = cluster(us, budget);
    const nClusters = Math.max(...assign) + 1;
    for (let c = 0; c < nClusters; c++) {
      const members = us.filter((_, i) => assign[i] === c);
      const largest = members.reduce((a, b) => (b.area > a.area ? b : a));
      const regions = new Set(members.map((m) => m.region));
      const name = members.length > 2 && regions.size === 1 && largest.region ? largest.region : largest.name;
      const area = members.reduce((s, m) => s + m.area, 0);
      const lon = members.reduce((s, m) => s + m.lon * m.area, 0) / (area || 1);
      const lat = members.reduce((s, m) => s + m.lat * m.area, 0) / (area || 1);
      const id = `${g.split('|')[0]}_${String(states.filter((s) => s.adm0 === largest.adm0).length + 1).padStart(2, '0')}`;
      states.push({
        id, name, owner: largest.owner, adm0: largest.adm0,
        area: Math.round(area), centroid: [+lon.toFixed(3), +lat.toFixed(3)],
        members: members.map((m) => m.code),
      });
      for (const m of members) unitState.set(m.code, id);
    }
  }

  // countries + capitals
  const countries = {};
  Object.entries(COUNTRIES).forEach(([tag, [name, capital, col]], i) => {
    const [cAdm0, cName] = capital.split(/:(.*)/s);
    const unit = units.find((u) => u.adm0 === cAdm0 && u.name === cName);
    let capId = unit ? unitState.get(unit.code) : undefined;
    const owned = states.filter((s) => s.owner === tag);
    if (!owned.length) { warnings.push(`country ${tag} owns no states`); return; }
    if (!capId || states.find((s) => s.id === capId)?.owner !== tag) {
      warnings.push(`capital for ${tag} (${capital}) not found or not owned; using largest state`);
      capId = owned.reduce((a, b) => (b.area > a.area ? b : a)).id;
    }
    countries[tag] = { tag, name, color: col ?? COLORS[tag] ?? color(tag, i), capital: capId };
  });

  // geometry: slim features -> topology -> simplify -> dissolve by state id
  const slim = {
    type: 'FeatureCollection',
    features: units.map((u) => ({ type: 'Feature', properties: { sid: unitState.get(u.code) }, geometry: u.feature.geometry })),
  };
  const out = await mapshaper.applyCommands(
    '-i in.json -simplify 4% weighted keep-shapes -dissolve sid -rename-layers states -o out.json format=topojson quantization=100000 id-field=sid',
    { 'in.json': slim },
  );
  const topoKey = Object.keys(out)[0];

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'world.topo.json'), out[topoKey]);
  fs.writeFileSync(path.join(outDir, 'states.json'), JSON.stringify(states.map(({ members, ...s }) => s)));
  fs.writeFileSync(path.join(outDir, 'countries.json'), JSON.stringify(countries, null, 1));

  const size = (f) => (fs.statSync(path.join(outDir, f)).size / 1e6).toFixed(2) + ' MB';
  console.log(`admin-1 units: ${units.length}, states: ${states.length}, countries: ${Object.keys(countries).length}`);
  console.log(`decentralized states: ${states.filter((s) => !s.owner).length}`);
  console.log(`world.topo.json ${size('world.topo.json')}, states.json ${size('states.json')}`);
  if (warnings.length) console.log(`\n${warnings.length} warnings:\n  ` + warnings.join('\n  '));
}

main().catch((e) => { console.error(e); process.exit(1); });
