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
  ['viewport fit remains enabled', css.includes('100dvh') && css.includes('overflow-x: hidden') && css.includes('zoom: 0.9') && css.includes('calc((100dvh - 5rem - var(--app-safe-top)) / 0.9)') && css.includes('max-height: none;')],
  ['empty melodic guide uses compact status', studio.includes('data-testid="melodic-guide-empty"') && studio.includes('px-4 py-3')],
  ['empty track workspace does not reserve a large blank region', studio.includes('data-testid="empty-track-workspace"') && studio.includes('min-h-0') && studio.includes('px-5 py-6') && !studio.includes('min-h-[260px]')],
  ['track choices are the primary empty-state focus', fs.readFileSync(path.join(root, 'apps/web/components/TrackInsertPanel.tsx'), 'utf8').includes("Start here · add a track") && fs.readFileSync(path.join(root, 'apps/web/components/TrackInsertPanel.tsx'), 'utf8').includes('ring-1 ring-primary/15')],
  ['track choices remain visible in immersive empty view', studio.includes('{/* ── Track-first workspace ── */}\n          <TrackInsertPanel')],
]
const failed = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
if (failed.length) process.exitCode = 1
