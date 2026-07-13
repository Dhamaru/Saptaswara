'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export type Script = 'latin' | 'devanagari'

const STORAGE_KEY = 'saptaswara:script'

export const SWARA_DEVANAGARI: Record<string, string> = {
  Sa: 'स', Re: 'रे', Ga: 'ग', Ma: 'म',
  Pa: 'प', Dha: 'ध', Ni: 'नि',
  re: 'रे॒', ga: 'ग॒', dha: 'ध॒', ni: 'नि॒',
  ma: 'म॑',
}

interface ScriptContextType {
  script: Script
  toggle: () => void
  renderSwara: (latin: string) => string
}

const ScriptContext = createContext<ScriptContextType | undefined>(undefined)

export function ScriptProvider({ children }: { children: React.ReactNode }) {
  const [script, setScript] = useState<Script>('latin')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Script | null
      if (stored === 'latin' || stored === 'devanagari') setScript(stored)
    } catch { /* storage unavailable */ }
  }, [])

  const toggle = useCallback(() => {
    setScript(prev => {
      const next: Script = prev === 'latin' ? 'devanagari' : 'latin'
      try { localStorage.setItem(STORAGE_KEY, next) } catch { /* ignore */ }
      return next
    })
  }, [])

  const renderSwara = useCallback((latin: string) => {
    if (script === 'devanagari') return SWARA_DEVANAGARI[latin] ?? latin
    return latin
  }, [script])

  return (
    <ScriptContext.Provider value={{ script, toggle, renderSwara }}>
      {children}
    </ScriptContext.Provider>
  )
}

export function useScript() {
  const ctx = useContext(ScriptContext)
  if (!ctx) throw new Error('useScript must be used within a ScriptProvider')
  return ctx
}
