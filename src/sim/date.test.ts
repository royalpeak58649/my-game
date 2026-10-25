import { describe, expect, it } from 'vitest';
import { addDays, formatDate } from './date';
describe('addDays', () => {
  it('within month', () => expect(addDays({ year: 1836, month: 1, day: 1 }, 7)).toEqual({ year: 1836, month: 1, day: 8 }));
  it('leap Feb', () => expect(addDays({ year: 1836, month: 2, day: 26 }, 7)).toEqual({ year: 1836, month: 3, day: 4 }));
  it('year boundary', () => expect(addDays({ year: 1836, month: 12, day: 28 }, 7)).toEqual({ year: 1837, month: 1, day: 4 }));
  it('1900 common', () => expect(addDays({ year: 1900, month: 2, day: 28 }, 1)).toEqual({ year: 1900, month: 3, day: 1 }));
});
describe('formatDate', () => { it('fmt', () => expect(formatDate({ year: 1836, month: 1, day: 1 })).toBe('1 January 1836')); });
