export * from './types';
export * from './ragaEngine';

/**
 * Utility to calculate frequency from a base root Sa (Hz) and semitone offset
 */
export function calculateFrequency(baseSa: number, semitoneOffset: number): number {
  return baseSa * Math.pow(2, semitoneOffset / 12);
}

/**
 * Maps a list of swaras to their frequencies based on a Raga's hz_map
 */
export function getFrequenciesForScale(hzMap: Record<string, number>, scale: string[]): number[] {
  return scale.map(swara => hzMap[swara] || 0);
}
