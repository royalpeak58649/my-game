import type { PairKey } from './types';

/** Order-independent key for a pair of countries. */
export function pairKey(a: string, b: string): PairKey {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function pairTags(key: PairKey): [string, string] {
  const [a, b] = key.split('|');
  return [a ?? '', b ?? ''];
}
