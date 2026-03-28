'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Music, ArrowRight, Mail, Sparkles, Wand2 } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Check your email for the magic link!')
    }
    setLoading(false)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 bg-background overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 dot-pattern opacity-10" />
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-slide-up">
        {/* Logo/Brand */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-20 h-20 glass rounded-[2rem] flex items-center justify-center mb-6 shadow-glow border border-white/10">
            <Music className="w-10 h-10 text-primary animate-float" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">Welcome Back</h1>
          <p className="text-white/40 font-light">Enter your email to access your studio.</p>
        </div>

        {/* Login Card */}
        <div className="glass rounded-[2.5rem] p-8 shadow-2xl border border-white/5">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white/60 ml-1 uppercase tracking-wider">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-white/20 group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  type="email"
                  placeholder="name@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all placeholder:text-white/10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-4 rounded-2xl font-bold flex items-center justify-center gap-2 group transform active:scale-[0.98] transition-all"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Connect via Magic Link
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {message && (
            <div className={`mt-6 p-4 rounded-xl text-sm font-medium text-center animate-fade-in ${
              message.includes('Error') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-primary/10 text-primary-light border border-primary/20'
            }`}>
              {message}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="glass-light p-4 rounded-2xl flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">Secure Sync</span>
          </div>
          <div className="glass-light p-4 rounded-2xl flex items-center gap-3">
            <Wand2 className="w-5 h-5 text-accent" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">AI Ready</span>
          </div>
        </div>
      </div>
    </div>
  )
}
