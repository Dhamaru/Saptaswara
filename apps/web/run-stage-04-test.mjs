import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const score = fs.readFileSync(path.join(root, 'apps/web/components/ConformanceScore.tsx'), 'utf8')
const detector = fs.readFileSync(path.join(root, 'apps/web/lib/pitchDetector.ts'), 'utf8')
const checks = [
  ['pitch detector returns confidence', detector.includes('confidence: number')],
  ['conformance uses confidence', score.includes('result.confidence > 0.85')],
  ['live mic capture is wired', score.includes('new PitchListener()') && score.includes('listener.start')],
  ['feedback includes a percentage score', score.includes('Raga Conformance') && score.includes('{score}%')],
]
const failed = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
if (failed.length) process.exitCode = 1
