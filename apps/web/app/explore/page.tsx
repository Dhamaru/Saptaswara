'use client'

import { useState, useEffect } from 'react'
import RagaCard from '@/components/RagaCard'
import { createClient } from '@/lib/supabase/client'

const FILTERS = ['ALL', 'MORNING', 'AFTERNOON', 'EVENING', 'NIGHT']

export default function ExplorePage() {
  const [ragas, setRagas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRaga, setSelectedRaga] = useState<any | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    async function fetchRagas() {
      try {
        const { data, error } = await supabase.from('ragas').select('*').order('name')
        if (error) throw error
        setRagas(data || [])
      } catch (err) {
        console.error('Failed to fetch ragas:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchRagas()
  }, [])

  const filteredRagas = ragas.filter(r => {
    const matchesFilter = activeFilter === 'ALL' || r.time_of_day?.toUpperCase().includes(activeFilter)
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.mood?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-background">
      {/* Main Library View */}
      <main className="flex-1 overflow-y-auto px-12 py-16 scroll-thin">
        <header className="mb-20">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-6 opacity-60">Raga Library</div>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12">
            <div className="max-w-xl">
              <h1 className="font-display text-7xl font-light text-on-surface tracking-tight mb-8">
                Explore.
              </h1>
              <p className="font-sans text-lg text-on-surface-variant font-light leading-relaxed opacity-70">
                Navigate the geometric structures of melodic time. Select a raga to explore its intervals, moods, and fundamental swaras.
              </p>
            </div>
            
            <div className="flex flex-col gap-6 lg:w-96">
               <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/40 group-focus-within:text-primary transition-colors">search</span>
                  <input 
                    placeholder="Search Ragas, Moods, Thaats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface-container-low/40 rounded-2xl py-4 pl-12 pr-6 text-sm font-sans placeholder:text-on-surface-variant/20 border border-outline-variant/10 focus:border-primary/40 focus:bg-surface-lowest transition-all outline-none backdrop-blur-md"
                  />
               </div>
               <div className="flex flex-wrap gap-2">
                  {FILTERS.map(f => (
                    <button
                      key={f}
                      onClick={() => setActiveFilter(f)}
                      className={`px-4 py-1.5 rounded-full font-mono text-[9px] uppercase tracking-widest transition-all ${
                        activeFilter === f 
                          ? 'bg-primary/20 text-primary border border-primary/30 shadow-glow' 
                          : 'bg-surface-container-low/20 text-on-surface-variant/40 border border-outline-variant/5 hover:border-outline-variant/20'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
               </div>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 rounded-[32px] bg-surface-lowest/50 animate-pulse border border-outline-variant/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredRagas.map((raga) => (
              <RagaCard key={raga.id} raga={raga} onClick={() => setSelectedRaga(raga)} />
            ))}
            
            {/* Load More Card */}
            <button className="h-80 rounded-[32px] border-2 border-dashed border-outline-variant/10 flex flex-col items-center justify-center gap-4 text-on-surface-variant/20 hover:text-primary/40 hover:border-primary/20 transition-all group">
               <span className="material-symbols-outlined !text-4xl group-hover:scale-110 transition-transform">add_circle</span>
               <span className="font-mono text-[10px] uppercase tracking-widest">Connect Dataset</span>
            </button>
          </div>
        )}
      </main>

      {/* Recessed Selection Sidebar (Theory Detail) */}
      <aside className={`w-[450px] bg-surface-lowest border-l border-outline-variant/10 flex flex-col transition-all duration-500 transform ${selectedRaga ? 'translate-x-0' : 'translate-x-full absolute right-0 h-full'}`}>
        {selectedRaga && (
          <div className="flex flex-col h-full overflow-y-auto scroll-thin">
            <div className="p-12 relative overflow-hidden h-[400px]">
               {/* Detail Header Background */}
               <div className="absolute inset-0 z-0">
                  <RagaCard raga={selectedRaga} /> {/* Using card for backdrop style */}
                  <div className="absolute inset-0 bg-surface-lowest/80 backdrop-blur-2xl" />
               </div>
               
               <div className="relative z-10 flex flex-col h-full justify-between">
                  <button onClick={() => setSelectedRaga(null)} className="flex items-center gap-2 text-on-surface-variant/40 hover:text-on-surface transition-colors mb-8">
                     <span className="material-symbols-outlined !text-xl">close</span>
                     <span className="font-mono text-[10px] uppercase tracking-widest">Dismiss Detail</span>
                  </button>
                  
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-widest text-primary mb-4 block font-bold">{selectedRaga.time_of_day}</span>
                    <h2 className="font-display text-6xl font-light text-on-surface mb-4 tracking-tighter">{selectedRaga.name}</h2>
                    <p className="text-on-surface-variant/60 font-sans font-light italic text-lg leading-relaxed max-w-sm">
                       "{selectedRaga.mood}"
                    </p>
                  </div>
               </div>
            </div>

            <div className="px-12 py-10 space-y-12">
               <section>
                 <div className="font-mono text-[10px] uppercase tracking-widest text-primary/60 mb-6">Melodic Structure</div>
                 <div className="grid grid-cols-2 gap-8">
                    <div>
                       <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 block mb-3">Vadi (Primary)</span>
                       <span className="font-display text-3xl font-light text-on-surface">{selectedRaga.vadi || 'Ma'}</span>
                    </div>
                    <div>
                       <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 block mb-3">Samvadi (Secondary)</span>
                       <span className="font-display text-3xl font-light text-on-surface">{selectedRaga.samvadi || 'Sa'}</span>
                    </div>
                 </div>
               </section>

               <section className="space-y-6">
                 <div>
                   <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 block mb-4">Aroha (Ascending)</span>
                   <div className="flex flex-wrap gap-2">
                      {selectedRaga.aroha?.map((s: string, i: number) => (
                        <span key={i} className="font-label text-sm text-on-surface border border-outline-variant/10 px-4 py-2 rounded-xl bg-surface-container-low/20">
                           {s}
                        </span>
                      ))}
                   </div>
                 </div>
                 <div>
                   <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 block mb-4">Avaroha (Descending)</span>
                   <div className="flex flex-wrap gap-2">
                      {selectedRaga.avaroha?.map((s: string, i: number) => (
                        <span key={i} className="font-label text-sm text-on-surface border border-outline-variant/10 px-4 py-2 rounded-xl bg-surface-container-low/20">
                           {s}
                        </span>
                      ))}
                   </div>
                 </div>
               </section>

               <section>
                 <div className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/40 mb-6">Pakad (Signature Phrase)</div>
                 <p className="font-label text-lg text-primary/80 font-medium leading-relaxed tracking-wide">
                    {selectedRaga.aroha?.slice(0, 4).join(' - ')} ... {selectedRaga.avaroha?.slice(-3).join(' - ')}
                 </p>
               </section>

               <div className="pt-8">
                 <button className="w-full py-5 bg-gradient-to-r from-primary to-primary-container rounded-2xl font-medium text-white shadow-glow hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                    <span className="material-symbols-outlined">auto_fix_high</span>
                    Compose in this Raga
                 </button>
               </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
