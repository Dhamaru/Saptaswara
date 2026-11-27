export interface CurriculumLesson {
  id: string
  title: string
  description: string
  stage: number
  stageTitle: string
  ragaName: string
  estimatedMinutes: number
  href: string
  cta: string
}

export const CURRICULUM_STAGES: { id: number; title: string; description: string }[] = [
  {
    id: 1,
    title: 'Foundations',
    description: 'Find your tonic, then build the first few notes by ear.',
  },
  {
    id: 2,
    title: 'Raga Grammar',
    description: 'See how a raga is built and learn to recognise its signature phrase.',
  },
  {
    id: 3,
    title: 'Guided Practice',
    description: 'Put the notes together in a short, focused riyaz.',
  },
  {
    id: 4,
    title: 'Reflect',
    description: 'Write down what happened so the next session starts from clarity.',
  },
]

export const CURRICULUM_LESSONS: CurriculumLesson[] = [
  {
    id: 'find-sa',
    title: 'Find Sa',
    description: 'Locate the tonic on the instrument before you play anything else.',
    stage: 1,
    stageTitle: 'Foundations',
    ragaName: 'Yaman',
    estimatedMinutes: 3,
    href: '/studio',
    cta: 'Find Sa in Studio',
  },
  {
    id: 'sa-re',
    title: 'Sa → Re',
    description: 'Listen to Sa and Re together, then sing or play the pair back.',
    stage: 1,
    stageTitle: 'Foundations',
    ragaName: 'Yaman',
    estimatedMinutes: 4,
    href: '/studio',
    cta: 'Practice Sa → Re',
  },
  {
    id: 'sa-re-ga',
    title: 'Sa → Re → Ga',
    description: 'Extend the phrase to three notes and keep the tuning steady.',
    stage: 1,
    stageTitle: 'Foundations',
    ragaName: 'Yaman',
    estimatedMinutes: 5,
    href: '/studio',
    cta: 'Practice the phrase',
  },
  {
    id: 'raga-map',
    title: 'Raga map',
    description: 'Open a raga and read its scale, vadi and characteristic notes.',
    stage: 2,
    stageTitle: 'Raga Grammar',
    ragaName: 'Yaman',
    estimatedMinutes: 5,
    href: '/library',
    cta: 'Explore the raga map',
  },
  {
    id: 'pakad-ear',
    title: 'Pakad ear',
    description: 'Use the quiz in the library to recognise a raga by its pakad.',
    stage: 2,
    stageTitle: 'Raga Grammar',
    ragaName: 'Yaman',
    estimatedMinutes: 4,
    href: '/library',
    cta: 'Try the pakad quiz',
  },
  {
    id: 'guided-riyaz',
    title: 'Guided 90s riyaz',
    description: 'Run one short riyaz with Yaman and read the feedback.',
    stage: 3,
    stageTitle: 'Guided Practice',
    ragaName: 'Yaman',
    estimatedMinutes: 3,
    href: '/riyaz?raga_name=Yaman',
    cta: 'Start 90s riyaz',
  },
  {
    id: 'reflect',
    title: 'Journal your session',
    description: 'Record what felt steady and what you want to revisit next time.',
    stage: 4,
    stageTitle: 'Reflect',
    ragaName: 'Yaman',
    estimatedMinutes: 2,
    href: '/journal',
    cta: 'Open your journal',
  },
]
