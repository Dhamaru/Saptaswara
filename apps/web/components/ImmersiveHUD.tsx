'use client'

import React from 'react'
import { usePlayback } from '@/context/PlaybackContext'

interface ImmersiveHUDProps {
  bpm: number
  loopLength: number
  onToggleTranscriber: () => void
  transcriberActive: boolean
}

export function ImmersiveHUD({ bpm, loopLength, onToggleTranscriber, transcriberActive }: ImmersiveHUDProps) {
  const { isPlaying, setIsPlaying, setIsImmersive } = usePlayback()

  const exit = () => {
    setIsImmersive(false)
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  }

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-5 py-3 rounded-full bg-surface-lowest/80 border border-outline-variant/20 backdrop-blur-xl shadow-2xl animate-fade-in">
      {/* Play / Stop */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        title={isPlaying ? 'Stop [Space]' : 'Play [Space]'}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
          isPlaying
            ? 'bg-primary text-on-primary shadow-glow scale-105'
            : 'text-on-surface-variant/60 hover:text-on-surface hover:bg-white/5'
        }`}
      >
        <span className="material-symbols-outlined !text-lg leading-none">
          {isPlaying ? 'square' : 'play_arrow'}
        </span>
      </button>

      <div className="w-px h-5 bg-outline-variant/20" />

      {/* BPM */}
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 font-bold">BPM</span>
        <span className="font-mono text-sm font-bold text-on-surface">{bpm}</span>
      </div>

      <div className="w-px h-5 bg-outline-variant/20" />

      {/* Loop length */}
      <div className="flex items-center gap-1.5">
        <span className="material-symbols-outlined !text-sm text-on-surface-variant/40">repeat</span>
        <span className="font-mono text-sm font-bold text-on-surface">{loopLength}</span>
      </div>

      <div className="w-px h-5 bg-outline-variant/20" />

      {/* Mic / SwaraTranscriber toggle */}
      <button
        onClick={onToggleTranscriber}
        title="Toggle SwaraTranscriber"
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
          transcriberActive
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            : 'text-on-surface-variant/40 hover:text-on-surface hover:bg-white/5'
        }`}
      >
        <span className="material-symbols-outlined !text-lg leading-none">mic</span>
      </button>

      <div className="w-px h-5 bg-outline-variant/20" />

      {/* Exit immersive */}
      <button
        onClick={exit}
        title="Exit immersive [F or Esc]"
        className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant/40 hover:text-on-surface hover:bg-white/5 transition-all"
      >
        <span className="material-symbols-outlined !text-lg leading-none">fullscreen_exit</span>
      </button>
    </div>
  )
}
