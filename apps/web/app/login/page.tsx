'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Sign in — Saptaswara'
    // Read query params client-side to avoid useSearchParams + Suspense requirement
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'confirmation_failed') {
      setError('The confirmation link has expired. Please sign up again.')
    }
    if (params.get('reset') === 'success') {
      setSuccess('Password updated. Sign in with your new password.')
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Force hard navigation to ensure cookies are sent to proxy
    window.location.href = '/dashboard'
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
            <span className="material-symbols-outlined !text-base text-primary/60">lock</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.4em] text-primary/80 font-bold">Resonance Archive</span>
          </div>
          <h1 className="font-display text-5xl font-light text-on-surface tracking-tighter mb-4">
            Welcome back.
          </h1>
          <p className="font-sans text-on-surface-variant/60 font-light">
            Sign in to resume your raga session.
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface-lowest rounded-[32px] border border-outline-variant/10 p-10 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
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
              <div className="flex items-center justify-between">
                <label className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 font-bold block">
                  Password
                </label>
                <Link href="/forgot-password" className="font-mono text-[9px] uppercase tracking-widest text-primary/50 hover:text-primary/80 transition-colors">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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

            {success && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
                <span className="material-symbols-outlined !text-base text-primary/80">check_circle</span>
                <span className="font-sans text-xs text-primary/80">{success}</span>
              </div>
            )}

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
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Enter Studio</span>
                  <span className="material-symbols-outlined !text-xl">arrow_forward</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="text-center mt-8 font-sans text-sm text-on-surface-variant/40">
          No account?{' '}
          <Link href="/signup" className="text-primary/80 hover:text-primary transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}

