// Number formatting helpers shared by the UI panels.
// All output is plain ASCII except the true minus sign used for negative deltas.

const MINUS = '\u2212';

/** Drops trailing zeros: 1.20 → "1.2", 3.00 → "3". */
function trimFixed(value: number, digits: number): string {
  const fixed = value.toFixed(digits);
  return fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed;
}

/** 812 → "812", 45_600 → "45.6k", 1_234_567 → "1.23M". */
export function formatCount(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const sign = n < 0 ? MINUS : '';
  const abs = Math.abs(n);
  if (abs < 1000) return `${sign}${Math.round(abs)}`;
  if (abs < 1_000_000) return `${sign}${trimFixed(abs / 1000, 1)}k`;
  if (abs < 1_000_000_000) return `${sign}${trimFixed(abs / 1_000_000, 2)}M`;
  return `${sign}${trimFixed(abs / 1_000_000_000, 2)}B`;
}

/** 1234 → "£1.2k", 812 → "£812", 0.4 → "£0.4". */
export function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const sign = n < 0 ? MINUS : '';
  const abs = Math.abs(n);
  if (abs < 1000) return `${sign}£${trimFixed(abs, abs < 10 ? 1 : 0)}`;
  if (abs < 1_000_000) return `${sign}£${trimFixed(abs / 1000, 1)}k`;
  if (abs < 1_000_000_000) return `${sign}£${trimFixed(abs / 1_000_000, 2)}M`;
  return `${sign}£${trimFixed(abs / 1_000_000_000, 2)}B`;
}

/** Signed money for deltas: "+£340", "−£1.2k", "£0". */
export function formatDelta(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const rounded = Math.abs(n) < 0.5 ? 0 : n;
  if (rounded === 0) return formatMoney(0);
  return `${rounded > 0 ? '+' : MINUS}${formatMoney(Math.abs(rounded))}`;
}

/** 0.123 → "12.3%", 0.5 → "50%". */
export function formatPercent(x: number): string {
  if (!Number.isFinite(x)) return '—';
  const pct = x * 100;
  const digits = Math.abs(pct) >= 10 ? 0 : 1;
  return `${trimFixed(pct, digits)}%`;
}
