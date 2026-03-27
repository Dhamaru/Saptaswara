import { describe, it, expect } from 'vitest';
import { RagaEngine } from './ragaEngine';
import { Raga } from './types';

describe('RagaEngine', () => {
  const mockYaman: Partial<Raga> = {
    name: 'Yaman',
    hz_map: {
      'S': 261.63,
      'R': 293.66,
      'G': 329.63,
      'M': 369.99,
      'P': 392.00,
      'D': 440.00,
      'N': 493.88,
      "S'": 523.25
    } as any,
    aroha: ['S', 'R', 'G', 'M', 'P', 'D', 'N', "S'"] as any
  };

  it('should resolve note "G" in Yaman to 329.63 Hz', () => {
    const freq = RagaEngine.resolveNote('G', mockYaman as Raga);
    expect(freq).toBe(329.63);
  });

  it('should return 0 for notes not in the raga', () => {
    const freq = RagaEngine.resolveNote('g' as any, mockYaman as Raga);
    expect(freq).toBe(0);
  });
});
