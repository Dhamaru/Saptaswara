'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const supabase = createClient()
  useEffect(() => { document.title = 'Create account — Saptaswara' }, [])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // NEXT_PUBLIC_APP_URL is set in Vercel env vars to the production URL.
    // Falls back to window.location.origin for local dev (localhost).
    const siteOrigin = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteOrigin}/auth/callback?next=/dashboard`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex items-center justify-center px-6 overflow-hidden bg-background">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary/20 to-primary-container/20 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}
        />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 px-5 py-2 mb-8 rounded-full bg-surface-container-high/40 border border-outline-variant/10 backdrop-blur-md">
            <span className="material-symbols-outlined !text-base text-primary/60">music_note</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.4em] text-primary/80 font-bold">Studio Engine v1.0</span>
          </div>
          <h1 className="font-display text-5xl font-light text-on-surface tracking-tighter mb-4">
            Begin your raga.
          </h1>
          <p className="font-sans text-on-surface-variant/60 font-light">
            Create an account to save compositions and access the archive.
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface-lowest rounded-[32px] border border-outline-variant/10 p-10 shadow-2xl">
          {success ? (
            <div className="flex flex-col items-center gap-6 py-4 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined !text-3xl text-primary">mark_email_read</span>
              </div>
              <div>
                <p className="font-display text-2xl font-light text-on-surface mb-2">Check your email.</p>
                <p className="font-sans text-sm text-on-surface-variant/60 font-light">
                  A confirmation link has been sent to <span className="text-primary/80">{email}</span>.
                </p>
              </div>
              <Link
                href="/login"
                className="font-mono text-[10px] uppercase tracking-widest text-primary/60 hover:text-primary transition-colors"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-6">
              <div className="space-y-2">
                <label className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 font-bold block">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-surface-container-low rounded-xl py-3.5 px-4 text-sm font-sans text-on-surface border border-outline-variant/10 focus:border-primary/40 focus:outline-none transition-colors placeholder:text-on-surface-variant/20"
                />
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 font-bold block">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full bg-surface-container-low rounded-xl py-3.5 px-4 text-sm font-sans text-on-surface border border-outline-variant/10 focus:border-primary/40 focus:outline-none transition-colors placeholder:text-on-surface-variant/20"
                />
              </div>

              {error && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-error/10 border border-error/20">
                  <span className="material-symbols-outlined !text-base text-error/80">error</span>
                  <span className="font-sans text-xs text-error/80">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] rounded-2xl font-medium text-white shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating account…</span>
                  </>
                ) : (
                  <>
                    <span>Start Creating</span>
                    <span className="material-symbols-outlined !text-xl">arrow_forward</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer link */}
        {!success && (
          <p className="text-center mt-8 font-sans text-sm text-on-surface-variant/40">
            Already have an account?{' '}
            <Link href="/login" className="text-primary/80 hover:text-primary transition-colors">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
