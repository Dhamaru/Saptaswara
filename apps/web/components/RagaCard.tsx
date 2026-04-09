'use client'

import Image from 'next/image'

interface RagaCardProps {
  raga: any
  onClick?: () => void
}

export default function RagaCard({ raga, onClick }: RagaCardProps) {
  // Map time-of-day to generated assets
  const getAtmosphere = (time: string) => {
    const t = time?.toLowerCase() || ''
    if (t.includes('morning')) return '/raga_morning_atmosphere.png'
    if (t.includes('night') || t.includes('evening')) return '/raga_night_atmosphere.png'
    return '/raga_afternoon_atmosphere.png'
  }

  return (
    <button 
      onClick={onClick}
      className="group relative h-80 w-full bg-surface-lowest rounded-[32px] overflow-hidden border border-outline-variant/5 hover:border-primary/40 transition-all shadow-2xl text-left"
    >
      {/* Immersive Background */}
      <div className="absolute inset-0 z-0">
        <Image 
          src={getAtmosphere(raga.time_of_day)} 
          alt={raga.name}
          fill
          className="object-cover opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-lowest via-surface-lowest/40 to-transparent" />
      </div>

      <div className="relative z-10 p-10 h-full flex flex-col justify-between">
        <div>
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary/60 font-semibold">
                {raga.time_of_day || 'Universal'}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40">
                {raga.thaat || 'Classic'}
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <span className={`font-mono text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-sm font-bold ${raga.tradition?.toLowerCase() === 'carnatic' ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'}`}>
                {raga.tradition || 'HINDUSTANI'}
              </span>
              {raga.melakarta_number && (
                <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40">
                  M#{raga.melakarta_number}
                </span>
              )}
            </div>
          </div>
          <h3 className="font-display text-4xl font-light text-on-surface tracking-tight group-hover:text-primary transition-colors leading-tight">
            {raga.name}
          </h3>
          <p className="font-sans text-xs text-on-surface-variant/60 font-light mt-2 max-w-[200px]">
            {raga.mood || 'Traditional melodic structure'}
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-hidden">
           {raga.aroha?.slice(0, 5).map((s: string, i: number) => (
             <span key={i} className="font-label text-[10px] text-on-surface-variant/30 border border-outline-variant/10 px-2 py-1 rounded-md">
               {s}
             </span>
           ))}
           <span className="text-[10px] text-on-surface-variant/20">...</span>
        </div>
      </div>

      {/* Tonal Layering Overlay */}
      <div className="absolute inset-0 ring-1 ring-inset ring-white/5 rounded-[32px] pointer-events-none" />
    </button>
  )
}
