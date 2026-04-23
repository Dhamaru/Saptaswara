import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: process.env.NODE_ENV === 'production',

  tracesSampleRate: 0.2,

  // Tag every server event with route context
  initialScope: {
    tags: { app: 'saptaswara', runtime: 'server' },
  },

  beforeSend(event, hint) {
    const err = hint.originalException
    // Don't send user-caused errors to Sentry (rate limits, auth failures)
    if (err instanceof Error) {
      const msg = err.message.toLowerCase()
      if (msg.includes('unauthorized') || msg.includes('rate limit') || msg.includes('aborted')) {
        return null
      }
    }
    if (event.user) {
      delete event.user.email
      delete event.user.ip_address
    }
    return event
  },
})
