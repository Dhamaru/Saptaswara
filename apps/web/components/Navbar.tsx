'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { usePlayback } from '@/context/PlaybackContext'
import { createClient } from '@/lib/supabase/client'
import React from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isPlaying, setIsPlaying, triggerSave } = usePlayback()

  const navLinks = [
    { name: 'Naad', href: '/studio' },
    { name: 'Ragam', href: '/library' },
    { name: 'Sadhana', href: '/journal' },
  ]

  const [user, setUser] = React.useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const supabase = createClient()

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAuthAction = async () => {
    if (user) {
      await supabase.auth.signOut()
      window.location.href = '/'
    } else {
      router.push('/login')
    }
  }

  return (
    <>
    <nav className="fixed top-0 left-0 right-0 h-16 md:h-20 z-[100] px-4 md:px-8 flex items-center justify-between border-b border-outline-variant/5 bg-surface-lowest/40 backdrop-blur-xl">
      <div className="flex items-center gap-6 md:gap-12">
        <Link href="/" className="group flex items-center gap-3 transition-all">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl overflow-hidden border border-primary/20 shadow-glow group-hover:scale-110 transition-transform">
            <img src="/logo.png" alt="Saptaswara Logo" className="w-full h-full object-cover scale-150" />
          </div>
          <span className="font-display text-lg md:text-xl font-light tracking-tight text-on-surface group-hover:text-primary transition-colors">
            Saptaswara
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-mono text-[10px] uppercase tracking-widest transition-all ${
                pathname === link.href
                  ? 'text-primary'
                  : 'text-on-surface-variant/40 hover:text-on-surface'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        {/* Control Hub - Studio only, desktop */}
        {pathname.startsWith('/studio') && (
          <div className="hidden lg:flex items-center gap-2 p-1.5 rounded-2xl bg-surface-container-high/40 border border-outline-variant/10 backdrop-blur-md shadow-inner-glow animate-fade-in">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Stop [Space]' : 'Play [Space]'}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                isPlaying
                  ? 'bg-primary text-on-primary shadow-glow scale-105'
                  : 'text-on-surface-variant/40 hover:text-on-surface hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined !text-xl leading-none">
                {isPlaying ? 'square' : 'play_arrow'}
              </span>
            </button>
            <div className="w-px h-6 bg-outline-variant/10 mx-1" />
            <button
              onClick={triggerSave}
              title="Save Composition [Ctrl+S]"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant/40 hover:text-primary hover:bg-white/5 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined !text-xl leading-none">save</span>
            </button>
          </div>
        )}

        {/* User Profile */}
        <button
          title={user ? `Signed in as ${user.email} — Click to Logout` : 'Sign In'}
          onClick={handleAuthAction}
          className={`w-9 h-9 md:w-10 md:h-10 rounded-xl bg-surface-container-high border flex items-center justify-center transition-all active:scale-95 group overflow-hidden relative ${user ? 'border-primary/60' : 'border-outline-variant/10 hover:border-primary/40'}`}
        >
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className={`material-symbols-outlined !text-xl transition-colors ${user ? 'text-primary' : 'text-primary/60 group-hover:text-primary'}`}>
            {user ? 'logout' : 'person'}
          </span>
        </button>

        {/* Hamburger — mobile only */}
        <button
          onClick={() => setMobileMenuOpen(v => !v)}
          className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-on-surface-variant/60 hover:text-on-surface hover:bg-white/5 transition-all border border-outline-variant/10"
        >
          <span className="material-symbols-outlined !text-xl">{mobileMenuOpen ? 'close' : 'menu'}</span>
        </button>
      </div>
    </nav>

    {/* Mobile nav drawer */}
    {mobileMenuOpen && (
      <div className="fixed inset-0 z-[99] pt-16 bg-surface-lowest/95 backdrop-blur-xl md:hidden flex flex-col">
        <div className="flex flex-col p-6 gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`px-5 py-4 rounded-2xl font-mono text-sm uppercase tracking-widest transition-all ${
                pathname === link.href
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'text-on-surface-variant/60 hover:bg-surface-container-high border border-transparent'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>
        {pathname.startsWith('/studio') && (
          <div className="px-6 pt-4 border-t border-outline-variant/10 flex gap-3">
            <button
              onClick={() => { setIsPlaying(!isPlaying); setMobileMenuOpen(false) }}
              className={`flex-1 py-4 rounded-2xl font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                isPlaying ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface border border-outline-variant/10'
              }`}
            >
              <span className="material-symbols-outlined !text-lg">{isPlaying ? 'square' : 'play_arrow'}</span>
              {isPlaying ? 'Stop' : 'Play'}
            </button>
            <button
              onClick={() => { triggerSave(); setMobileMenuOpen(false) }}
              className="flex-1 py-4 rounded-2xl font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2 bg-surface-container-high text-on-surface border border-outline-variant/10"
            >
              <span className="material-symbols-outlined !text-lg">save</span>
              Save
            </button>
          </div>
        )}
      </div>
    )}
    </>
  )
}

