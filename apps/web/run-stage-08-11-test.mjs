import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const studio = fs.readFileSync(path.join(root, 'apps/web/app/studio/page.tsx'), 'utf8')
const timeline = fs.readFileSync(path.join(root, 'apps/web/components/ArrangementTimeline.tsx'), 'utf8')
const takes = fs.readFileSync(path.join(root, 'apps/web/components/TakeManager.tsx'), 'utf8')
const panel = fs.readFileSync(path.join(root, 'apps/web/components/TrackInsertPanel.tsx'), 'utf8')
const checks = [
  ['timeline component exists', timeline.includes('data-testid="arrangement-timeline"')],
  ['track timestamps render on the timeline', timeline.includes('startTime') && timeline.includes('endTime')],
  ['track ordering controls are wired', timeline.includes('onMoveTrack') && studio.includes('onMoveTrack={moveTrack}')],
  ['takes are listed and managed', takes.includes('data-testid="take-manager"') && takes.includes('onRename') && takes.includes('onDelete')],
  ['recording creates take metadata', studio.includes('const take: TakeSummary') && studio.includes('updateTrack(activeTrack.id, { takes:')],
  ['track volume and pan controls exist', panel.includes('Track volume') && panel.includes('Track pan')],
]
const failed = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
if (failed.length) process.exitCode = 1
