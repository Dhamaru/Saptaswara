'use client'

import { useState, useEffect } from 'react'
import { Music, Calendar, ChevronRight, Trash2, FolderOpen, Plus, Sparkles, Clock, Sunrise } from 'lucide-react'
import Link from 'next/link'
import OnboardingModal from '@/components/OnboardingModal'

interface RagaOfDay {
  id: string
  name: string
  mood: string | null
  time_of_day: string | null
  vadi: string | null
  aroha: string[] | null
  prahara: number
  praharaLabel: string
  praharaName: string
}

interface Project {
  id: string
  title: string
  raga_id: string
  updated_at: string
  ragas: {
    name: string
  }
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [ragaOfDay, setRagaOfDay] = useState<RagaOfDay | null>(null)

  useEffect(() => {
    fetch('/api/ragas/today')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setRagaOfDay(d) })
      .catch(() => {})
  }, [])

  // BUG-036: use AbortController so fetch is cancelled if component unmounts
  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      try {
        const res = await fetch('/api/projects', { signal: controller.signal })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setProjects(data)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        console.error('Error fetching projects:', err)
      } finally {
        setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [])

  async function deleteProject(id: string) {
    if (!confirm('Are you sure you want to delete this project?')) return
    try {
      const res = await fetch(`/api/projects?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      // BUG-035: functional setState avoids stale closure over projects
      setProjects(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      console.error('Error deleting project:', err)
    }
  }

  return (
    <div className="relative min-h-screen">
      <OnboardingModal />
      {/* Background */}
      <div className="absolute inset-0 dot-pattern opacity-20" />
      <div className="absolute top-20 left-1/3 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 mb-14">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 glass-gold rounded-full px-4 py-1.5 text-xs font-semibold text-primary-light uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              {projects.length} Project{projects.length !== 1 ? 's' : ''}
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-gradient-subtle tracking-tight">My Studio</h1>
            <p className="text-on-surface-variant/40">Your saved raga compositions and musical ideas.</p>
          </div>
          <Link
            href="/studio"
            className="btn-primary flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-5 h-5" />
            New Composition
          </Link>
        </header>

        {/* Raga of the Day */}
        {ragaOfDay && (
          <div className="mb-10 glass rounded-3xl overflow-hidden border border-primary/10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 sm:p-8">
              <div className="w-14 h-14 rounded-2xl glass-gold flex items-center justify-center shrink-0">
                <Sunrise className="w-7 h-7 text-primary-light" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-primary/60 font-bold">Raga of the Moment</span>
                  <span className="flex items-center gap-1 font-mono text-[9px] text-on-surface-variant/40">
                    <Clock className="w-3 h-3" />{ragaOfDay.praharaName} · {ragaOfDay.praharaLabel}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-gradient-subtle mb-1">{ragaOfDay.name}</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ragaOfDay.mood && (
                    <span className="px-2.5 py-1 rounded-lg glass-light text-[10px] font-mono text-on-surface-variant/60 capitalize">{ragaOfDay.mood}</span>
                  )}
                  {ragaOfDay.vadi && (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-400/10 border border-amber-400/20 text-[10px] font-mono text-amber-300">Vadi: {ragaOfDay.vadi}</span>
                  )}
                  {ragaOfDay.aroha && (
                    <span className="px-2.5 py-1 rounded-lg glass-light text-[10px] font-mono text-primary/60">
                      {ragaOfDay.aroha.join(' – ')}
                    </span>
                  )}
                </div>
              </div>
              <Link
                href={`/studio?raga_id=${ragaOfDay.id}`}
                className="btn-primary flex items-center gap-2 shrink-0 self-start sm:self-auto"
              >
                <Music className="w-4 h-4" />
                Explore Now
              </Link>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-56 rounded-3xl glass animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-28 glass rounded-4xl border-dashed border-white/5">
            <div className="w-20 h-20 rounded-3xl glass-light flex items-center justify-center mx-auto mb-8">
              <FolderOpen className="w-10 h-10 text-on-surface-variant/20" />
            </div>
            <h2 className="text-2xl font-bold text-on-surface mb-3">No compositions yet</h2>
            <p className="text-on-surface-variant/40 mb-10 max-w-sm mx-auto">
              Start your first musical journey in the Studio. Choose a raga and begin composing.
            </p>
            <Link href="/studio" className="btn-primary inline-flex items-center gap-2">
              <Music className="w-5 h-5" />
              Go to Studio
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group card relative overflow-hidden"
              >
                {/* Hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-5">
                    <div className="w-12 h-12 rounded-2xl glass-gold flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Music className="w-6 h-6 text-primary-light" />
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); deleteProject(project.id); }}
                      className="p-2.5 text-on-surface-variant/30 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-lg font-bold text-on-surface mb-1 truncate">
                    {project.title || 'Untitled Project'}
                  </h3>
                  <p className="text-primary-light text-sm font-semibold mb-5">
                    Raga {project.ragas?.name || 'Unknown'}
                  </p>

                  <div className="flex items-center gap-2 text-on-surface-variant/30 text-xs mb-6">
                    <Calendar className="w-3 h-3" />
                    {new Date(project.updated_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </div>

                  <Link
                    href={`/studio?raga_id=${project.raga_id}&project_id=${project.id}`}
                    className="w-full py-3 glass-light hover:bg-primary/10 text-on-surface rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    Open in Studio
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
