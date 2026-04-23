// All 12 swara names in standard Saptaswara notation
const ALL_SWARAS = ['Sa', 're', 'Re', 'ga', 'Ga', 'Ma', 'ma', 'Pa', 'dha', 'Dha', 'ni', 'Ni'] as const

/** Strip octave markers: leading `.` or `,` (lower), trailing `'` or `^` (upper), or trailing digits (e.g. Sa4) */
export function stripOctave(s: string): string {
  return s.replace(/^[.,]+/, '').replace(/['^]+$/, '').replace(/\d+$/, '')
}


/**
 * Returns the set of swaras that are forbidden (varjya) in a given raga.
 * Compares against the union of all notes appearing in aroha + avaroha.
 */
export function getVarjyaNotes(aroha: string[], avaroha: string[]): Set<string> {
  const allowed = new Set([...aroha, ...avaroha].map(stripOctave))
  return new Set(ALL_SWARAS.filter(s => !allowed.has(s)))
}

/**
 * Returns true if a note label is varjya (not in this raga's allowed set).
 * Safe to call with undefined aroha/avaroha — returns false so no false positives.
 */
export function isVarjya(note: string, aroha?: string[], avaroha?: string[]): boolean {
  if (!aroha && !avaroha) return false
  const varjyaSet = getVarjyaNotes(aroha ?? [], avaroha ?? [])
  return varjyaSet.has(stripOctave(note))
}

