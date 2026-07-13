'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Fires a lightweight query on app load to wake the Supabase DB from sleep.
// Free-tier Postgres pauses after inactivity; this ensures it's warm before
// the user navigates to a data-heavy page (Library, Studio, Journal).
// Skipped on auth pages to avoid interfering with the sign-in flow.
export default function SupabaseWarmup() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname === '/login' || pathname === '/signup' || pathname.startsWith('/auth')) return
    const supabase = createClient()
    supabase.from('ragas').select('id', { count: 'exact', head: true }).then(() => {})
  }, [pathname])

  return null
}
