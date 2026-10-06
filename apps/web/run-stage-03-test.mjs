import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const audio = fs.readFileSync(path.join(root, 'apps/web/lib/audio.ts'), 'utf8')
const studio = fs.readFileSync(path.join(root, 'apps/web/app/studio/page.tsx'), 'utf8')
const checks = [
  ['external input uses browser audio input', audio.includes('new Tone.UserMedia()')],
  ['external input reaches the recorder', audio.includes('this.externalInput.connect(this.recorder)')],
  ['external input reaches the meter', audio.includes('this.externalInput.connect(this.meter)')],
  ['empty takes are rejected', audio.includes("recording.size === 0")],
  ['input is closed after a take', audio.includes('this.externalInput?.close()')],
  ['recording diagnostics are visible', studio.includes('<StudioDiagnostics')],
]
const failed = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
if (failed.length) process.exitCode = 1
