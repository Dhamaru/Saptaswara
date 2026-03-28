'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const pathname = usePathname()
  
  const navLinks = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Explore', href: '/explore' },
    { name: 'Recording', href: '/studio' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 h-20 z-[100] px-8 flex items-center justify-between border-b border-outline-variant/5 bg-surface-lowest/40 backdrop-blur-xl">
      <div className="flex items-center gap-12">
        <Link href="/" className="font-display text-xl font-light tracking-tight text-on-surface hover:text-primary transition-colors">
          Saptaswara Studio
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

      <div className="flex items-center gap-8 border-l border-outline-variant/10 pl-8">
        <div className="flex items-center gap-6 text-on-surface-variant/40">
           <button className="material-symbols-outlined !text-xl hover:text-primary transition-colors">play_arrow</button>
           <button className="material-symbols-outlined !text-xl hover:text-secondary transition-colors">radio_button_checked</button>
           <button className="material-symbols-outlined !text-xl hover:text-primary transition-colors">save</button>
        </div>
        <div className="w-8 h-8 rounded-xl bg-surface-container-high border border-outline-variant/10 flex items-center justify-center">
            <span className="material-symbols-outlined !text-lg text-primary">person</span>
        </div>
      </div>
    </nav>
  )
}
