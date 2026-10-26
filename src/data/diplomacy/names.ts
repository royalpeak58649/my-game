// Fictional general names, generated deterministically from syllables (no real people).
const FIRST = ['Adrian', 'Basil', 'Casimir', 'Dorian', 'Emil', 'Felix', 'Gaspard', 'Hector', 'Ivo', 'Julian',
  'Konrad', 'Leon', 'Marius', 'Nikolai', 'Otto', 'Pavel', 'Quentin', 'Rolf', 'Silas', 'Tobias', 'Urban', 'Viktor', 'Wendel', 'Yusuf'];
const LAST_A = ['Ar', 'Bel', 'Cor', 'Dal', 'Ev', 'Fal', 'Gor', 'Hal', 'Ister', 'Kal', 'Lor', 'Mar', 'Nor', 'Os', 'Pel', 'Rav', 'Sal', 'Tor', 'Val', 'Wes'];
const LAST_B = ['ain', 'brook', 'court', 'dane', 'enby', 'feld', 'grave', 'holm', 'ick', 'more', 'ow', 'stead', 'ton', 'vane', 'wick'];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function generalName(seed: string): string {
  const h = hash(seed);
  const f = FIRST[h % FIRST.length] as string;
  const a = LAST_A[(h >>> 8) % LAST_A.length] as string;
  const b = LAST_B[(h >>> 16) % LAST_B.length] as string;
  return `${f} ${a}${b}`;
}

/** Deterministic skill 1..5 (most generals are 2–3). */
export function generalSkill(seed: string): number {
  const r = (hash(seed + ':skill') % 100) / 100;
  return r < 0.1 ? 1 : r < 0.45 ? 2 : r < 0.8 ? 3 : r < 0.95 ? 4 : 5;
}

export function generalTrait(seed: string): 'offensive' | 'defensive' | 'balanced' {
  const r = hash(seed + ':trait') % 3;
  return r === 0 ? 'offensive' : r === 1 ? 'defensive' : 'balanced';
}

export { hash as nameHash };
