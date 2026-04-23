'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

interface PlaybackContextType {
  isPlaying: boolean
  setIsPlaying: (val: boolean) => void
  isRecording: boolean
  setIsRecording: (val: boolean) => void
  currentRagaId: string | null
  setCurrentRagaId: (id: string | null) => void
  saveTriggered: number
  triggerSave: () => void
  isImmersive: boolean
  setIsImmersive: (val: boolean) => void
}

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined)

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [currentRagaId, setCurrentRagaId] = useState<string | null>(null)
  const [saveTriggered, setSaveTriggered] = useState(0)
  const [isImmersive, setIsImmersive] = useState(false)

  const triggerSave = useCallback(() => {
    setSaveTriggered(prev => prev + 1)
  }, [])

  return (
    <PlaybackContext.Provider value={{
      isPlaying,
      setIsPlaying,
      isRecording,
      setIsRecording,
      currentRagaId,
      setCurrentRagaId,
      saveTriggered,
      triggerSave,
      isImmersive,
      setIsImmersive,
    }}>
      {children}
    </PlaybackContext.Provider>
  )
}

export function usePlayback() {
  const context = useContext(PlaybackContext)
  if (context === undefined) {
    throw new Error('usePlayback must be used within a PlaybackProvider')
  }
  return context
}
