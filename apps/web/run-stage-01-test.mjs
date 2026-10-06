import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const lesson = fs.readFileSync(path.join(root, 'apps/web/components/BeginnerLesson.tsx'), 'utf8')
const studio = fs.readFileSync(path.join(root, 'apps/web/app/studio/page.tsx'), 'utf8')
const checks = [
  ['lesson component exists', lesson.includes('data-testid="beginner-lesson"')],
  ['three progressive exercises exist', lesson.includes("{ title: 'Find Sa'") && lesson.includes("{ title: 'Sa → Re'") && lesson.includes("{ title: 'Sa → Re → Ga'")],
  ['show me control exists', lesson.includes('data-testid="lesson-show-me"')],
  ['keyboard events reach lesson', studio.includes('setPlayedNoteEvent({ note, id: Date.now() + Math.random() })')],
  ['lesson is mounted in Studio', studio.includes('<BeginnerLesson playedNote={playedNoteEvent}')],
]
const failed = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
if (failed.length) process.exitCode = 1
