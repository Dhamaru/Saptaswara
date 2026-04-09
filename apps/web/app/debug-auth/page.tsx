'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DebugAuthPage() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [cookies, setCookies] = useState('')

  // Block in production — dev diagnostic only
  if (process.env.NODE_ENV === 'production') {
    return <div className="p-12 font-mono text-xs text-on-surface">Not available.</div>
  }

  useEffect(() => {
    const supabase = createClient()
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      setLoading(false)
      setCookies(document.cookie)
    }
    checkAuth()
  }, [])

  return (
    <div className="p-12 font-mono text-xs space-y-8 bg-surface-lowest min-h-screen text-on-surface">
      <h1 className="text-2xl font-display font-light">Auth Debug Diagnostics</h1>
      
      <section className="space-y-4">
        <h2 className="text-primary font-bold uppercase tracking-widest">1. Session State</h2>
        <div className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant/10 overflow-auto max-h-60">
          {loading ? 'Checking...' : session ? (
            <pre>{JSON.stringify(session.user, null, 2)}</pre>
          ) : (
            <span className="text-error">NO ACTIVE SESSION FOUND IN BROWSER</span>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-primary font-bold uppercase tracking-widest">2. Cookie Presence</h2>
        <div className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant/10 break-all">
          {cookies ? cookies : <span className="text-error">NO COOKIES FOUND</span>}
        </div>
        <p className="text-[10px] text-on-surface-variant/40">
          Note: If `sb-fkyclveotjjvbaisfvjt-auth-token` is missing, the Middleware will reject you.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-primary font-bold uppercase tracking-widest">3. Environment Config</h2>
        <div className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant/10">
          <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
        </div>
      </section>

      <div className="pt-8">
        <button 
          onClick={() => window.location.href = '/login'}
          className="px-8 py-4 bg-primary text-white rounded-xl"
        >
          Go to Login
        </button>
      </div>
    </div>
  )
}
