'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Listens to Supabase auth state changes and redirects to /login on sign-out.
 * Mount once in the root layout to keep auth state in sync across navigations.
 */
export default function AuthListener() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  return null
}
