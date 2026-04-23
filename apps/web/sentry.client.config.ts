import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only send events in production — never in local dev
  enabled: process.env.NODE_ENV === 'production',

  // Sample 20% of traces to stay within free tier
  tracesSampleRate: 0.2,

  // Capture replays only on errors
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,

  integrations: [
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: false }),
  ],

  // Tag every event with app-level context
  initialScope: {
    tags: { app: 'saptaswara', platform: 'web' },
  },

  beforeSend(event) {
    // Strip any PII from user fields before sending
    if (event.user) {
      delete event.user.email
      delete event.user.ip_address
    }
    return event
  },
})
