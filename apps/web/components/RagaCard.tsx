'use client'

import Image from 'next/image'

interface RagaCardProps {
  raga: any
  onClick?: () => void
  isSelected?: boolean
}

// Deterministic hash → unique visual identity per raga without extra assets
function ragaHash(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = Math.imul(31, h) + name.charCodeAt(i) | 0
  return Math.abs(h)
}

// Palette of tint colours — one picked per card by hash
const TINT_PALETTE = [
  'rgba(88,166,255,0.18)',   // sky blue
  'rgba(114,56,224,0.18)',   // indigo
  'rgba(63,185,80,0.15)',    // emerald
  'rgba(230,130,40,0.18)',   // amber
  'rgba(232,64,87,0.16)',    // rose
  'rgba(45,190,180,0.16)',   // teal
  'rgba(168,85,247,0.18)',   // violet
  'rgba(251,191,36,0.15)',   // gold
]

export default function RagaCard({ raga, onClick, isSelected }: RagaCardProps) {
  const hash    = ragaHash(raga.name || '')
  const hueShift = (hash % 24) * 15          // 0 – 345 deg, 24 steps of 15°
  const tint    = TINT_PALETTE[hash % TINT_PALETTE.length]

  const getAtmosphere = (time: string) => {
    const t = time?.toLowerCase() || ''
    if (t.includes('morning')) return '/raga_morning_atmosphere.png'
    if (t.includes('night') || t.includes('evening')) return '/raga_night_atmosphere.png'
    return '/raga_afternoon_atmosphere.png'
  }

  return (
    <button
      onClick={onClick}
      className={`group relative h-80 w-full bg-surface-lowest rounded-[32px] overflow-hidden border transition-all shadow-2xl text-left ${
        isSelected
          ? 'border-primary shadow-glow-sm scale-[1.02] ring-2 ring-primary/20'
          : 'border-outline-variant/5 hover:border-primary/40'
      }`}
    >
      {/* Immersive Background */}
      <div className="absolute inset-0 z-0">
        <Image
          src={getAtmosphere(raga.time_of_day)}
          alt={raga.name}
          fill
          className="object-cover opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700"
          style={{ filter: `hue-rotate(${hueShift}deg) saturate(1.2)` }}
        />
        {/* Per-raga tint layer — gives each card a unique colour identity */}
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 60% 30%, ${tint}, transparent 70%)` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-lowest via-surface-lowest/40 to-transparent" />
      </div>

      <div className="relative z-10 p-6 md:p-10 h-full flex flex-col justify-between">
        <div>
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] theme-primary opacity-60 font-semibold">
                {raga.time_of_day || 'Universal'}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest theme-sec opacity-40">
                {raga.thaat || 'Classic'}
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <span className={`font-mono text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-sm font-bold ${raga.tradition?.toLowerCase() === 'carnatic' ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'}`}>
                {raga.tradition || 'HINDUSTANI'}
              </span>
              {raga.melakarta_number && (
                <span className="font-mono text-[8px] uppercase tracking-widest theme-sec opacity-40">
                  M#{raga.melakarta_number}
                </span>
              )}
            </div>
          </div>
          <h3 className="font-display text-4xl font-light theme-txt tracking-tight group-hover:theme-primary transition-colors leading-tight">
            {raga.name}
          </h3>
          <p className="font-sans text-xs theme-sec opacity-60 font-light mt-2 max-w-[200px]">
            {raga.mood || 'Traditional melodic structure'}
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-hidden">
           {raga.aroha?.slice(0, 5).map((s: string, i: number) => (
             <span key={i} className="font-label text-[10px] theme-sec opacity-30 border theme-border px-2 py-1 rounded-md">
               {s}
             </span>
           ))}
           <span className="text-[10px] theme-sec opacity-20">...</span>
        </div>
      </div>

      {/* Tonal Layering Overlay */}
      <div className="absolute inset-0 ring-1 ring-inset ring-outline-variant/10 rounded-[32px] pointer-events-none" />
    </button>
  )
}
