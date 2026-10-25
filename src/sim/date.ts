export interface GameDate { year: number; month: number; day: number; }
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'] as const;
export function isLeapYear(year: number): boolean { return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0; }
export function daysInMonth(year: number, month: number): number {
  switch (month) { case 2: return isLeapYear(year) ? 29 : 28; case 4: case 6: case 9: case 11: return 30; default: return 31; }
}
export function addDays(d: GameDate, n: number): GameDate {
  let year = d.year; let month = d.month; let day = d.day + n;
  while (day > daysInMonth(year, month)) { day -= daysInMonth(year, month); month += 1; if (month > 12) { month = 1; year += 1; } }
  while (day < 1) { month -= 1; if (month < 1) { month = 12; year -= 1; } day += daysInMonth(year, month); }
  return { year, month, day };
}
export function formatDate(d: GameDate): string { const name = MONTH_NAMES[d.month - 1] ?? ''; return `${d.day} ${name} ${d.year}`; }
