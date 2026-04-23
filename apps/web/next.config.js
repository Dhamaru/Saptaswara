const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@saptaswara/core'],
}

module.exports = withSentryConfig(nextConfig, {
  org:     process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  disableLogger: true,
  // Non-fatal if Sentry credentials are absent (local dev without DSN)
  errorHandler(err) {
    console.warn('[Sentry] Build plugin warning:', err.message)
  },
})
