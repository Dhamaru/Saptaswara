import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const diagnostics = fs.readFileSync(path.join(root, 'apps/web/components/StudioDiagnostics.tsx'), 'utf8')
const studio = fs.readFileSync(path.join(root, 'apps/web/app/studio/page.tsx'), 'utf8')
const checks = [
  ['technician diagnostics component exists', diagnostics.includes('data-testid="studio-diagnostics"')],
  ['engine/input/monitor/take fields exist', diagnostics.includes('Engine') && diagnostics.includes('Input') && diagnostics.includes('Monitor') && diagnostics.includes('Take time')],
  ['technician view is mounted in Studio', studio.includes('<StudioDiagnostics')],
  ['recording export remains available', studio.includes('stopRecordingAsWav') && studio.includes('stopRecording()')],
  ['project save path remains present', studio.includes('handleSaveProject')],
]
const failed = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
if (failed.length) process.exitCode = 1
