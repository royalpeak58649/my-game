import { describe, expect, it } from 'vitest';
import { addDays, formatDate, type GameDate } from './date';

describe('addDays', () => {
  it('advances within a month', () => {
    expect(addDays({ year: 1836, month: 1, day: 1 }, 7)).toEqual<GameDate>({
      year: 1836,
      month: 1,
      day: 8,
    });
  });

  it('crosses February in a leap year', () => {
    expect(addDays({ year: 1836, month: 2, day: 26 }, 7)).toEqual<GameDate>({
      year: 1836,
      month: 3,
      day: 4,
    });
  });

  it('crosses a year boundary', () => {
    expect(addDays({ year: 1836, month: 12, day: 28 }, 7)).toEqual<GameDate>({
      year: 1837,
      month: 1,
      day: 4,
    });
  });

  it('treats 1900 as a common year', () => {
    expect(addDays({ year: 1900, month: 2, day: 28 }, 1)).toEqual<GameDate>({
      year: 1900,
      month: 3,
      day: 1,
    });
  });
});

describe('formatDate', () => {
  it('formats as day month year', () => {
    expect(formatDate({ year: 1836, month: 1, day: 1 })).toBe('1 January 1836');
  });
});
