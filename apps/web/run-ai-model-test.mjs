import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const routeFiles = [
  'apps/web/app/api/ai/chat/route.ts',
  'apps/web/app/api/ai/suggest/route.ts',
  'apps/web/app/api/ai/mood/route.ts',
  'apps/web/app/api/ai/beat-suggest/route.ts',
  'apps/web/app/api/ai/generate/route.ts',
]

const source = routeFiles.map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n')
const checks = [
  ['shut-down Gemini 2.0 model is not referenced', !source.includes('gemini-2.0-flash')],
  ['stable Gemini fallback model is configured', source.includes("'gemini-2.5-flash'")],
  ['model can be overridden by environment', source.includes('GEMINI_CHAT_MODEL')],
]

const failed = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
if (failed.length) process.exitCode = 1
