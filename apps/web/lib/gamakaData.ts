/**
 * Static gamaka (ornament) knowledge base for major ragas.
 *
 * Gamaka types (from types.ts OrnamentType):
 *   meend     — continuous pitch glide between two swaras
 *   andolan   — slow asymmetric oscillation on a single swara
 *   gamak     — rapid forceful alternation between adjacent swaras
 *   kan       — brief grace touch of adjacent swara before arrival
 *   murki     — quick descending cluster landing on main swara
 *   khatka    — sharp percussive snap between adjacent pitches
 *   sparsh    — light ascending grace approach
 *   pratyahat — light descending grace approach
 *
 * Data is stable musicological knowledge — does not change with DB content.
 * For ragas not listed here, no gamaka panel is shown (graceful degradation).
 */

export type GamakaType =
  | 'meend' | 'andolan' | 'gamak' | 'kan'
  | 'murki' | 'khatka' | 'sparsh' | 'pratyahat'

export interface GamakaSpec {
  /** Canonical swara abbreviation (same format as aroha/avaroha in DB) */
  swara: string
  type: GamakaType
  /** Plain-English description of how/when the ornament is used */
  description: string
  /** Whether this ornament is considered mandatory for the raga's identity */
  required: boolean
  /** Extra technical detail (rate, depth) — shown as fine print */
  details?: string
}

export interface RagaGamakaProfile {
  /** The single most defining ornament of this raga */
  characteristicOrnament: GamakaType | null
  specs: GamakaSpec[]
  /** Broader contextual note about the raga's ornament approach */
  generalNotes: string
}

