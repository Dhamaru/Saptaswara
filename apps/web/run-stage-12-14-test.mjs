import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const studio = fs.readFileSync(path.join(root, 'apps/web/app/studio/page.tsx'), 'utf8')
const panel = fs.readFileSync(path.join(root, 'apps/web/components/TrackInsertPanel.tsx'), 'utf8')
const input = fs.readFileSync(path.join(root, 'apps/web/components/AudioInputSelector.tsx'), 'utf8')
const lesson = fs.readFileSync(path.join(root, 'apps/web/components/BeginnerLesson.tsx'), 'utf8')
const checks = [
  ['track volume and pan controls exist', panel.includes('Track volume') && panel.includes('Track pan')],
  ['audio input device selection exists', input.includes('data-testid="audio-input-selector"') && input.includes('enumerateDevices')],
  ['selected input reaches recording', studio.includes('audioEngine.startRecording(activeTrack.inputMode, audioDeviceId')],
  ['interactive learning remains mounted', studio.includes('<BeginnerLesson') && lesson.includes('lesson-show-me')],
  ['recording route supports an explicit device', fs.readFileSync(path.join(root, 'apps/web/lib/audio.ts'), 'utf8').includes('startRecording(mode: RecordingMode = \'mix\', deviceId?: string)')],
  ['responsive hardening remains present', fs.readFileSync(path.join(root, 'apps/web/app/globals.css'), 'utf8').includes('100dvh')],
]
const failed = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
if (failed.length) process.exitCode = 1
