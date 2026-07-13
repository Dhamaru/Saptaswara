'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { usePlayback } from '@/context/PlaybackContext'
import { createClient } from '@/lib/supabase/client'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { useGlobalAssistant } from '@/context/GlobalAssistantContext'
import { useTheme } from '@/components/ThemeProvider'
import { Sun, Moon } from 'lucide-react'
import React from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isPlaying, setIsPlaying, triggerSave, isImmersive, setIsImmersive } = usePlayback()
  const { isOpen, openAssistant, closeAssistant } = useGlobalAssistant()
  const { theme, toggle: toggleTheme } = useTheme()

  const navLinks = [
    { name: 'Naad', href: '/studio' },
    { name: 'Ragam', href: '/library' },
    { name: 'Saadhana', href: '/riyaz' },
    { name: 'Profile', href: '/profile' },
  ]

  const [user, setUser] = React.useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const supabase = createClient()

  React.useEffect(() => {
    supabase.auth.getUser().then((res: { data: { user: User | null } }) => {
      setUser(res.data.user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAuthAction = async () => {
    if (user) {
      if (pathname?.startsWith('/studio')) {
        if (!window.confirm('Leave Studio? Unsaved changes will be lost.')) return
      }
      await supabase.auth.signOut()
      window.location.href = '/'
    } else {
      router.push('/login')
    }
  }

  if (pathname?.includes('preview')) {
    return null;
  }

  return (
    <>
    <nav className={`fixed top-0 left-0 right-0 h-16 md:h-20 z-[100] px-4 md:px-8 flex items-center justify-between border-b border-outline-variant/5 bg-surface-lowest/40 backdrop-blur-xl transition-transform duration-300 ${isImmersive ? '-translate-y-full pointer-events-none' : 'translate-y-0'}`}>
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
              className={`font-mono text-[10px] uppercase tracking-widest transition-colors duration-200 relative pb-1
                after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:bg-primary after:transition-all after:duration-300 after:content-['']
                ${pathname === link.href
                  ? 'text-primary after:w-full'
                  : 'text-on-surface-variant/40 hover:text-on-surface after:w-0'
                }`}
            >
              {link.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-surface-container-high border border-outline-variant/10 flex items-center justify-center text-on-surface-variant/50 hover:text-primary hover:border-primary/30 transition-all active:scale-95"
        >
          {theme === 'dark'
            ? <Sun className="w-4 h-4" />
            : <Moon className="w-4 h-4" />
          }
        </button>

        {/* AI Assistant toggle */}
        <button
          onClick={() => isOpen ? closeAssistant() : openAssistant()}
          title="Saptaswara AI Assistant"
          className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
            isOpen
              ? 'bg-primary/20 border-primary/40 text-primary'
              : 'bg-surface-container-high/60 border-outline-variant/10 text-on-surface-variant/50 hover:border-primary/30 hover:text-primary/80'
          }`}
        >
          <span className="material-symbols-outlined !text-base leading-none">auto_awesome</span>
          <span className="font-mono text-[9px] uppercase tracking-widest font-bold">Ask AI</span>
        </button>

        {/* Control Hub - Studio only, desktop */}
        {pathname.startsWith('/studio') && (
          <div className="hidden lg:flex items-center gap-2 p-1.5 rounded-2xl bg-surface-container-high/40 border border-outline-variant/10 backdrop-blur-md shadow-inner-glow animate-fade-in">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Stop [Space]' : 'Play [Space]'}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                isPlaying
                  ? 'bg-primary text-on-primary shadow-glow scale-105'
                  : 'text-on-surface-variant/40 hover:text-on-surface hover:bg-primary/5'
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
              className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant/40 hover:text-primary hover:bg-primary/5 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined !text-xl leading-none">save</span>
            </button>
            <div className="w-px h-6 bg-outline-variant/10 mx-1" />
            <button
              onClick={() => setIsImmersive(!isImmersive)}
              title={isImmersive ? 'Exit Focus Mode' : 'Focus Mode'}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                isImmersive
                  ? 'bg-primary/20 text-primary shadow-glow-sm'
                  : 'text-on-surface-variant/40 hover:text-primary hover:bg-primary/5'
              }`}
            >
              <span className="material-symbols-outlined !text-xl leading-none">
                {isImmersive ? 'fullscreen_exit' : 'fullscreen'}
              </span>
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
          className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-on-surface-variant/60 hover:text-on-surface hover:bg-primary/5 transition-all border border-outline-variant/10"
        >
          <span className="material-symbols-outlined !text-xl">{mobileMenuOpen ? 'close' : 'menu'}</span>
        </button>
      </div>
    </nav>

    {/* Mobile nav drawer */}
    {mobileMenuOpen && (
      <div className="fixed inset-0 z-[99] pt-16 bg-surface-lowest/95 backdrop-blur-xl md:hidden flex flex-col">
        <div className="flex flex-col px-4 py-6 gap-2">
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
          <button
            onClick={() => { isOpen ? closeAssistant() : openAssistant(); setMobileMenuOpen(false) }}
            className={`px-5 py-4 rounded-2xl font-mono text-sm uppercase tracking-widest transition-all flex items-center gap-3 ${
              isOpen
                ? 'bg-primary/15 text-primary border border-primary/20'
                : 'text-on-surface-variant/60 hover:bg-surface-container-high border border-transparent'
            }`}
          >
            <span className="material-symbols-outlined !text-lg">auto_awesome</span>
            Ask AI
          </button>
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

