import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const studio = fs.readFileSync(path.join(root, 'apps/web/app/studio/page.tsx'), 'utf8')
const transport = fs.readFileSync(path.join(root, 'apps/web/components/TransportBar.tsx'), 'utf8')
const css = fs.readFileSync(path.join(root, 'apps/web/app/globals.css'), 'utf8')
const checks = [
  ['command-center wrapper exists', css.includes('grid-template-columns: auto minmax(0, 1fr)')],
  ['sidebar has a stable layout region', studio.includes('studio-sidebar')],
  ['main workspace has a stable layout region', studio.includes('studio-main')],
  ['compact HUD is defined', studio.includes('studio-hud') && css.includes('.studio-hud')],
  ['content spacing is responsive', studio.includes('studio-content') && css.includes('.studio-content > * + *')],
  ['transport rail is part of the redesign', transport.includes('studio-transport')],
  ['viewport fit remains enabled', css.includes('100dvh') && css.includes('overflow-x: hidden')],
  ['empty melodic guide uses compact status', studio.includes('data-testid="melodic-guide-empty"') && studio.includes('px-4 py-3')],
]
const failed = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
if (failed.length) process.exitCode = 1
