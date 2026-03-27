import { Raga, Swara } from './types';

/**
 * RagaEngine - Musical logic for raga-bound operations
 */
export const RagaEngine = {
  /**
   * Resolves a swara name to its frequency in the context of a raga.
   * If hz_map is present, uses it. Otherwise calculates from hz_sa and semitones.
   */
  resolveNote(swara: string, raga: any): number | null {
    if (raga.hz_map && raga.hz_map[swara]) {
      return raga.hz_map[swara];
    }
    
    if (raga.notes && raga.semitones && raga.hz_sa) {
      const index = raga.notes.indexOf(swara);
      if (index !== -1) {
        const offset = raga.semitones[index];
        return raga.hz_sa * Math.pow(2, offset / 12);
      }
    }
    
    return null;
  },

  /**
   * Returns the list of available notes for a raga.
   */
  getRagaNotes(raga: any): string[] {
    return raga.notes || raga.aroha || [];
  },

  /**
   * Basic validation to check if a sequence of swaras fits the raga's scale.
   */
  isValidSequence(sequence: string[], raga: any): boolean {
    const scale = new Set([...(raga.notes || raga.aroha || []), ...(raga.avaroha || [])]);
    return sequence.every(s => scale.has(s));
  }
};
