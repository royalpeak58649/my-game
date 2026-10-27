import { describe, expect, it } from 'vitest';
import { translateText } from './i18n';

describe('UI translations', () => {
  it('translates core labels into every supported language', () => {
    expect(translateText('Market', 'ko')).toBe('시장');
    expect(translateText('Market', 'ja')).toBe('市場');
    expect(translateText('Market', 'zh')).toBe('市场');
    expect(translateText('Load Game', 'ko')).toBe('게임 불러오기');
  });

  it('keeps English and unknown proper names unchanged', () => {
    expect(translateText('Market', 'en')).toBe('Market');
    expect(translateText('Joseon', 'ko')).toBe('Joseon');
  });

  it('localises dates and dynamic country panel headings', () => {
    expect(translateText('1 January 1836', 'ko')).toBe('1836년 1월 1일');
    expect(translateText('France Market', 'ja')).toBe('Franceの市場');
    expect(translateText('Qing Navy', 'zh')).toBe('Qing 海军');
  });

  it('localises dynamic counts and status messages', () => {
    expect(translateText('12 states', 'ko')).toBe('12개 주');
    expect(translateText('Construction 8/wk', 'ja')).toBe('建設 8/週');
    expect(translateText('At war (2)', 'zh')).toBe('战争中 (2)');
  });
});
