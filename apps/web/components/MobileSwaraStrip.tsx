'use client'

import { useState, useCallback } from 'react'
import { swaraToFrequency } from '@/lib/musicalMath'

const ROWS: { swara: string; komal?: boolean; tivra?: boolean }[][] = [
  [
    { swara: 'Sa' },
    { swara: 're', komal: true },
    { swara: 'Re' },
    { swara: 'ga', komal: true },
    { swara: 'Ga' },
    { swara: 'Ma' },
    { swara: 'ma', tivra: true },
    { swara: 'Pa' },
    { swara: 'dha', komal: true },
    { swara: 'Dha' },
    { swara: 'ni', komal: true },
    { swara: 'Ni' },
    { swara: "Sa'", komal: false },
  ],
]

interface Props {
  onPlay: (freq: number, swara: string) => void
  onRelease?: () => void
  allowedSwaras?: Set<string>
  vadiSwara?: string
  samvadiSwara?: string
  octave?: number
}

function stripOctave(s: string) { return s.replace(/[\^'.]/g, '').trim() }

export function MobileSwaraStrip({ onPlay, onRelease, allowedSwaras, vadiSwara, samvadiSwara, octave = 4 }: Props) {
  const [pressed, setPressed] = useState<string | null>(null)

  const handlePress = useCallback((swara: string, rawSwara: string) => {
    const base = stripOctave(rawSwara)
    const oct = Math.min(8, rawSwara.endsWith("'") ? octave + 1 : octave)
    const freq = swaraToFrequency(base, 261.63, oct)
    if (freq) onPlay(freq, base)
    setPressed(swara)
  }, [onPlay, octave])

  const handleRelease = useCallback(() => {
    setPressed(null)
    onRelease?.()
  }, [onRelease])

  return (
    <div className="w-full overflow-x-auto scrollbar-none">
      <div className="flex gap-1.5 px-2 py-2 min-w-max">
        {ROWS[0].map(({ swara, komal, tivra }) => {
          const bare = stripOctave(swara)
          const isAllowed = allowedSwaras ? allowedSwaras.has(bare) : true
          const isVadi = vadiSwara ? stripOctave(vadiSwara) === bare : false
          const isSamvadi = samvadiSwara ? stripOctave(samvadiSwara) === bare : false
          const isPressed = pressed === swara

          let bg = 'bg-surface-container-high border-outline-variant/20 text-on-surface'
          if (!isAllowed) bg = 'bg-surface-container-high/30 border-outline-variant/8 text-on-surface-variant/20'
          else if (isVadi) bg = 'bg-amber-500/20 border-amber-400/40 text-amber-300'
          else if (isSamvadi) bg = 'bg-sky-500/20 border-sky-400/40 text-sky-300'
          else if (komal) bg = 'bg-sky-900/40 border-sky-700/30 text-sky-300/80'
          else if (tivra) bg = 'bg-amber-900/40 border-amber-700/30 text-amber-300/80'

          return (
            <button
              key={swara}
              onPointerDown={() => isAllowed && handlePress(swara, swara)}
              onPointerUp={handleRelease}
              onPointerLeave={handleRelease}
              className={`
                flex-shrink-0 w-12 h-14 rounded-xl border font-mono text-[11px] font-bold
                transition-all duration-75 select-none touch-none
                ${bg}
                ${isPressed ? 'scale-95 brightness-150' : 'active:scale-95'}
                ${!isAllowed ? 'cursor-not-allowed' : ''}
              `}
            >
              {swara === "Sa'" ? "Sa↑" : swara}
            </button>
          )
        })}
      </div>
    </div>
  )
}
