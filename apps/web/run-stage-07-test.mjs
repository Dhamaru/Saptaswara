import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const globals = fs.readFileSync(path.join(root, 'apps/web/app/globals.css'), 'utf8')
const layout = fs.readFileSync(path.join(root, 'apps/web/app/layout.tsx'), 'utf8')
const studio = fs.readFileSync(path.join(root, 'apps/web/app/studio/page.tsx'), 'utf8')
const checks = [
  ['dynamic viewport sizing exists', globals.includes('100dvh')],
  ['safe-area insets are supported', globals.includes('safe-area-inset-bottom') && globals.includes('safe-area-inset-left')],
  ['horizontal overflow is suppressed at the app boundary', globals.includes('overflow-x: hidden')],
  ['responsive container behavior exists', globals.includes('container-type: inline-size') && globals.includes('@container studio-viewport')],
  ['mobile and desktop layout branches exist', globals.includes('@media (max-width: 767px)') && globals.includes('@media (min-width: 768px)')],
  ['root app shell uses the responsive wrapper', layout.includes('app-page-shell')],
  ['studio uses the viewport wrapper', studio.includes('studio-viewport')],
]
const failed = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
if (failed.length) process.exitCode = 1