export const GAMAKA_PROFILES: Record<string, RagaGamakaProfile> = {

  'Yaman': {
    characteristicOrnament: 'meend',
    specs: [
      { swara: 'ma', type: 'meend',   required: true,  description: 'Long glide from Ga through tivra Ma to Pa — the raga\'s defining gesture' },
      { swara: 'Pa', type: 'kan',     required: true,  description: 'Approached with a light touch of Dha before landing' },
      { swara: 'Ni', type: 'meend',   required: false, description: 'Slow glide from Dha to Ni in avaroha' },
      { swara: 'Re', type: 'sparsh',  required: false, description: 'Light ascending grace from Sa before arriving on Re' },
    ],
    generalNotes: 'Meend (glide) is the soul of Yaman — every phrase should flow like a river. Tivra Ma must always be approached through meend, never struck directly.',
  },

  'Bhairavi': {
    characteristicOrnament: 'andolan',
    specs: [
      { swara: 'ga',  type: 'andolan', required: true,  description: 'Slow oscillation on komal Ga — the raga\'s most defining ornament', details: '≈ 2 Hz · depth 0.4 st' },
      { swara: 'dha', type: 'andolan', required: true,  description: 'Matching oscillation on komal Dha', details: '≈ 2 Hz · depth 0.3 st' },
      { swara: 'ni',  type: 'andolan', required: false, description: 'Subtle oscillation on komal Ni' },
      { swara: 'Ma',  type: 'meend',   required: false, description: 'Glide between Re and Ma' },
      { swara: 'Sa',  type: 'murki',   required: false, description: 'Decorative quick cluster around Sa in avaroha' },
    ],
    generalNotes: 'Bhairavi uses all four komal notes and the andolan on komal Ga gives it its sorrowful, devotional quality. It is a "sarvasparsharaga" — nearly any note can appear as a touch ornament.',
  },

  'Bhairav': {
    characteristicOrnament: 'andolan',
    specs: [
      { swara: 're',  type: 'andolan', required: true,  description: 'Oscillation on komal Re — the most distinctive feature of Bhairav', details: '≈ 1.8 Hz · depth 0.35 st' },
      { swara: 'dha', type: 'andolan', required: true,  description: 'Matching oscillation on komal Dha', details: '≈ 1.8 Hz · depth 0.35 st' },
      { swara: 'Ga',  type: 'meend',   required: false, description: 'Glide from Re to Ga in aroha' },
      { swara: 'Pa',  type: 'kan',     required: false, description: 'Light touch from Ma when approaching Pa' },
    ],
    generalNotes: 'Bhairav is a morning raga of austere contemplation. Komal Re and Dha with matching andolan give it a devotional gravity unlike any other raga. The symmetry between the two oscillating notes is its architectural signature.',
  },

  'Darbari Kanhada': {
    characteristicOrnament: 'andolan',
    specs: [
      { swara: 'ga',  type: 'andolan', required: true,  description: 'Very slow, deep oscillation on komal Ga — the hallmark of Darbari', details: '≈ 1.5 Hz (very slow) · depth 0.6 st (deep)' },
      { swara: 'dha', type: 'andolan', required: true,  description: 'Slow oscillation on komal Dha', details: '≈ 1.5 Hz · depth 0.5 st' },
      { swara: 'ni',  type: 'andolan', required: false, description: 'Subtle oscillation on komal Ni' },
      { swara: 'Sa',  type: 'meend',   required: true,  description: 'Heavy meend landing on Sa from komal Ni — regal, weighty descent' },
      { swara: 'Ma',  type: 'gamak',   required: false, description: 'Rapid gamak on Ma — appears in signature characteristic phrases' },
    ],
    generalNotes: 'Darbari demands the slowest, deepest andolan of any raga. The komal Ga oscillation is its fingerprint — it must be held long and heavy, conveying the weight of a royal court. Speed is the enemy of Darbari.',
  },

  'Todi': {
    characteristicOrnament: 'andolan',
    specs: [
      { swara: 'ga',  type: 'andolan', required: true,  description: 'Oscillation on komal Ga', details: '≈ 2 Hz · depth 0.4 st' },
      { swara: 'dha', type: 'meend',   required: true,  description: 'Characteristic meend from Pa to komal Dha' },
      { swara: 'ma',  type: 'kan',     required: true,  description: 'Grace note from Ga approaching tivra Ma — essential movement' },
      { swara: 'Re',  type: 'sparsh',  required: false, description: 'Light ascending approach to Re from Sa' },
    ],
    generalNotes: 'Todi (Hindustani) is one of the "big four" morning ragas. Its unique colour comes from komal Re, Ga, Dha combined with tivra Ma — a configuration unlike any other major raga. The andolan on ga and the meend to komal Dha are non-negotiable.',
  },

  'Malkauns': {
    characteristicOrnament: 'andolan',
    specs: [
      { swara: 'ga',  type: 'andolan', required: true,  description: 'Slow andolan on komal Ga', details: '≈ 2 Hz · depth 0.4 st' },
      { swara: 'ni',  type: 'andolan', required: true,  description: 'Oscillation on komal Ni', details: '≈ 1.8 Hz · depth 0.35 st' },
      { swara: 'Ma',  type: 'meend',   required: true,  description: 'Glide between komal Ga and Ma — the heart of Malkauns phrasing' },
      { swara: 'dha', type: 'pratyahat', required: false, description: 'Descending grace on komal Dha' },
    ],
    generalNotes: 'Malkauns is pentatonic (Sa ga Ma dha ni — 5 notes, no Re or Pa) with a deep, serious character. The two oscillating notes ga and ni, combined with Ma meend, create its distinctive haunting gravity.',
  },

  'Kedar': {
    characteristicOrnament: 'meend',
    specs: [
      { swara: 'Ma',  type: 'meend',   required: true,  description: 'Signature meend from tivra Ma to shuddha Ma — the raga\'s most distinctive moment' },
      { swara: 'Pa',  type: 'andolan', required: false, description: 'Light oscillation on Pa' },
      { swara: 'Sa',  type: 'murki',   required: false, description: 'Murki decoration around Sa in avaroha' },
      { swara: 'Re',  type: 'kan',     required: false, description: 'Kan grace from Sa approaching Re' },
    ],
    generalNotes: 'Kedar is unique in using both tivra Ma and shuddha Ma. The meend glide between them is its single most defining ornament and must be executed with great care — this note-pair is Kedar\'s fingerprint.',
  },

  'Bageshri': {
    characteristicOrnament: 'andolan',
    specs: [
      { swara: 'Ni',  type: 'andolan', required: true,  description: 'Oscillation on shuddha Ni — unusual, as most ragas ornament komal notes', details: '≈ 2.5 Hz · depth 0.3 st' },
      { swara: 'ga',  type: 'meend',   required: true,  description: 'Glide from Re to komal Ga — yearning quality' },
      { swara: 'Ma',  type: 'kan',     required: false, description: 'Kan approach to Ma from Ga' },
    ],
    generalNotes: 'Bageshri is a late-night raga of deep longing. The andolan on shuddha Ni is its most unusual feature — ornaments on natural (shuddha) notes are rare and give it a unique, melancholic flavour.',
  },

  'Kafi': {
    characteristicOrnament: 'kan',
    specs: [
      { swara: 'ga',  type: 'kan',     required: true,  description: 'Grace touch from Re arriving on komal Ga — essential movement' },
      { swara: 'ni',  type: 'kan',     required: true,  description: 'Kan approach to komal Ni from Dha' },
      { swara: 'Ma',  type: 'meend',   required: false, description: 'Glide from Ga to Ma' },
      { swara: 'Pa',  type: 'gamak',   required: false, description: 'Gamak on Pa in fast passages' },
    ],
    generalNotes: 'Kafi has a folk-tinged, earthy quality. The kan (grace notes) give it a conversational feel, quite different from the heavy gamakas of the night ragas. It is considered the raga closest to folk and semi-classical music.',
  },

  'Bilawal': {
    characteristicOrnament: 'sparsh',
    specs: [
      { swara: 'Ga',  type: 'sparsh',  required: true,  description: 'Light ascending grace on Ga — the characteristic ornament' },
      { swara: 'Ni',  type: 'sparsh',  required: false, description: 'Sparsh on Ni from below' },
      { swara: 'Re',  type: 'kan',     required: false, description: 'Kan grace from Sa to Re' },
    ],
    generalNotes: 'Bilawal uses all shuddha (natural) notes. Its ornaments are light — sparsh and kan rather than heavy andolan. It is considered the "base scale" of Hindustani music and is used for teaching swara relationships.',
  },

  'Bhoopali': {
    characteristicOrnament: 'meend',
    specs: [
      { swara: 'Ga',  type: 'meend',   required: false, description: 'Gentle glide from Re to Ga' },
      { swara: 'Pa',  type: 'kan',     required: false, description: 'Light kan approach to Pa' },
    ],
    generalNotes: 'Bhoopali (Bhupali) is pentatonic — Sa Re Ga Pa Dha, no Ma or Ni. It has very few mandatory ornaments; its beauty lies in clean, clear note movement. An ideal raga for beginners learning to hear swara relationships.',
  },

  'Puriya Dhanashree': {
    characteristicOrnament: 'kan',
    specs: [
      { swara: 'Pa',  type: 'kan',     required: true,  description: 'Distinctive kan touch on Pa — this raga\'s single most recognisable fingerprint' },
      { swara: 'ma',  type: 'meend',   required: true,  description: 'Meend to tivra Ma — the raga\'s tonal centre' },
      { swara: 're',  type: 'andolan', required: false, description: 'Oscillation on komal Re' },
      { swara: 'Ni',  type: 'sparsh',  required: false, description: 'Sparsh approach to Ni in avaroha' },
    ],
    generalNotes: 'Puriya Dhanashree is an evening raga of extraordinary depth and mystery. The kan on Pa is unique — no other major raga touches Pa quite this way. The combination of komal Re, tivra Ma, and the Pa kan creates a deeply personal, intimate sound.',
  },

  'Marwa': {
    characteristicOrnament: 'andolan',
    specs: [
      { swara: 're',  type: 'andolan', required: true,  description: 'Andolan on komal Re — the anchor of Marwa\'s identity', details: '≈ 1.8 Hz · depth 0.4 st' },
      { swara: 'ma',  type: 'meend',   required: true,  description: 'Long glide landing on tivra Ma — the raga\'s second pillar' },
      { swara: 'Ni',  type: 'meend',   required: false, description: 'Glide from Dha to Ni in avaroha' },
    ],
    generalNotes: 'Marwa is a sunset raga that omits Pa — one of very few major ragas without this anchor note. Komal Re and tivra Ma create an extraordinarily tense, restless character. The absence of Pa gives phrases an unresolved, searching quality.',
  },

  'Yaman Kalyan': {
    characteristicOrnament: 'meend',
    specs: [
      { swara: 'ma',  type: 'meend',   required: true,  description: 'Glide on tivra Ma — same as pure Yaman' },
      { swara: 'Ma',  type: 'kan',     required: false, description: 'Occasional shuddha Ma touch — the feature that differentiates it from Yaman' },
      { swara: 'Pa',  type: 'kan',     required: false, description: 'Kan approach to Pa' },
    ],
    generalNotes: 'Yaman Kalyan blends Yaman\'s tivra Ma with occasional shuddha Ma, giving it a slightly more relaxed and richer character. The key skill is knowing when to touch shuddha Ma and when to stay on tivra.',
  },

  'Bhimpalasi': {
    characteristicOrnament: 'meend',
    specs: [
      { swara: 'ga',  type: 'meend',   required: true,  description: 'Glide from Re to komal Ga — the raga\'s primary emotional gesture' },
      { swara: 'ni',  type: 'meend',   required: false, description: 'Meend from Dha to komal Ni' },
      { swara: 'Ma',  type: 'gamak',   required: false, description: 'Gamak on Ma in fast passages' },
      { swara: 'Pa',  type: 'andolan', required: false, description: 'Light oscillation on Pa' },
    ],
    generalNotes: 'Bhimpalasi is an afternoon raga of deep romantic yearning. The komal Ga and Ni approached through meend give it a heart-aching quality. It is one of the most popular ragas for expressing sringar (romantic) rasa.',
  },

  'Abheri': {
    characteristicOrnament: 'meend',
    specs: [
      { swara: 'ga',  type: 'meend',   required: true,  description: 'Glide to komal Ga — characteristic movement' },
      { swara: 'ni',  type: 'andolan', required: false, description: 'Slight oscillation on komal Ni' },
      { swara: 'Pa',  type: 'kan',     required: false, description: 'Kan approach to Pa' },
    ],
    generalNotes: 'Abheri is the Carnatic equivalent of Bhimpalasi. Uses komal Ga and Ni with flowing meend passages. The ornament style is slightly lighter and faster than its Hindustani counterpart.',
  },

  'Shankarabharanam': {
    characteristicOrnament: 'gamak',
    specs: [
      { swara: 'Ga',  type: 'gamak',   required: true,  description: 'Vigorous kampita gamaka on Ga — characteristic of Carnatic style' },
      { swara: 'Ni',  type: 'gamak',   required: true,  description: 'Gamak on Ni' },
      { swara: 'Re',  type: 'sparsh',  required: false, description: 'Sparsh on Re' },
      { swara: 'Ma',  type: 'meend',   required: false, description: 'Glide from Ga to Ma' },
    ],
    generalNotes: 'Shankarabharanam (equivalent to Bilawal in Hindustani) uses all shuddha notes. In Carnatic style, kampita gamaka (gamak) is heavily featured, giving it an energetic, celebratory character very different from the Hindustani treatment.',
  },

  'Kalyani': {
    characteristicOrnament: 'meend',
    specs: [
      { swara: 'ma',  type: 'meend',   required: true,  description: 'Glide on tivra Ma — the defining note, same structure as Yaman' },
      { swara: 'Ni',  type: 'gamak',   required: true,  description: 'Gamak on Ni — more prominent than in Hindustani Yaman' },
      { swara: 'Pa',  type: 'kan',     required: false, description: 'Kan approach to Pa' },
    ],
    generalNotes: 'Kalyani is the Carnatic equivalent of Yaman. Tivra Ma is its defining note. In Carnatic style, gamak is used more heavily on Ni, giving it a brighter, more active energy compared to the smoother Hindustani Yaman.',
  },

  'Hamsadhwani': {
    characteristicOrnament: 'kan',
    specs: [
      { swara: 'Ga',  type: 'kan',     required: true,  description: 'Kan from Re approaching Ga' },
      { swara: 'Ni',  type: 'gamak',   required: true,  description: 'Gamak on Ni — primary ornament of this pentatonic raga' },
      { swara: 'Re',  type: 'sparsh',  required: false, description: 'Sparsh on Re' },
    ],
    generalNotes: 'Hamsadhwani is a popular pentatonic raga (Sa Re Ga Pa Ni) of Carnatic origin. Its joyful character is enhanced by gamak on Ni and kan on Ga. Often performed at the opening of a concert.',
  },

  'Miyan Ki Malhar': {
    characteristicOrnament: 'gamak',
    specs: [
      { swara: 'ni',  type: 'gamak',   required: true,  description: 'Vigorous gamak on komal Ni — the rain-evoking ornament of Malhar' },
      { swara: 'ga',  type: 'andolan', required: false, description: 'Andolan on komal Ga' },
      { swara: 'Ma',  type: 'meend',   required: false, description: 'Glide to Ma' },
      { swara: 'Sa',  type: 'murki',   required: false, description: 'Murki around Sa — characteristic of Malhar group' },
    ],
    generalNotes: 'Miyan Ki Malhar is a monsoon raga associated with Tansen. The gamak on komal Ni is said to evoke the sound of thunder and rain. All Malhar-group ragas share this gamak characteristic.',
  },

  'Puriya': {
    characteristicOrnament: 'meend',
    specs: [
      { swara: 'ma',  type: 'meend',   required: true,  description: 'Meend to tivra Ma from Ga' },
      { swara: 're',  type: 'andolan', required: true,  description: 'Andolan on komal Re', details: '≈ 1.8 Hz · depth 0.4 st' },
      { swara: 'Ni',  type: 'meend',   required: false, description: 'Glide from Dha to Ni' },
    ],
    generalNotes: 'Puriya (without Dhanashree) is a late-evening raga of intense searching quality. Komal Re and tivra Ma create strong tension. The omission of Pa (in many versions) adds to the restless, unresolved character.',
  },
}

