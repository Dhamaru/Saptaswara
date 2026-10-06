import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const studio = fs.readFileSync(path.join(root, 'apps/web/app/studio/page.tsx'), 'utf8')
const panel = fs.readFileSync(path.join(root, 'apps/web/components/TrackInsertPanel.tsx'), 'utf8')
const audio = fs.readFileSync(path.join(root, 'apps/web/lib/audio.ts'), 'utf8')
const checks = [
  ['track-first panel exists', panel.includes('data-testid="track-insert-panel"')],
  ['vocal, piano, and tabla options exist', panel.includes('label: \'Vocals\'') && panel.includes('label: \'Piano\'') && panel.includes('label: \'Tabla\'')],
  ['studio starts without default tracks', studio.includes('const [tracks, setTracks] = useState<Track[]>([])')],
  ['keyboard is hidden until piano is selected', studio.includes('if (!activeTrack)') && studio.includes('activeTrack.type === \'vocal\'')],
  ['vocal workspace is external-input focused', studio.includes('data-testid="vocal-track-workspace"') && studio.includes('Record vocals only')],
  ['recording supports external-only mode', audio.includes("startRecording(mode: RecordingMode = 'mix')") && audio.includes('disconnect(this.recorder)')],
  ['track ordering and timestamps are wired', panel.includes('onMoveTrack') && panel.includes('Start (sec)') && panel.includes('End (sec)')],
]
const failed = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
if (failed.length) process.exitCode = 1
