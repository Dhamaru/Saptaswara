'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

interface RagaContext {
  name: string
  tradition?: string
  aroha?: string[]
  avaroha?: string[]
  vadi?: string
  samvadi?: string
  mood?: string
  time_of_day?: string
  raga_phrases?: any[]
  [key: string]: any
}

interface GlobalAssistantCtx {
  ragaContext: RagaContext | null
  setRagaContext: (raga: RagaContext | null) => void
  isOpen: boolean
  openAssistant: (raga?: RagaContext | null) => void
  closeAssistant: () => void
}

const Ctx = createContext<GlobalAssistantCtx>({
  ragaContext: null,
  setRagaContext: () => {},
  isOpen: false,
  openAssistant: () => {},
  closeAssistant: () => {},
})

export function GlobalAssistantProvider({ children }: { children: React.ReactNode }) {
  const [ragaContext, setRagaContext] = useState<RagaContext | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const openAssistant = useCallback((raga?: RagaContext | null) => {
    if (raga !== undefined) setRagaContext(raga)
    setIsOpen(true)
  }, [])

  const closeAssistant = useCallback(() => setIsOpen(false), [])

  return (
    <Ctx.Provider value={{ ragaContext, setRagaContext, isOpen, openAssistant, closeAssistant }}>
      {children}
    </Ctx.Provider>
  )
}

export function useGlobalAssistant() {
  return useContext(Ctx)
}