/**
 * Look up the gamaka profile for a raga by name.
 * Does an exact match first, then case-insensitive.
 * Returns null for ragas not in the knowledge base — callers should handle gracefully.
 */
export function getGamakaProfile(ragaName: string): RagaGamakaProfile | null {
  if (!ragaName) return null
  if (GAMAKA_PROFILES[ragaName]) return GAMAKA_PROFILES[ragaName]
  const lower = ragaName.toLowerCase()
  const key = Object.keys(GAMAKA_PROFILES).find(k => k.toLowerCase() === lower)
  return key ? GAMAKA_PROFILES[key] : null
}

/** Human-readable label for each gamaka type */
export const GAMAKA_LABELS: Record<GamakaType, string> = {
  meend:     'Meend',
  andolan:   'Andolan',
  gamak:     'Gamak',
  kan:       'Kan',
  murki:     'Murki',
  khatka:    'Khatka',
  sparsh:    'Sparsh',
  pratyahat: 'Pratyahat',
}

/** Short description of each gamaka type — for tooltips and glossary */
export const GAMAKA_DESCRIPTIONS: Record<GamakaType, string> = {
  meend:     'Continuous pitch glide between two swaras',
  andolan:   'Slow asymmetric oscillation on a single swara',
  gamak:     'Rapid forceful alternation between adjacent swaras',
  kan:       'Brief grace touch of adjacent swara before arrival',
  murki:     'Quick descending cluster landing on the main swara',
  khatka:    'Sharp percussive snap between adjacent pitches',
  sparsh:    'Light ascending grace approach to a swara',
  pratyahat: 'Light descending grace approach to a swara',
}
