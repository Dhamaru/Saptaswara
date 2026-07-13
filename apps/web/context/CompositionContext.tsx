'use client'

import React, { createContext, useContext, useReducer, useEffect, useRef, useState } from 'react'
export type { LayerType, TraditionType, InstrumentType, Layer, CompositionState, CompositionAction } from './compositionReducer'
export { STEPS, DRAFT_STORAGE_KEY, INITIAL_STATE, compositionReducer } from './compositionReducer'
import { compositionReducer, INITIAL_STATE } from './compositionReducer'
import type { CompositionState, CompositionAction } from './compositionReducer'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface CompositionContextType {
  state: CompositionState
  dispatch: React.Dispatch<CompositionAction>
  canUndo: boolean
  canRedo: boolean
}

const CompositionContext = createContext<CompositionContextType | undefined>(undefined)

export function CompositionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(compositionReducer, INITIAL_STATE)
  const [storageKey, setStorageKey] = useState<string | null>(null)

  const canUndo = state.past.length > 0
  const canRedo = state.future.length > 0

  // On mount: resolve user → derive storage key → load draft
  useEffect(() => {
    createClient().auth.getUser().then((res: { data: { user: User | null } }) => {
      const user = res.data.user
      const key = user ? `composition_${user.id}` : 'composition_guest'
      setStorageKey(key)
      try {
        const raw = localStorage.getItem(key)
        if (raw) {
          const draft = JSON.parse(raw)
          // BUG-031: validate draft is a plain object before dispatching —
          // corrupt or versioned drafts (arrays, primitives) would break the reducer
          if (draft && typeof draft === 'object' && !Array.isArray(draft)) {
            dispatch({ type: 'LOAD_DRAFT', draft })
          }
        }
      } catch { /* corrupt storage — ignore */ }
    })
  }, [])

  // Debounced auto-save (500 ms) — persists to user-scoped key
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!storageKey) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            layers:           state.layers,
            bpm:              state.bpm,
            volume:           state.volume,
            droneActive:      state.droneActive,
            activeInstrument: state.activeInstrument,
            activeTradition:  state.activeTradition,
          }),
        )
      } catch { /* storage full or unavailable */ }
    }, 500)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [
    storageKey,
    state.layers,
    state.bpm,
    state.volume,
    state.droneActive,
    state.activeInstrument,
    state.activeTradition,
  ])

  return (
    <CompositionContext.Provider value={{ state, dispatch, canUndo, canRedo }}>
      {children}
    </CompositionContext.Provider>
  )
}

export function useComposition() {
  const ctx = useContext(CompositionContext)
  if (!ctx) throw new Error('useComposition must be used within a CompositionProvider')
  return ctx
}
