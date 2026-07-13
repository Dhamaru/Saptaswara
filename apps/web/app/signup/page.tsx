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
  const [showPassword, setShowPassword] = useState(false)

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
            <>
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
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full bg-surface-container-low rounded-xl py-3.5 pl-4 pr-11 text-sm font-sans text-on-surface border border-outline-variant/10 focus:border-primary/40 focus:outline-none transition-colors placeholder:text-on-surface-variant/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/30 hover:text-on-surface-variant transition-colors"
                    tabIndex={-1}
                  >
                    <span className="material-symbols-outlined !text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
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
                className="w-full py-4 rounded-2xl font-medium text-on-primary shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
                style={{ background: 'linear-gradient(to right, var(--primary), var(--accent))' }}
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

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-outline-variant/10" />
              <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/30">or</span>
              <div className="flex-1 h-px bg-outline-variant/10" />
            </div>

            <button
              type="button"
              onClick={() => {
                const origin = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
                supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: { redirectTo: `${origin}/auth/callback?next=/dashboard` },
                })
              }}
              className="w-full py-3.5 rounded-2xl border border-outline-variant/20 bg-surface-container-low flex items-center justify-center gap-3 font-sans text-sm text-on-surface hover:border-primary/30 hover:bg-surface-container-high transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              <span>Continue with Google</span>
            </button>
            </>
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
