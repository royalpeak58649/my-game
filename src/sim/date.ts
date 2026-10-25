export interface GameDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** Gregorian leap year rule. */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Number of days in the given month (1-12) of the given year. */
export function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

/** Returns a new date advanced by `n` days (n may be negative). */
export function addDays(d: GameDate, n: number): GameDate {
  let year = d.year;
  let month = d.month;
  let day = d.day + n;

  while (day > daysInMonth(year, month)) {
    day -= daysInMonth(year, month);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  while (day < 1) {
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    day += daysInMonth(year, month);
  }

  return { year, month, day };
}

/** Formats a date as e.g. "1 January 1836". */
export function formatDate(d: GameDate): string {
  const name = MONTH_NAMES[d.month - 1] ?? '';
  return `${d.day} ${name} ${d.year}`;
}
