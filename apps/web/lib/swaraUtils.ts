/**
 * Swara type detection and display helpers.
 *
 * The canonical swara naming convention used throughout the codebase:
 *   lowercase first letter = komal (flat): re, ga, dha, ni
 *   'ma' (lowercase m)     = tivra Ma (the only sharp note)
 *   Uppercase first letter = shuddha (natural): Re, Ga, Ma, Dha, Ni
 *   Sa, Pa               = achala (immovable — no variants)
 */

export type SwaraType = 'komal' | 'tivra' | 'shuddha' | 'achala'

// Complete map from every canonical/shorthand form to its type
const SWARA_TYPE_MAP: Record<string, SwaraType> = {
  // Achala (Sa and Pa — immovable, no variants)
  'Sa': 'achala', 's': 'achala', 'S': 'achala', 'sa': 'achala',
  'Pa': 'achala', 'p': 'achala', 'P': 'achala', 'pa': 'achala',

  // Komal (flat) — lowercase abbreviation
  're': 'komal',  'r': 'komal',  'rek': 'komal',
  'ga': 'komal',  'g': 'komal',  'gak': 'komal',
  'dha': 'komal', 'd': 'komal',  'dhak': 'komal',
  'ni': 'komal',  'n': 'komal',  'nik': 'komal',

  // Shuddha (natural) — uppercase abbreviation
  'Re': 'shuddha', 'R': 'shuddha',
  'Ga': 'shuddha', 'G': 'shuddha',
  'Ma': 'shuddha', 'm': 'shuddha',
  'Dha': 'shuddha', 'D': 'shuddha',
  'Ni': 'shuddha', 'N': 'shuddha',

  // Tivra (sharp) — only Ma has a tivra variant
  'ma': 'tivra',  'M': 'tivra',

  // Explicit prefix forms (from DB or typed input)
  'komal Re': 'komal',  'komal re': 'komal',
  'komal Ga': 'komal',  'komal ga': 'komal',
  'komal Dha': 'komal', 'komal dha': 'komal',
  'komal Ni': 'komal',  'komal ni': 'komal',
  'tivra Ma': 'tivra',  'tivra ma': 'tivra',
}

export function getSwaraType(swara: string): SwaraType {
  if (!swara) return 'shuddha'
  const t = swara.trim()
  return SWARA_TYPE_MAP[t] ?? 'shuddha'
}

// Short abbreviation → full canonical name
const SHORT_TO_FULL: Record<string, string> = {
  'S': 'Sa', 's': 'Sa',
  'r': 're', 'R': 'Re',
  'g': 'ga', 'G': 'Ga',
  'm': 'Ma', 'M': 'ma',
  'P': 'Pa', 'p': 'Pa',
  'd': 'dha', 'D': 'Dha',
  'n': 'ni', 'N': 'Ni',
}

/** Expand single-letter shorthand to full swara name; pass-through otherwise */
export function swaraDisplayName(raw: string): string {
  const t = raw.trim()
  return SHORT_TO_FULL[t] ?? t
}

/**
 * Full human-readable label including variant prefix.
 * e.g. 're' → 'komal Re', 'ma' → 'tivra Ma', 'Re' → 'Re', 'Sa' → 'Sa'
 */
export function swaraFullLabel(raw: string): string {
  const name = swaraDisplayName(raw)
  const type = getSwaraType(raw)
  if (type === 'komal') {
    const base = name.charAt(0).toUpperCase() + name.slice(1)
    return `komal ${base}`
  }
  if (type === 'tivra') return 'tivra Ma'
  return name
}

/** Western accidental symbol: '♭' for komal, '♯' for tivra, '' otherwise */
export function swaraAccent(raw: string): string {
  const type = getSwaraType(raw)
  if (type === 'komal') return '♭'
  if (type === 'tivra') return '♯'
  return ''
}

/**
 * Given a raga's aroha array, derive which BaseSwara → variant mapping
 * to auto-apply in SwaPad. Returns a map of base name → 'komal' | 'tivra' | 'shuddha'.
 *
 * e.g. ['Sa', 're', 'Ga', 'Ma', 'Pa', 'Dha', 'ni', "Sa'"]
 *   → { Re: 'komal', Ga: 'shuddha', Ma: 'shuddha', Dha: 'shuddha', Ni: 'komal' }
 */
export function deriveRagaVariants(
  aroha: string[],
): Record<string, 'komal' | 'tivra' | 'shuddha'> {
  const result: Record<string, 'komal' | 'tivra' | 'shuddha'> = {}
  for (const raw of aroha) {
    const type = getSwaraType(raw)
    if (type === 'achala') continue // Sa, Pa have no variant

    const name = swaraDisplayName(raw)
    // Canonicalise to base swara: 're' → 'Re', 'ga' → 'Ga', etc.
    const base = name.charAt(0).toUpperCase() + name.slice(1)
    if (type !== 'shuddha') {
      result[base] = type
    } else if (!result[base]) {
      result[base] = 'shuddha'
    }
  }
  return result
}
