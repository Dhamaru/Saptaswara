'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Music, LayoutDashboard, Compass, Sparkles } from 'lucide-react'

export default function Navbar() {
  const pathname = usePathname()

  const navItems = [
    { name: 'Explore', href: '/explore', icon: Compass },
    { name: 'Studio', href: '/studio', icon: Music },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gradient-gold tracking-tight">
              Saptaswara
            </span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'glass-gold text-primary-light'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              )
            })}
          </div>

          {/* Profile dot */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent border border-white/10 cursor-pointer hover:scale-110 transition-transform shadow-glow" />
        </div>
      </div>
    </nav>
  )
}
