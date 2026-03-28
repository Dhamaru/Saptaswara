'use client'

import React, { useState } from 'react'
import { audioEngine } from '@/lib/audio'

interface PianoProps {
  activeRagaNotes: string[] 
  onNoteClick?: (note: string, freq: number) => void
  layout: 'Piano' | 'Harmonium' | 'Swara'
}

const NOTES_IN_OCTAVE = [
  { name: 'Sa', offset: 0, isBlack: false },
  { name: 're', offset: 1, isBlack: true, label: 'rk' },
  { name: 'Re', offset: 2, isBlack: false },
  { name: 'ga', offset: 3, isBlack: true, label: 'gk' },
  { name: 'Ga', offset: 4, isBlack: false },
  { name: 'Ma', offset: 5, isBlack: false },
  { name: 'ma', offset: 6, isBlack: true, label: 'M#' },
  { name: 'Pa', offset: 7, isBlack: false },
  { name: 'dha', offset: 8, isBlack: true, label: 'dk' },
  { name: 'Dha', offset: 9, isBlack: false },
  { name: 'ni', offset: 10, isBlack: true, label: 'nk' },
  { name: 'Ni', offset: 11, isBlack: false },
]

export default function Piano({ activeRagaNotes, onNoteClick, layout }: PianoProps) {
  const [playingNote, setPlayingNote] = useState<string | null>(null)

  const rootFreq = 261.63 // C4
  
  const getFrequency = (offset: number, octave: number) => {
    return rootFreq * Math.pow(2, octave - 4) * Math.pow(2, offset / 12)
  }

  const handlePlay = (noteName: string, freq: number) => {
    if (audioEngine) {
      audioEngine.playSwara(freq)
      setPlayingNote(noteName)
      setTimeout(() => setPlayingNote(null), 200)
    }
    onNoteClick?.(noteName, freq)
  }

  const octaves = [3, 4, 5]

  // Laptop Keyboard Mapping
  const KEY_MAP: Record<string, { offset: number, octave: number, label: string }> = {
    'a': { offset: 0, octave: 4, label: 'Sa' },
    'w': { offset: 1, octave: 4, label: 're' },
    's': { offset: 2, octave: 4, label: 'Re' },
    'e': { offset: 3, octave: 4, label: 'ga' },
    'd': { offset: 4, octave: 4, label: 'Ga' },
    'f': { offset: 5, octave: 4, label: 'Ma' },
    't': { offset: 6, octave: 4, label: 'ma' },
    'g': { offset: 7, octave: 4, label: 'Pa' },
    'y': { offset: 8, octave: 4, label: 'dha' },
    'h': { offset: 9, octave: 4, label: 'Dha' },
    'u': { offset: 10, octave: 4, label: 'ni' },
    'j': { offset: 11, octave: 4, label: 'Ni' },
    'k': { offset: 0, octave: 5, label: 'Sa' },
  }

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return

      const mapping = KEY_MAP[e.key.toLowerCase()]
      if (mapping) {
        const freq = getFrequency(mapping.offset, mapping.octave)
        handlePlay(`${mapping.label}${mapping.octave}`, freq)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeRagaNotes]) // Re-bind if raga context changes
  
  if (layout === 'Swara') {
     return (
       <div className="flex gap-4 h-64 w-full overflow-x-auto pb-6 scroll-thin">
         {(activeRagaNotes.length > 0 ? activeRagaNotes : ['Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni']).map((note, i) => (
            <button
              key={i}
              onClick={() => handlePlay(note, getFrequency(NOTES_IN_OCTAVE.find(n => n.name === note)?.offset || 0, 4))}
              className={`flex-1 min-w-[140px] rounded-[32px] border transition-all flex flex-col items-center justify-center gap-6 ${
                playingNote === note 
                  ? 'bg-primary border-primary shadow-glow scale-95' 
                  : 'bg-surface-container-high border-outline-variant/20 hover:border-primary/40'
              }`}
            >
              <span className="font-display text-5xl font-light text-on-surface">{note}</span>
              <div className="w-2 h-2 rounded-full bg-primary/60" />
            </button>
         ))}
       </div>
     )
  }

  return (
    <div className="relative h-[440px] w-full bg-[#0a0a0c] rounded-[48px] border border-outline-variant/10 p-12 flex items-start justify-center overflow-hidden shadow-2xl">
      <div className="relative flex">
        {octaves.map(octave => (
          <div key={octave} className="relative w-[448px] h-80 shrink-0">
            {/* White Keys - HIGH CONTRAST (Ivory) */}
            <div className="absolute top-0 left-0 flex">
              {NOTES_IN_OCTAVE.filter(n => !n.isBlack).map((note, i) => {
                const freq = getFrequency(note.offset, octave)
                const isActive = activeRagaNotes.includes(note.name)
                const isPlaying = playingNote === `${note.name}${octave}`

                return (
                  <button
                    key={i}
                    onMouseDown={() => handlePlay(`${note.name}${octave}`, freq)}
                    className={`relative w-16 h-80 border-x border-b border-outline-variant/20 rounded-b-3xl transition-all shadow-xl ${
                      isPlaying 
                        ? 'bg-primary shadow-glow brightness-125 translate-y-2' 
                        : 'bg-[#fafafa]' 
                    }`}
                  >
                     {isActive && (
                       <div className="absolute top-0 left-0 right-0 h-1 bg-primary/40" />
                     )}
                     <span className={`absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[11px] uppercase tracking-widest font-bold ${isPlaying ? 'text-white' : 'text-primary/60'}`}>
                        {note.name}
                     </span>
                  </button>
                )
              })}
            </div>

            {/* Black Keys - HIGH CONTRAST (Ebony) */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
              {NOTES_IN_OCTAVE.map((note, i) => {
                if (!note.isBlack) return null
                
                const freq = getFrequency(note.offset, octave)
                const isActive = activeRagaNotes.includes(note.name)
                const isPlaying = playingNote === `${note.name}${octave}`
                
                // Count white keys before this black key to find its position
                const whiteKeysBefore = NOTES_IN_OCTAVE.slice(0, i).filter(n => !n.isBlack).length
                
                return (
                  <button
                    key={i}
                    onMouseDown={(e) => {
                       e.stopPropagation();
                       handlePlay(`${note.name}${octave}`, freq)
                    }}
                    className={`pointer-events-auto absolute top-0 w-11 h-48 -translate-x-1/2 rounded-b-2xl border border-white/5 transition-all z-20 shadow-2xl ${
                      isPlaying 
                        ? 'bg-primary shadow-glow brightness-150 translate-y-2' 
                        : 'bg-[#121214] border-outline-variant/20 hover:bg-[#1a1a1c]'
                    }`}
                    style={{ left: `${whiteKeysBefore * 64}px` }}
                  >
                     {isActive && (
                        <span className={`absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[9px] uppercase font-bold ${isPlaying ? 'text-white' : 'text-primary/60'}`}>
                           {note.label}
                        </span>
                     )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-8 px-10 py-3.5 rounded-full bg-surface-container-high/80 border border-primary/20 backdrop-blur-2xl shadow-glow">
         <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-glow animate-pulse" />
            <span className="font-mono text-[11px] uppercase tracking-widest text-on-surface font-bold">{layout} Mode ACTIVE</span>
         </div>
         <div className="w-px h-5 bg-outline-variant/30" />
         <span className="font-mono text-[11px] uppercase tracking-widest text-primary font-bold">Resonant Studio v2.2</span>
      </div>
    </div>
  )
}
