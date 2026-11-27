import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (relative) => {
  const full = path.join(root, relative)
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : ''
}
const learnPage = read('apps/web/app/learn/page.tsx')
const navbar = read('apps/web/components/Navbar.tsx')
const curriculum = read('apps/web/lib/curriculum.ts')
const sessionsApi = read('apps/web/app/api/practice/sessions/route.ts')
const progressApi = read('apps/web/app/api/learn/progress/route.ts')
const library = read('apps/web/app/library/page.tsx')

const checks = [
  ['/learn page exists', learnPage.includes('Learn, step by step.') && learnPage.includes("'/api/learn/progress'") && learnPage.includes("'/api/practice/sessions?limit=5'")],
  ['Learn nav link exists', navbar.includes("name: 'Learn', href: '/learn', title: 'Learn — beginner curriculum'")],
  ['curriculum file exists', curriculum.includes('export const CURRICULUM_STAGES') && curriculum.includes('export const CURRICULUM_LESSONS')],
  ['practice sessions API exists', sessionsApi.length > 0],
  ['learn progress API exists', progressApi.length > 0],
  ['library has Practise this raga CTA', library.includes('Practise this raga') && library.includes('/riyaz?raga_name=')],
]
const failed = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
if (failed.length) process.exitCode = 1
