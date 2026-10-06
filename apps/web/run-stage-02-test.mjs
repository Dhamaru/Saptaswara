import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const studio = fs.readFileSync(path.join(root, 'apps/web/app/studio/page.tsx'), 'utf8')
const audio = fs.readFileSync(path.join(root, 'apps/web/lib/audio.ts'), 'utf8')
const checks = [
  ['automatic aroha/avaroha playback exists', audio.includes('playArohaAvaroha')],
  ['selected raga playback is wired', studio.includes('audioEngine.playArohaAvaroha(selectedRaga.aroha, selectedRaga.avaroha')],
  ['automatic demo can be inserted into a track', studio.includes('handleInsertBlueprint') && studio.includes('playlist_add')],
  ['demo uses raga notes and frequencies', studio.includes('swaraToFrequency(note)') && studio.includes('selectedRaga.aroha')],
  ['demo controls are visible', studio.includes('Play Blueprint') && studio.includes('Insert Demo')],
]
const failed = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
if (failed.length) process.exitCode = 1
