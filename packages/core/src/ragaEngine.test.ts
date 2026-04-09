import { describe, it, expect } from 'vitest';
import { RagaEngine } from './ragaEngine';
import { Raga } from './types';

describe('RagaEngine', () => {
  const mockRaga: Raga = {
    id: '1',
    name: 'Mayamalavagowla',
    thaat: 'Bhairav',
    aroha: ['S', 'r', 'G', 'm', 'P', 'd', 'N', "S'"],
    avaroha: ["S'", 'N', 'd', 'P', 'm', 'G', 'r', 'S'],
    vadi: 'S',
    samvadi: 'P',
    time_of_day: 'Morning',
    mood: 'Devotional',
    prahara: 1,
    semitones: [0, 1, 4, 5, 7, 8, 11, 12],
    hz_map: {} as any,
    verified: true,
    phrases: [
      { label: 'Sarali 1', sequence: ['S', 'r', 'G', 'm', 'P', 'd', 'N', "S'"] },
      { label: 'Characteristic', sequence: ['d', 'P', 'm', 'G'] }
    ]
  };

  it('detects phrases in a sequence', () => {
    const sequence = ['S', 'r', 'G', 'm', 'P', 'd', 'N', "S'"];
    const detected = RagaEngine.detectPhrases(sequence, mockRaga);
    expect(detected).toHaveLength(1);
    expect(detected[0].label).toBe('Sarali 1');
  });

  it('detects partial characteristic phrases', () => {
    const sequence = ['P', 'd', 'P', 'm', 'G', 'r', 'S'];
    const detected = RagaEngine.detectPhrases(sequence, mockRaga);
    expect(detected).toHaveLength(1);
    expect(detected[0].label).toBe('Characteristic');
  });

  it('validates a correct sequence', () => {
    const sequence = ['S', 'r', 'G', 'P'];
    expect(RagaEngine.isValidSequence(sequence, mockRaga)).toBe(true);
  });

  it('rejects an invalid sequence (note not in scale)', () => {
    const sequence = ['S', 'R', 'G']; // R is not in Mayamalavagowla (r is)
    expect(RagaEngine.isValidSequence(sequence, mockRaga)).toBe(false);
  });
});
