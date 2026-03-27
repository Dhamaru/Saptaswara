import { supabase } from '@/lib/supabase'
import { RagaCard } from '@/components/RagaCard'
import { Search, Music } from 'lucide-react'
import type { Raga } from '@saptaswara/core'

export default async function ExplorePage() {
  const { data: ragas, error } = await supabase
    .from('ragas')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    return (
      <div className="p-20 text-center">
        <h2 className="text-2xl font-bold text-red-400">Error loading ragas</h2>
        <p className="text-white/40">{error.message}</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <div className="absolute inset-0 dot-pattern opacity-20" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 glass-gold rounded-full px-4 py-1.5 text-xs font-semibold text-primary-light uppercase tracking-wider">
              <Music className="w-3 h-3" />
              {ragas?.length || 0} Ragas
            </div>
            <h1 className="text-5xl font-black text-gradient-subtle tracking-tight">Raga Library</h1>
            <p className="text-white/30 max-w-lg leading-relaxed">
              Browse the complete collection with musical metadata — frequencies, swara patterns, moods, and performance times.
            </p>
          </div>

          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
            <input
              type="text"
              placeholder="Search by name, mood, or thaat..."
              className="w-full glass rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all text-white placeholder:text-white/20"
            />
          </div>
        </header>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ragas?.map((raga: Raga) => (
            <RagaCard key={raga.id} raga={raga} />
          ))}
        </div>

        {ragas?.length === 0 && (
          <div className="text-center py-24 glass rounded-4xl border-dashed">
            <p className="text-white/30 text-lg">No ragas found in the database.</p>
          </div>
        )}
      </div>
    </div>
  )
}
