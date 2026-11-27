import { describe, it, expect } from 'vitest';
import { diagnosePracticeSession, PracticeSessionStats } from './practiceFeedback';

const baseStats = (overrides: Partial<PracticeSessionStats> = {}): PracticeSessionStats => ({
  total: 10,
  correct: 10,
  wrongVariety: 0,
  varjya: 0,
  vadiHits: 3,
  noteCounts: { S: 3, R: 2, G: 2, m: 3 },
  ...overrides,
});

describe('diagnosePracticeSession', () => {
  it('reports no notes when nothing was detected', () => {
    const result = diagnosePracticeSession(baseStats({ total: 0, correct: 0, noteCounts: {} }));

    expect(result.score).toBe(0);
    expect(result.headline).toBe('No notes detected');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].code).toBe('no-notes');
    expect(result.items[0].severity).toBe('high');
  });

  it('celebrates a high-scoring session', () => {
    const result = diagnosePracticeSession(baseStats(), { name: 'Yaman', vadi: 'G' });

    expect(result.score).toBe(100);
    expect(result.items.map(item => item.code)).toContain('strong-session');
    expect(result.items.find(item => item.code === 'strong-session')?.severity).toBe('positive');
    expect(result.items.some(item => item.severity === 'high')).toBe(false);
  });

  it('flags varjya swaras as a high-severity issue', () => {
    const result = diagnosePracticeSession(baseStats({ varjya: 2 }), {
      name: 'Bhupali',
      varjyaSwaras: ['r', 'd'],
    });

    const item = result.items.find(entry => entry.code === 'varjya');
    expect(item?.severity).toBe('high');
    expect(item?.message).toMatch(/varjya/i);
    expect(item?.hint).toMatch(/r, d/);
  });

  it('flags wrong komal/shuddha variety as a high-severity issue', () => {
    const result = diagnosePracticeSession(baseStats({ wrongVariety: 1 }), { name: 'Yaman' });

    const item = result.items.find(entry => entry.code === 'wrong-variety');
    expect(item?.severity).toBe('high');
    expect(item?.hint).toMatch(/komal.*shuddha|shuddha.*komal/i);
  });

  it('flags a missing vadi when there are enough notes', () => {
    const result = diagnosePracticeSession(baseStats({ vadiHits: 0 }), {
      name: 'Yaman',
      vadi: 'G',
    });

    const item = result.items.find(entry => entry.code === 'vadi-missing');
    expect(item?.severity).toBe('medium');
    expect(item?.message).toMatch(/G/);
  });

  it('flags low swara coverage for longer sessions', () => {
    const result = diagnosePracticeSession(
      baseStats({ total: 8, correct: 8, noteCounts: { S: 6, R: 2 } })
    );

    const item = result.items.find(entry => entry.code === 'coverage');
    expect(item?.severity).toBe('low');
    expect(item?.message).toMatch(/2 distinct swaras/);
  });
});
