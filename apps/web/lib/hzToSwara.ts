// Sa = C4 = 261.63 Hz (equal temperament reference)
const SA_HZ = 261.63

// Chromatic swara names in semitone order (0 = Sa)
export const SWARA_NAMES = ['Sa', 're', 'Re', 'ga', 'Ga', 'Ma', 'ma', 'Pa', 'dha', 'Dha', 'ni', 'Ni'] as const
export type SwaraName = typeof SWARA_NAMES[number]

export interface SwaraResult {
  note: SwaraName    // e.g. 'Ga'
  octave: 3 | 4 | 5 // 3=Mandra, 4=Madhya, 5=Taar
  cents: number      // deviation from equal temperament (-50 to +50)
  semitone: number   // 0-11 chromatic index
}

/**
 * Converts a frequency in Hz to the nearest swara name, octave, and cents deviation.
 * Returns null if hz is out of playable range (roughly C2–C7).
 */
export function hzToSwara(hz: number): SwaraResult | null {
  if (hz < 65 || hz > 2093) return null   // below C2 or above C7

  // Number of semitones above C4 (Sa, Madhya)
  const semitonesFromSa4 = 12 * Math.log2(hz / SA_HZ)
  const rounded = Math.round(semitonesFromSa4)
  const cents = Math.round((semitonesFromSa4 - rounded) * 100)

  // Octave offset from Madhya (octave 4)
  const octaveOffset = Math.floor(rounded / 12)
  const semitone = ((rounded % 12) + 12) % 12  // 0-11, always positive

  // Clamp to supported octaves (3, 4, 5)
  const rawOctave = 4 + octaveOffset
  if (rawOctave < 3 || rawOctave > 5) return null

  return {
    note: SWARA_NAMES[semitone],
    octave: rawOctave as 3 | 4 | 5,
    cents,
    semitone,
  }
}

/** Returns a display string like "Ga₄" or "re₃" */
export function swaraDisplay(result: SwaraResult): string {
  const sub = result.octave === 3 ? '₃' : result.octave === 5 ? '₅' : ''
  return `${result.note}${sub}`
}

/** Tuning quality indicator */
export function tuningLabel(cents: number): 'perfect' | 'close' | 'off' {
  const abs = Math.abs(cents)
  if (abs <= 10) return 'perfect'
  if (abs <= 25) return 'close'
  return 'off'
}
