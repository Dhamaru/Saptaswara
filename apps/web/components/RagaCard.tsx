'use client'

import Image from 'next/image'

interface RagaCardProps {
  raga: any
  onClick?: () => void
  isSelected?: boolean
}

export default function RagaCard({ raga, onClick, isSelected }: RagaCardProps) {
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
          className="object-cover opacity-70 group-hover:opacity-85 group-hover:scale-110 transition-all duration-700"
        />
        {/* Dark scrim only at bottom — keeps image visible, text readable in both themes */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
      </div>

      <div className="relative z-10 p-6 md:p-10 h-full flex flex-col justify-between">
        <div>
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/60 font-semibold">
                {raga.time_of_day || 'Universal'}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-white/40">
                {raga.thaat || 'Classic'}
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <span className={`font-mono text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-sm font-bold ${raga.tradition?.toLowerCase() === 'carnatic' ? 'bg-emerald-400/20 text-emerald-300' : 'bg-sky-400/20 text-sky-300'}`}>
                {raga.tradition || 'HINDUSTANI'}
              </span>
              {raga.melakarta_number && (
                <span className="font-mono text-[8px] uppercase tracking-widest text-white/30">
                  M#{raga.melakarta_number}
                </span>
              )}
            </div>
          </div>
          <h3 className="font-display text-4xl font-light text-white tracking-tight group-hover:text-primary-light transition-colors leading-tight">
            {raga.name}
          </h3>
          <p className="font-sans text-xs text-white/50 font-light mt-2 max-w-[200px]">
            {raga.mood || 'Traditional melodic structure'}
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-hidden">
           {raga.aroha?.slice(0, 5).map((s: string, i: number) => (
             <span key={i} className="font-label text-[10px] text-white/40 border border-white/15 px-2 py-1 rounded-md">
               {s}
             </span>
           ))}
           <span className="text-[10px] text-white/20">...</span>
        </div>
      </div>

      {/* Tonal Layering Overlay */}
      <div className="absolute inset-0 ring-1 ring-inset ring-outline-variant/10 rounded-[32px] pointer-events-none" />
    </button>
  )
}
