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

// Komal↔shuddha alternate pairs for each swara that has a variant
const ALTERNATE: Record<string, string> = {
  re: 'Re', Re: 're',
  ga: 'Ga', Ga: 'ga',
  Ma: 'ma', ma: 'Ma',
  dha: 'Dha', Dha: 'dha',
  ni: 'Ni',  Ni: 'ni',
}

const SWARA_DESCRIPTION: Record<string, string> = {
  re: 'komal Re',  Re: 'shuddha Re',
  ga: 'komal Ga',  Ga: 'shuddha Ga',
  Ma: 'shuddha Ma', ma: 'tivra Ma',
  dha: 'komal Dha', Dha: 'shuddha Dha',
  ni: 'komal Ni',  Ni: 'shuddha Ni',
  Sa: 'Sa', Pa: 'Pa',
}

export type FeedbackKind = 'vadi' | 'samvadi' | 'correct' | 'wrong-variety' | 'varjya'

export interface SwaraFeedback {
  kind: FeedbackKind
  message: string
  hint?: string   // secondary guidance
}

/**
 * Returns grammar-aware feedback for a detected swara against a raga.
 * Returns null when aroha/avaroha are not yet loaded.
 */
export function getSwaraFeedback(
  note: string,
  aroha?: string[],
  avaroha?: string[],
  vadi?: string,
  samvadi?: string,
): SwaraFeedback | null {
  if (!aroha && !avaroha) return null
  const a = aroha ?? []
  const av = avaroha ?? []
  const bare = stripOctave(note)
  const allowed = new Set([...a, ...av].map(stripOctave))

  if (allowed.has(bare)) {
    const vadiBase = vadi ? stripOctave(vadi) : ''
    const samvadiBase = samvadi ? stripOctave(samvadi) : ''
    if (bare === vadiBase) {
      return { kind: 'vadi', message: `Vadi — ${SWARA_DESCRIPTION[bare] ?? bare}`, hint: 'King note. Dwell here.' }
    }
    if (bare === samvadiBase) {
      return { kind: 'samvadi', message: `Samvadi — ${SWARA_DESCRIPTION[bare] ?? bare}`, hint: 'Minister note. Let it ring.' }
    }
    return { kind: 'correct', message: `${SWARA_DESCRIPTION[bare] ?? bare} — in raga` }
  }

  // Check if the alternate variety is the correct one
  const alt = ALTERNATE[bare]
  if (alt && allowed.has(alt)) {
    const correct = SWARA_DESCRIPTION[alt] ?? alt
    const sung = SWARA_DESCRIPTION[bare] ?? bare
    return {
      kind: 'wrong-variety',
      message: `Use ${correct}`,
      hint: `You sang ${sung} — this raga uses ${correct}`,
    }
  }

  return { kind: 'varjya', message: `Varjya — avoid ${SWARA_DESCRIPTION[bare] ?? bare}`, hint: 'Not in this raga' }
}

