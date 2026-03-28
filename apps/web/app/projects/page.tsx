import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import React from 'react'

// Custom relative time formatter to avoid external dependencies
function formatTimeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays === 1) return 'yesterday'
  return `${diffInDays} days ago`
}

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  // Fetch projects with raga information joined
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, title, raga_id, created_at, updated_at, ragas(name)')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error)
  }

  return (
    <div className="min-h-screen bg-surface-lowest pt-24 pb-12 px-8 font-sans selection:bg-primary/30">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-secondary/5 rounded-full blur-[100px] animate-pulse-slow delayed-animation"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div>
            <h1 className="text-5xl font-display font-medium text-on-surface mb-2 tracking-tight">
              My Library
            </h1>
            <p className="text-on-surface-variant/60 max-w-lg">
              Continue your melodic explorations. Every project preserves your raga foundation and sequences.
            </p>
          </div>
          
          <Link 
            href="/studio"
            className="group flex items-center gap-3 bg-primary text-on-primary px-8 py-4 rounded-2xl font-medium hover:scale-105 active:scale-95 transition-all shadow-glow"
          >
            <span className="material-symbols-outlined !text-xl group-hover:rotate-90 transition-transform duration-500">add</span>
            New Project
          </Link>
        </div>

        {/* Project Grid */}
        {!projects || projects.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/10 rounded-3xl bg-surface-container-low/30">
            <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-6">
              <span className="material-symbols-outlined !text-3xl text-on-surface-variant/30">folder_open</span>
            </div>
            <h3 className="text-xl font-medium text-on-surface mb-1">No projects yet</h3>
            <p className="text-on-surface-variant/40 mb-8">Your shared compositions will appear here.</p>
            <Link 
              href="/studio"
              className="px-6 py-2 rounded-xl bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors font-medium border border-outline-variant/10"
            >
              Start Creating
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project: any) => (
              <div 
                key={project.id}
                className="group relative bg-surface-container-low/40 border border-outline-variant/10 rounded-[32px] p-8 hover:bg-surface-container-high/60 transition-all duration-500 hover:-translate-y-1 hover:shadow-glow-soft backdrop-blur-xl"
              >
                <div className="flex flex-col h-full">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">
                         {project.ragas?.name || 'Untitled Raga'}
                       </span>
                       <span className="text-[10px] items-center flex gap-1 text-on-surface-variant/40">
                         <span className="material-symbols-outlined !text-[12px]">schedule</span>
                         {formatTimeAgo(project.updated_at || project.created_at)}
                       </span>
                    </div>
                    <h2 className="text-2xl font-display font-medium text-on-surface group-hover:text-primary transition-colors line-clamp-1">
                      {project.title || 'Untitled Composition'}
                    </h2>
                  </div>

                  <div className="mt-auto pt-6 border-t border-outline-variant/5 flex items-center justify-between">
                    <Link 
                      href={`/studio?project=${project.id}`}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-surface-container-highest text-on-surface font-medium hover:bg-primary hover:text-on-primary transition-all active:scale-95 group/btn"
                    >
                      Open in Studio
                      <span className="material-symbols-outlined !text-sm group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
