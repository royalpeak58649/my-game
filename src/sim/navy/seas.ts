// Sea zones and sea lanes (src/data/seas.json, built by scripts/build-seas.mjs).

import SEAS_JSON from '../../data/seas.json';

export interface SeaZone {
  id: string;
  name: string;
  /** [lon, lat] of the zone's centre of water (map marker position). */
  anchor: [number, number];
  /** zone id -> lane length in km */
  neighbours: Record<string, number>;
}

interface SeasData {
  zones: SeaZone[];
  /** coastal state id -> zone id */
  stateZone: Record<string, string>;
}

const SEAS = SEAS_JSON as unknown as SeasData;

export const SEA_ZONES: readonly SeaZone[] = SEAS.zones;
const BY_ID = new Map(SEAS.zones.map((z) => [z.id, z]));

export function seaZone(id: string): SeaZone | undefined {
  return BY_ID.get(id);
}

/** Sea zone a coastal state opens onto, or null for landlocked states. */
export function zoneOfState(stateId: string): string | null {
  return SEAS.stateZone[stateId] ?? null;
}

/** Great-circle distance in km between two [lon, lat] points. */
export function distanceKm(a: readonly [number, number], b: readonly [number, number]): number {
  const rad = Math.PI / 180;
  const h = Math.sin(((b[1] - a[1]) * rad) / 2) ** 2
    + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(((b[0] - a[0]) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(Math.min(1, h)));
}

/**
 * Shortest sea path from any of `from` to `to` (Dijkstra over sea lanes). Returns the path
 * (zone ids, start to end) and its length, or null when the seas are not connected (Caspian).
 */
export function seaPath(from: readonly string[], to: string): { path: string[]; km: number } | null {
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const open: string[] = [];
  for (const z of [...new Set(from)].sort()) {
    if (!BY_ID.has(z)) continue;
    dist.set(z, 0);
    prev.set(z, null);
    open.push(z);
  }
  const done = new Set<string>();
  while (open.length > 0) {
    // ~90 zones: a linear scan is fast enough and keeps ties deterministic
    let bi = 0;
    for (let i = 1; i < open.length; i++) {
      const a = dist.get(open[i] as string) as number;
      const b = dist.get(open[bi] as string) as number;
      if (a < b || (a === b && (open[i] as string) < (open[bi] as string))) bi = i;
    }
    const z = open.splice(bi, 1)[0] as string;
    if (done.has(z)) continue;
    done.add(z);
    if (z === to) break;
    const d = dist.get(z) as number;
    for (const [n, km] of Object.entries(BY_ID.get(z)?.neighbours ?? {})) {
      const nd = d + km;
      if (nd < (dist.get(n) ?? Infinity)) {
        dist.set(n, nd);
        prev.set(n, z);
        open.push(n);
      }
    }
  }
  if (!done.has(to)) return null;
  const path: string[] = [];
  for (let z: string | null | undefined = to; z; z = prev.get(z)) path.unshift(z);
  return { path, km: Math.round(dist.get(to) ?? 0) };
}
