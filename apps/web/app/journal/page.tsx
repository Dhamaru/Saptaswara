'use client'

import React, { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Assistant } from '@/components/Assistant'

function computeStreak(logs: any[]): number {
  if (!logs.length) return 0
  const dates = [...new Set(logs.map((l: any) => l.log_date))].sort().reverse() as string[]
  const today = new Date().toISOString().split('T')[0]
  let streak = 0
  let expected = today
  for (const date of dates) {
    if (date === expected) {
      streak++
      const d = new Date(expected)
      d.setDate(d.getDate() - 1)
      expected = d.toISOString().split('T')[0]
    } else if (date < expected) {
      break
    }
  }
  return streak
}

function buildHeatmap(logs: any[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const log of logs) {
    if (log.log_date) counts.set(log.log_date, (counts.get(log.log_date) ?? 0) + 1)
  }
  return counts
}

function getCurrentTimePeriod() {
  const hour = new Date().getHours()
  if (hour >= 4 && hour < 11) return 'MORNING'
  if (hour >= 11 && hour < 16) return 'AFTERNOON'
  if (hour >= 16 && hour < 20) return 'EVENING'
  return 'NIGHT'
}

export default function JournalPage() {
  const [tradition, setTradition] = useState('ALL')
  const [timePeriod, setTimePeriod] = useState(getCurrentTimePeriod())
  const [recommendation, setRecommendation] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [logsLoading, setLogsLoading] = useState(true)

  const [dbLogs, setDbLogs] = useState<any[]>([])
  const [showLogForm, setShowLogForm] = useState(false)
  const [formRaga, setFormRaga] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formIntensity, setFormIntensity] = useState('Focused')
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [sessionTip, setSessionTip] = useState<{ raga: string; tip: string } | null>(null)
  const [tipLoading, setTipLoading] = useState(false)
  const [promptLoading, setPromptLoading] = useState(false)
  const supabase = createClient()

  // Pre-fill form from ?raga= URL param (set by studio "Log Session" prompt)
  useEffect(() => {
    const raga = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('raga') : null
    if (raga) {
      setFormRaga(raga)
      setShowLogForm(true)
    }
  }, [])

  useEffect(() => { document.title = 'Practice Journal — Saptaswara' }, [])

  // Fetch practice logs via API
  useEffect(() => {
    async function fetchLogs() {
      setLogsLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) {
          setLogsLoading(false)
          return
        }

        const res = await fetch('/api/journal', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        if (res.ok) {
          const json = await res.json()
          setDbLogs(json.data || [])
        }
      } catch (err) {
        console.error('Failed to fetch logs:', err)
      } finally {
        setLogsLoading(false)
      }
    }
    fetchLogs()
  }, [])
  
  async function fetchWritingPrompt() {
    if (!formRaga) return
    setPromptLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Write one evocative sentence to start a journal entry about a practice session with Raga ${formRaga}. First person, present tense, poetic but specific. No intro, just the sentence.`
          }],
          ragaContext: { name: formRaga }
        })
      })
      if (!res.ok || !res.body) return
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let result = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n').filter(l => l.startsWith('data: '))) {
          const data = line.slice(6)
          if (data === '[DONE]') break
          result += data
        }
      }
      if (result) setFormNotes(prev => (prev ? prev + '\n\n' : '') + result.trim())
    } catch { /* silent */ } finally {
      setPromptLoading(false)
    }
  }

  async function fetchSessionTip(ragaName: string) {
    setTipLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Give me one concise practice tip for Raga ${ragaName}. Focus on a specific technical or musical aspect. Max 2 sentences.`
          }],
          ragaContext: { name: ragaName }
        })
      })
      if (!res.ok || !res.body) return
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let tip = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const data = line.slice(6)
          if (data === '[DONE]') break
          tip += data
        }
      }
      if (tip) setSessionTip({ raga: ragaName, tip: tip.trim() })
    } catch (err) {
      console.error('Failed to fetch session tip:', err)
    } finally {
      setTipLoading(false)
    }
  }

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // BUG-037: prevent double-submission from rapid clicks or keyboard
    if (submitting) return
    setSubmitting(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert("Please log in first")
        return
      }

      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          raga: formRaga,
          notes: formNotes,
          intensity: formIntensity,
          date: formDate
        })
      })

      const json = await res.json()
      if (res.ok) {
        // BUG-038: functional setState avoids stale closure over dbLogs
        setDbLogs(prev => [json.data, ...prev])
        setShowLogForm(false)
        fetchSessionTip(formRaga)
        setFormRaga('')
        setFormNotes('')
      } else {
        alert(json.error || "Failed to submit log")
      }
    } catch (err) {
      console.error(err)
      alert("Submission error")
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    async function fetchRecommendation() {
      setLoading(true)
      try {
        let query = supabase.from('ragas').select('*')
        
        // Filter by Tradition if not ALL
        if (tradition !== 'ALL') {
          query = query.ilike('tradition', `%${tradition}%`)
        }

        // We try to find a raga that matches the current time of day tightly
        query = query.ilike('time_of_day', `%${timePeriod}%`)

        const { data, error } = await query
        
        if (error) throw error

        if (data && data.length > 0) {
          // Pick a random raga from the matches so it varies daily
          const randomIdx = Math.floor(Math.random() * data.length)
          setRecommendation(data[randomIdx])
        } else {
          // Fallback if no exact time match (fetch universally)
          const fallback = await supabase
            .from('ragas')
            .select('*')
            .ilike('tradition', tradition === 'ALL' ? '%%' : `%${tradition}%`)
            .limit(10)
          
          if (fallback.data && fallback.data.length > 0) {
            setRecommendation(fallback.data[Math.floor(Math.random() * fallback.data.length)])
          } else {
            setRecommendation(null)
          }
        }
      } catch (err) {
        console.error('Failed to fetch recommendation:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendation()
  }, [tradition, timePeriod])

  useEffect(() => {
    if (logsLoading) return
    const hour = new Date().getHours()
    if (hour < 18) return  // only show after 6pm
    const today = new Date().toISOString().split('T')[0]
    const practicedToday = dbLogs.some((l: any) => l.log_date === today)
    if (!practicedToday) setShowReminder(true)
  }, [logsLoading, dbLogs])

  // BUG-039: stable interval — functional setState removes timePeriod from deps
  // so the interval is not recreated every time the period changes.
  useEffect(() => {
    const interval = setInterval(() => {
      setTimePeriod(prev => {
        const newPeriod = getCurrentTimePeriod()
        return newPeriod !== prev ? newPeriod : prev
      })
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-surface-lowest flex flex-col overflow-x-hidden">
      <Navbar />
      
      <main className="flex-1 max-w-6xl mx-auto w-full p-6 md:p-12 space-y-16">
        <header className="space-y-4 animate-fade-in text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-4">
             <div className="w-1.5 h-1.5 rounded-full bg-primary" />
             <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-on-surface font-bold">Intelligent Practice Hub</span>
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-light text-on-surface tracking-tight leading-tight">Your Daily Practice</h1>
          <p className="text-on-surface-variant font-sans font-light max-w-xl mx-auto md:mx-0 text-lg">
            Set your musical tradition. Saptaswara mathematically aligns the perfect Raga to practice based on the exact time of your session.
          </p>
        </header>

        {showReminder && (
          <div className="flex items-center gap-4 px-6 py-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 animate-fade-in">
            <span className="material-symbols-outlined text-amber-500/80 shrink-0">alarm</span>
            <div className="flex-1">
              <p className="font-sans text-sm text-on-surface font-light">
                No practice logged today. Even 10 minutes of riyaz keeps the raga alive.
              </p>
            </div>
            <button
              onClick={() => { setShowReminder(false); setShowLogForm(true) }}
              className="font-mono text-[9px] uppercase tracking-widest text-amber-500/80 hover:text-amber-500 transition-colors shrink-0"
            >
              Log now
            </button>
            <button onClick={() => setShowReminder(false)} className="text-on-surface-variant/30 hover:text-on-surface transition-colors shrink-0">
              <span className="material-symbols-outlined !text-base">close</span>
            </button>
          </div>
        )}

        {/* Preferences Bar */}
        <section className="bg-surface-container-lowest border border-outline-variant/10 rounded-[32px] p-6 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-primary/60">tune</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-semibold">Tradition Focus</span>
           </div>
           
           <div className="flex flex-wrap gap-2">
              {['ALL', 'HINDUSTANI', 'CARNATIC'].map(f => (
                <button
                  key={f}
                  onClick={() => setTradition(f)}
                  className={`px-6 py-2 rounded-full font-mono text-[10px] uppercase tracking-widest transition-all ${
                    tradition === f 
                      ? 'bg-primary/20 text-primary border border-primary/30 shadow-glow' 
                      : 'bg-surface-container-low/20 text-on-surface-variant/40 border border-outline-variant/5 hover:border-outline-variant/20'
                  }`}
                >
                  {f === 'ALL' ? 'Both Traditions' : f}
                </button>
              ))}
           </div>
        </section>

        {/* Recommendation Engine */}
        <section className="relative">
           {loading ? (
             <div className="h-[400px] w-full rounded-[40px] bg-surface-container-low/20 animate-pulse border border-outline-variant/5 flex items-center justify-center">
                <span className="font-mono text-xs text-primary/40 uppercase tracking-widest animate-pulse">Calculating Alignment...</span>
             </div>
           ) : recommendation ? (
             <div className="relative overflow-hidden rounded-[40px] group ring-1 ring-inset ring-outline-variant/10 shadow-2xl">
                {/* Atmospheric Background */}
                <div className="absolute inset-0 z-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={
                      timePeriod === 'MORNING' ? '/raga_morning_atmosphere.png' :
                      (timePeriod === 'NIGHT' || timePeriod === 'EVENING') ? '/raga_night_atmosphere.png' : 
                      '/raga_afternoon_atmosphere.png'
                    }
                    alt="Atmosphere"
                    className="object-cover w-full h-full opacity-30 group-hover:opacity-40 transition-opacity duration-1000 scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-surface-lowest via-surface-lowest/90 to-transparent" />
                </div>

                <div className="relative z-10 p-10 md:p-16 flex flex-col lg:flex-row gap-12 lg:items-center justify-between h-full">
                   <div className="max-w-xl space-y-6">
                      <div className="flex items-center gap-4">
                         <span className="px-4 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary font-mono text-[9px] uppercase tracking-widest">
                            {recommendation.tradition || 'Universal'}
                         </span>
                         <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary/80 font-bold border-l border-outline-variant/10 pl-4">
                            Ideal for {timePeriod}
                         </span>
                      </div>
                      
                      <h2 className="font-display text-4xl sm:text-6xl md:text-[80px] font-light text-on-surface tracking-tighter leading-none">
                         {recommendation.name.replace(' (Additional)', '').replace(' (J)', '')}
                      </h2>
                      
                      <div className="pt-2 flex flex-col gap-4">
                         <span className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/40">Why practice this now?</span>
                         <p className="font-sans font-light italic text-xl md:text-2xl text-on-surface-variant/80 leading-relaxed border-l-[3px] border-primary/30 pl-6">
                            "Because it is currently {timePeriod.toLowerCase()}, the {(recommendation.mood || 'profound').toLowerCase()} geometry of {recommendation.name.replace(' (Additional)', '').replace(' (J)', '')} perfectly aligns with the atmospheric resonance. Focusing on the Vadi (<strong>{recommendation.vadi || 'Sa'}</strong>) will help ground your session."
                         </p>
                      </div>

                      <div className="pt-6">
                         <Link 
                           href={`/studio?project_id=${recommendation.id}`}
                           className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-on-primary rounded-full font-medium hover:bg-primary-container hover:text-on-primary transition-all shadow-glow hover:-translate-y-1 active:translate-y-0"
                         >
                            <span className="material-symbols-outlined !text-xl">play_circle</span>
                            Start Session in Studio
                         </Link>
                      </div>
                   </div>

                   {/* Raga DNA Panel */}
                   <div className="hidden lg:flex flex-col gap-6 bg-surface-lowest/40 backdrop-blur-xl p-8 rounded-3xl border border-white/5 w-80 shadow-xl">
                      <div>
                         <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 block mb-3">Scale Geometry</span>
                         <div className="flex flex-wrap gap-2">
                            {recommendation.aroha?.slice(0, 5).map((s: string, i: number) => (
                              <span key={i} className="font-label text-sm text-on-surface border border-outline-variant/10 px-3 py-1.5 rounded-lg bg-surface-lowest/50">
                                 {s}
                              </span>
                            ))}
                         </div>
                      </div>
                      <div className="pt-4 border-t border-outline-variant/10">
                         <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 block mb-3">Primary Gravity (Vadi)</span>
                         <span className="font-display text-4xl font-light text-primary">{recommendation.vadi || 'Sa'}</span>
                      </div>
                   </div>
                </div>
             </div>
           ) : (
             <div className="p-12 text-center text-on-surface-variant/60 font-sans font-light">
                No recommendation could be generated right now.
             </div>
           )}
        </section>

        {/* Practice heatmap */}
        {!logsLoading && dbLogs.length > 0 && (
          <section className="space-y-4">
            <h3 className="font-display text-2xl font-light text-on-surface tracking-tight">Practice Frequency</h3>
            <div className="rounded-3xl bg-surface-container-lowest border border-outline-variant/5 p-6 overflow-x-auto">
              {(() => {
                const heatmapDays = (() => {
                  const days: { date: string; count: number }[] = []
                  const today = new Date()
                  for (let i = 363; i >= 0; i--) {
                    const d = new Date(today)
                    d.setDate(today.getDate() - i)
                    const key = d.toISOString().split('T')[0]
                    days.push({ date: key, count: buildHeatmap(dbLogs).get(key) ?? 0 })
                  }
                  return days
                })()
                return (
                  <>
                    <div className="flex gap-1" style={{ minWidth: 'max-content' }}>
                      {Array.from({ length: 52 }, (_, week) => (
                        <div key={week} className="flex flex-col gap-1">
                          {Array.from({ length: 7 }, (_, day) => {
                            const idx = week * 7 + day
                            const entry = heatmapDays[idx]
                            if (!entry) return <div key={day} className="w-3 h-3" />
                            return (
                              <div
                                key={day}
                                title={`${entry.date}: ${entry.count} session${entry.count !== 1 ? 's' : ''}`}
                                className={[
                                  'w-3 h-3 rounded-sm transition-all cursor-default',
                                  entry.count === 0
                                    ? 'bg-outline-variant/10'
                                    : entry.count === 1
                                      ? 'bg-primary/30'
                                      : entry.count === 2
                                        ? 'bg-primary/55'
                                        : 'bg-primary/85',
                                ].join(' ')}
                              />
                            )
                          })}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-3 justify-end">
                      <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/30">Less</span>
                      {[0, 1, 2, 3].map(v => (
                        <div key={v} className={`w-3 h-3 rounded-sm ${v === 0 ? 'bg-outline-variant/10' : v === 1 ? 'bg-primary/30' : v === 2 ? 'bg-primary/55' : 'bg-primary/85'}`} />
                      ))}
                      <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/30">More</span>
                    </div>
                  </>
                )
              })()}
            </div>
          </section>
        )}

        {/* Historical Journal Logs */}
        <section className="pt-8">
           {(tipLoading || sessionTip) && (
             <div className="mb-8 p-6 rounded-3xl border border-primary/20 bg-primary/5 flex items-start gap-4 animate-fade-in">
               <span className="material-symbols-outlined text-primary/60 mt-0.5">auto_awesome</span>
               <div className="flex-1">
                 <div className="font-mono text-[9px] uppercase tracking-widest text-primary/60 font-bold mb-2">
                   Practice Tip — Raga {sessionTip?.raga}
                 </div>
                 {tipLoading ? (
                   <div className="h-4 w-3/4 rounded bg-primary/10 animate-pulse" />
                 ) : (
                   <p className="font-sans text-sm text-on-surface-variant leading-relaxed">{sessionTip?.tip}</p>
                 )}
               </div>
               {sessionTip && (
                 <button onClick={() => setSessionTip(null)} className="text-on-surface-variant/30 hover:text-on-surface transition-colors">
                   <span className="material-symbols-outlined !text-base">close</span>
                 </button>
               )}
             </div>
           )}
           <div className="flex items-center justify-between mb-8">
              <h3 className="font-display text-3xl font-light text-on-surface tracking-tight">Past Sessions</h3>
              <div className="flex items-center gap-4">
                {(() => {
                  const streak = computeStreak(dbLogs)
                  return streak > 0 ? (
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                      <span className="material-symbols-outlined !text-sm text-amber-500/80">local_fire_department</span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-amber-500/80 font-bold">{streak} day streak</span>
                    </div>
                  ) : null
                })()}
                <span className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/40">{dbLogs.length} {dbLogs.length === 1 ? 'Entry' : 'Entries'}</span>
              </div>
           </div>
           
           <div className="grid gap-6">
              {logsLoading ? (
                <>
                  {[0, 1, 2].map(i => (
                    <div key={i} className="p-6 md:p-8 bg-surface-lowest border border-outline-variant/5 rounded-3xl flex flex-col md:flex-row gap-8 items-start md:items-center animate-pulse">
                      <div className="md:w-32 flex flex-col gap-2 shrink-0">
                        <div className="h-2 w-12 bg-outline-variant/10 rounded" />
                        <div className="h-5 w-20 bg-outline-variant/10 rounded" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-6 w-24 bg-outline-variant/10 rounded-full" />
                          <div className="h-6 w-20 bg-outline-variant/10 rounded-full" />
                        </div>
                        <div className="h-4 w-3/4 bg-outline-variant/10 rounded" />
                      </div>
                    </div>
                  ))}
                </>
              ) : dbLogs.length === 0 && !showLogForm ? (
                <div className="p-12 text-center rounded-3xl border border-dashed border-outline-variant/10 space-y-4">
                  <p className="font-sans font-light text-on-surface-variant/60">
                    No sessions logged yet. Start practicing and log your first session.
                  </p>
                  <button
                    onClick={() => setShowLogForm(true)}
                    className="px-6 py-3 bg-primary/10 border border-primary/20 rounded-xl font-mono text-[10px] uppercase tracking-widest text-primary hover:bg-primary/20 transition-all"
                  >
                    Log First Session
                  </button>
                </div>
              ) : null}
              {!logsLoading && dbLogs.map((entry, i) => (
                <div key={i} className="group p-6 md:p-8 bg-surface-lowest border border-outline-variant/5 rounded-3xl hover:border-primary/20 transition-all flex flex-col md:flex-row gap-8 items-start md:items-center">
                   <div className="md:w-32 flex flex-col gap-1 shrink-0">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 font-bold">Log Date</span>
                      <span className="font-display text-lg font-light text-on-surface">{entry.log_date}</span>
                   </div>
                   
                   <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                         <span className="px-3 py-1 rounded-full bg-surface-container-high border border-outline-variant/5 text-on-surface font-mono text-[9px] uppercase tracking-widest">
                            Raga {entry.raga}
                         </span>
                         <span className="px-3 py-1 rounded-full bg-surface-container-low text-on-surface-variant/60 text-[9px] font-mono uppercase tracking-widest">
                            {entry.intensity} State
                         </span>
                      </div>
                      <p className="font-sans font-light text-on-surface-variant leading-relaxed">
                         "{entry.notes}"
                      </p>
                   </div>
                </div>
              ))}
              
              {showLogForm ? (
                 <form onSubmit={handleLogSubmit} className="mt-4 p-8 bg-surface-container-lowest border border-primary/20 rounded-3xl space-y-6 animate-fade-in">
                   <div className="flex items-center justify-between">
                     <h4 className="font-display text-2xl font-light text-on-surface">New Session Log</h4>
                     <button type="button" onClick={() => setShowLogForm(false)} className="text-on-surface-variant/60 hover:text-on-surface">
                        <span className="material-symbols-outlined">close</span>
                     </button>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <label className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/60 font-bold">Raga Studied</label>
                         <input required value={formRaga} onChange={e => setFormRaga(e.target.value)} type="text" placeholder="e.g. Yaman" className="w-full bg-surface-lowest text-on-surface border border-outline-variant/10 rounded-xl px-4 py-3 text-sm focus:border-primary/50 focus:outline-none" />
                      </div>
                      <div className="space-y-2">
                         <label className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/60 font-bold">Date</label>
                         <input required value={formDate} onChange={e => setFormDate(e.target.value)} type="date" className="w-full bg-surface-lowest text-on-surface border border-outline-variant/10 rounded-xl px-4 py-3 text-sm focus:border-primary/50 focus:outline-none" />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/60 font-bold">Intensity State</label>
                      <select required value={formIntensity} onChange={e => setFormIntensity(e.target.value)} className="w-full bg-surface-lowest text-on-surface border border-outline-variant/10 rounded-xl px-4 py-3 text-sm focus:border-primary/50 focus:outline-none">
                         <option value="Deep">Deep</option>
                         <option value="Meditative">Meditative</option>
                         <option value="Focused">Focused</option>
                         <option value="Light">Light</option>
                         <option value="Creative">Creative</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/60 font-bold">Session Notes</label>
                        <button
                          type="button"
                          onClick={fetchWritingPrompt}
                          disabled={!formRaga || promptLoading}
                          title={formRaga ? `Get an AI writing prompt for Raga ${formRaga}` : 'Enter a raga name first'}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary/20 bg-primary/5 text-primary/70 font-mono text-[8px] uppercase tracking-widest hover:bg-primary/15 hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <span className={`material-symbols-outlined !text-sm ${promptLoading ? 'animate-spin' : ''}`}>
                            {promptLoading ? 'sync' : 'auto_awesome'}
                          </span>
                          {promptLoading ? 'Writing…' : 'Inspire me'}
                        </button>
                      </div>
                      <textarea required value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={4} placeholder="Describe breath control, phrasing, or discoveries..." className="w-full bg-surface-lowest text-on-surface border border-outline-variant/10 rounded-xl px-4 py-3 text-sm focus:border-primary/50 focus:outline-none resize-none"></textarea>
                   </div>
                   <button disabled={submitting} type="submit" className="w-full py-4 bg-primary text-white rounded-xl font-medium shadow-glow hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
                      {submitting ? 'Authenticating & Saving...' : 'Save Log to Archive'}
                      {!submitting && <span className="material-symbols-outlined !text-lg">arrow_forward</span>}
                   </button>
                 </form>
              ) : (
                <button onClick={() => setShowLogForm(true)} className="w-full py-10 bg-surface-container-lowest border-2 border-dashed border-outline-variant/10 rounded-3xl flex flex-col items-center justify-center gap-3 group hover:bg-surface-lowest/50 hover:border-primary/20 transition-all mt-4">
                   <span className="material-symbols-outlined !text-2xl text-on-surface-variant/20 group-hover:text-primary transition-colors">edit_document</span>
                   <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant/40 group-hover:text-on-surface">Manually Log Session</span>
                </button>
              )}
           </div>
        </section>
      </main>

      {/* Raga Assistant — context-aware coaching based on today's recommendation */}
      <Assistant
        ragaContext={recommendation
          ? {
              name: recommendation.name?.replace(' (Additional)', '').replace(' (J)', ''),
              aroha: recommendation.aroha,
              avaroha: recommendation.avaroha,
              vadi: recommendation.vadi,
              samvadi: recommendation.samvadi,
              mood: recommendation.mood,
              time_of_day: timePeriod,
            }
          : undefined
        }
        studioContext={dbLogs.length > 0
          ? `Recent practice sessions: ${dbLogs.slice(0, 3).map(l => `${l.raga} (${l.intensity}, ${l.log_date})`).join('; ')}`
          : undefined
        }
      />
    </div>
  )
}
