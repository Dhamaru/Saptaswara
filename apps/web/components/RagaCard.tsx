import React from 'react'
import Link from 'next/link'
import { Sun, Moon, Sunset, Clock, ArrowUpRight } from 'lucide-react'
import type { Raga } from '@saptaswara/core'

interface RagaCardProps {
  raga: Raga
}

function getTimeIcon(time: string) {
  const t = time.toLowerCase()
  if (t.includes('morning') || t.includes('dawn')) return <Sun className="w-4 h-4 text-amber-400" />
  if (t.includes('evening') || t.includes('dusk') || t.includes('sunset')) return <Sunset className="w-4 h-4 text-orange-400" />
  if (t.includes('night') || t.includes('late')) return <Moon className="w-4 h-4 text-indigo-400" />
  return <Clock className="w-4 h-4 text-slate-400" />
}

export function RagaCard({ raga }: RagaCardProps) {
  return (
    <div className="group card relative overflow-hidden">
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-5">
          <div>
            <h3 className="text-2xl font-bold text-white group-hover:text-primary-light transition-colors duration-300">
              {raga.name}
            </h3>
            <span className="text-xs text-white/30 font-semibold uppercase tracking-widest">{raga.thaat} Thaat</span>
          </div>
          <div className="glass-light rounded-xl p-2.5">
            {getTimeIcon(raga.time_of_day)}
          </div>
        </div>

        {/* Swara Pills */}
        <div className="flex gap-1.5 mb-5 flex-wrap">
          <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary-light text-xs font-bold border border-primary/20">
            V: {raga.vadi}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-accent/10 text-accent-light text-xs font-bold border border-accent/20">
            S: {raga.samvadi}
          </span>
        </div>

        {/* Aroha */}
        <div className="glass-light rounded-2xl p-4 mb-5">
          <div className="text-[9px] uppercase tracking-[0.25em] text-white/25 font-bold mb-2">Aroha</div>
          <div className="flex gap-2 flex-wrap text-sm font-bold">
            {raga.aroha.map((s, i) => (
              <span key={i} className="text-primary-light">{s}</span>
            ))}
          </div>
        </div>

        {/* Mood */}
        {raga.mood && (
          <p className="text-sm text-white/30 line-clamp-2 leading-relaxed italic mb-5">
            &ldquo;{raga.mood}&rdquo;
          </p>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-white/5">
          <span className="text-xs text-white/25 font-medium flex items-center gap-1.5">
            {getTimeIcon(raga.time_of_day)}
            {raga.time_of_day}
          </span>
          <Link 
            href={`/studio`} 
            className="flex items-center gap-1 text-primary text-xs font-bold hover:text-primary-light transition-colors"
          >
            Open in Studio
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}
