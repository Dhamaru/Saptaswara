#!/usr/bin/env node
/**
 * Security audit via npm bulk advisory endpoint.
 * Replaces `npm audit` which has a gzip parsing bug on the bulk endpoint.
 * Exits 1 if any CRITICAL vulnerabilities are found in production deps.
 */
const https = require('https')
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

const root = process.cwd()
const lockPath = path.join(root, 'package-lock.json')
if (!fs.existsSync(lockPath)) {
  console.error('No package-lock.json found at', lockPath)
  process.exit(1)
}

const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'))

// Build package→versions map, skip dev-only entries
const packages = {}
for (const [key, val] of Object.entries(lock.packages || {})) {
  if (!key || !val.version || val.dev) continue
  const name = key.replace(/^(?:.*\/)?node_modules\//, '')
  if (!name) continue
  if (!packages[name]) packages[name] = [val.version]
  else if (!packages[name].includes(val.version)) packages[name].push(val.version)
}

console.log(`Auditing ${Object.keys(packages).length} production packages...`)

const body = JSON.stringify(packages)
const options = {
  hostname: 'registry.npmjs.org',
  path: '/-/npm/v1/security/advisories/bulk',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'User-Agent': 'saptaswara-ci-audit/1.0',
    'Content-Length': Buffer.byteLength(body),
  },
}

const req = https.request(options, (res) => {
  const chunks = []
  res.on('data', (d) => chunks.push(d))
  res.on('end', () => {
    const buf = Buffer.concat(chunks)
    let text
    try { text = zlib.gunzipSync(buf).toString('utf8') } catch (_) {
      try { text = zlib.inflateSync(buf).toString('utf8') } catch (_) {
        text = buf.toString('utf8')
      }
    }

    let advisories
    try { advisories = JSON.parse(text) } catch (e) {
      console.error('Failed to parse advisory response:', e.message)
      console.error('Response (first 200 chars):', text.slice(0, 200))
      process.exit(1)
    }

    const rank = { critical: 3, high: 2, moderate: 1, low: 0 }
    const found = []
    for (const [pkg, advList] of Object.entries(advisories)) {
      for (const adv of advList) {
        found.push({ pkg, severity: adv.severity, title: adv.title, url: adv.url || '' })
      }
    }
    found.sort((a, b) => (rank[b.severity] || 0) - (rank[a.severity] || 0))

    if (found.length === 0) {
      console.log('No vulnerabilities found.')
      process.exit(0)
    }

    let hasCritical = false
    for (const f of found) {
      const prefix = f.severity === 'critical' ? '🚨 CRITICAL' :
                     f.severity === 'high'     ? '⚠️  HIGH    ' :
                     f.severity === 'moderate' ? '   MODERATE' : '   LOW     '
      console.log(`${prefix}: ${f.pkg} — ${f.title}`)
      if (f.url) console.log(`           ${f.url}`)
      if (f.severity === 'critical') hasCritical = true
    }

    console.log(`\nFound ${found.length} advisories (${found.filter(f => f.severity === 'critical').length} critical).`)
    process.exit(hasCritical ? 1 : 0)
  })
})

req.on('error', (e) => {
  console.error('Registry request failed:', e.message)
  process.exit(1)
})
req.write(body)
req.end()
