import { Raga, Swara } from './types';

/**
 * RagaEngine - Musical logic for raga-bound operations
 */
export const RagaEngine = {
  /**
   * Resolves a swara name to its frequency in the context of a raga.
   * If hz_map is present, uses it. Otherwise calculates from hz_sa and semitones.
   */
  resolveNote(swara: string, raga: any): number {
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
    
    return 0;
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
  },
  /**
   * Returns phrases associated with the raga.
   */
  getPhrases(raga: Raga): { label: string; sequence: Swara[] }[] {
    return raga.phrases || [];
  },

  /**
   * Checks if a given sequence contains any known characteristic phrases of the raga.
   */
  detectPhrases(sequence: string[], raga: Raga): { label: string; offset: number }[] {
    const found: { label: string; offset: number }[] = [];
    const phrases = raga.phrases || [];
    
    const sSeq = sequence.join(',');
    phrases.forEach(p => {
      if (!Array.isArray(p.sequence) || p.sequence.length === 0) return;
      const pSeq = p.sequence.join(',');
      const index = sSeq.indexOf(pSeq);
      if (index !== -1) {
        found.push({ label: p.label, offset: index });
      }
    });
    
    return found;
  }
};
