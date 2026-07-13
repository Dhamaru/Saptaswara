export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs')

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

      enabled: process.env.NODE_ENV === 'production',

      tracesSampleRate: 0.2,

      initialScope: {
        tags: { app: 'saptaswara', runtime: 'server' },
      },

      beforeSend(event, hint) {
        const err = hint.originalException
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
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const Sentry = await import('@sentry/nextjs')
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      enabled: process.env.NODE_ENV === 'production',
      tracesSampleRate: 0.2,
    })
  }
}
