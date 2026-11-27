/**
 * Shared learning-preference shapes and deterministic helpers.
 *
 * The database is the source of truth. localStorage is only a cache used when
 * the preferences API is unavailable (for example, before the user_preferences
 * migration has been applied to an environment).
 */

export type SkillLevel = 'Beginner' | 'Student' | 'Musician'

export interface LearningPreferences {
  skill_level: SkillLevel | null
  onboarding_mood: string | null
  preferred_ragas: string[]
  preferred_instruments: string[]
  onboarding_done: boolean
}

export interface PreferencesResponse {
  preferences: LearningPreferences
  degraded: boolean
}

export const DEFAULT_LEARNING_PREFERENCES: LearningPreferences = {
  skill_level: null,
  onboarding_mood: null,
  preferred_ragas: [],
  preferred_instruments: [],
  onboarding_done: false,
}

export const STARTER_RAGA_NAMES = ['Yaman', 'Bhairav', 'Bhairavi', 'Kafi', 'Khamaj'] as const

export interface MoodRagaSuggestion {
  name: string
  tradition: string
  rasa: string
  time: string
  reason: string
}

/**
 * Deterministic onboarding recommendations. We deliberately avoid an AI call
 * here: the first run should be fast, reliable, and free.
 */
export const MOOD_RAGA_SUGGESTIONS: Record<string, MoodRagaSuggestion> = {
  Calm: {
    name: 'Yaman',
    tradition: 'Hindustani',
    rasa: 'Shanta',
    time: 'Early evening',
    reason: 'A clear, expansive raga that rewards slow, unhurried practice.',
  },
  Romantic: {
    name: 'Khamaj',
    tradition: 'Hindustani',
    rasa: 'Shringara',
    time: 'Late evening',
    reason: 'A warm, flowing raga with a natural pull towards expressive phrases.',
  },
  Devotional: {
    name: 'Bhairav',
    tradition: 'Hindustani',
    rasa: 'Bhakti',
    time: 'Early morning',
    reason: 'A grounded raga with a strong Sa and a disciplined, devotional character.',
  },
  Melancholic: {
    name: 'Bhairavi',
    tradition: 'Hindustani',
    rasa: 'Karuna',
    time: 'Morning',
    reason: 'A deeply expressive raga whose komal swaras make emotions easy to hear.',
  },
  Joyful: {
    name: 'Kafi',
    tradition: 'Hindustani',
    rasa: 'Hasya',
    time: 'Afternoon',
    reason: 'A playful, folk-leaning raga that is forgiving for first experiments.',
  },
}

export function getMoodRaga(mood: string | null | undefined): MoodRagaSuggestion {
  return MOOD_RAGA_SUGGESTIONS[mood ?? ''] ?? MOOD_RAGA_SUGGESTIONS.Calm
}

export function normalizeRagaNames(names: string[] | null | undefined): Set<string> {
  return new Set((names ?? []).map(name => name.trim().toLowerCase()).filter(Boolean))
}

/** Put the learner's preferred ragas first without dropping anything else. */
export function prioritiseRagas<T extends { name?: string | null }>(
  ragas: T[],
  preferredNames: string[] | null | undefined,
): T[] {
  const preferred = normalizeRagaNames(preferredNames)
  return [...ragas].sort((a, b) => {
    const aScore = preferred.has((a.name ?? '').toLowerCase()) ? 1 : 0
    const bScore = preferred.has((b.name ?? '').toLowerCase()) ? 1 : 0
    return bScore - aScore
  })
}

export async function fetchLearningPreferences(): Promise<PreferencesResponse> {
  try {
    const response = await fetch('/api/users/preferences')
    if (!response.ok) {
      return { preferences: DEFAULT_LEARNING_PREFERENCES, degraded: true }
    }

    const json = await response.json()
    return {
      preferences: {
        ...DEFAULT_LEARNING_PREFERENCES,
        ...(json?.preferences ?? {}),
      },
      degraded: Boolean(json?.degraded),
    }
  } catch {
    return { preferences: DEFAULT_LEARNING_PREFERENCES, degraded: true }
  }
}

export function skillLevelHint(level: SkillLevel | null): string {
  if (level === 'Beginner') return 'Start with the scale, then try a short phrase.'
  if (level === 'Student') return 'Practise the pakad, then check your nyasa.'
  if (level === 'Musician') return 'Move straight to phrase and improvisation work.'
  return 'Focused practice · One raga at a time'
}
