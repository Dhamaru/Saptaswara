'use client'

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { audioEngine } from '@/lib/audio'
import { Assistant } from '@/components/Assistant'
import { Play, Square, Save, Music, ChevronDown, Search, Sparkles, Wand2, Zap } from 'lucide-react'
import type { Raga, Swara } from '@saptaswara/core'
import { useSearchParams } from 'next/navigation'

const STEPS = 16

export default function StudioPage() {
  const searchParams = useSearchParams()
  const projectIdFromUrl = searchParams.get('project_id')

  const [ragas, setRagas] = useState<Raga[]>([])
  const [selectedRaga, setSelectedRaga] = useState<Raga | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isStarted, setIsStarted] = useState(false)
  const [activeStep, setActiveStep] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [sequence, setSequence] = useState<(Swara | null)[]>(new Array(STEPS).fill(null))
  const [projectId, setProjectId] = useState<string | null>(projectIdFromUrl)
  const [projectName, setProjectName] = useState('Untitled Composition')

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: ragaData } = await supabase.from('ragas').select('*').order('name')
      if (ragaData) setRagas(ragaData)

      if (projectIdFromUrl) {
        const { data: project } = await supabase
          .from('projects')
          .select('*, ragas(*)')
          .eq('id', projectIdFromUrl)
          .single()

        if (project) {
          setProjectName(project.title)
          setSelectedRaga(project.ragas)

          const { data: layers } = await supabase
            .from('layers')
            .select('*')
            .eq('project_id', project.id)

          if (layers && layers.length > 0) {
            const savedSeq = (layers[0].events as any)?.sequence
            if (savedSeq) setSequence(savedSeq)
          }
        }
      }
    }
    init()
  }, [projectIdFromUrl])

  useEffect(() => {
    if (isPlaying && isStarted) {
      let step = 0
      timerRef.current = setInterval(() => {
        const swara = sequence[step]
        if (swara && selectedRaga && audioEngine) {
          audioEngine.playSwara(selectedRaga.hz_map[swara])
        }
        setActiveStep(step)
        step = (step + 1) % STEPS
      }, 250)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setActiveStep(-1)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isPlaying, sequence, selectedRaga, isStarted])

  const startAudio = async () => {
    if (audioEngine) { await audioEngine.start(); setIsStarted(true) }
  }

  const toggleSequence = (step: number, swara: Swara) => {
    const newSeq = [...sequence]
    newSeq[step] = newSeq[step] === swara ? null : swara
    setSequence(newSeq)
    if (isStarted && selectedRaga && audioEngine && newSeq[step]) {
      audioEngine.playSwara(selectedRaga.hz_map[swara])
    }
  }

  const filteredRagas = ragas.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.thaat.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSave = async () => {
    if (!selectedRaga) return
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: projectName || `Composition in ${selectedRaga.name}`,
          raga_id: selectedRaga.id,
          bpm: 120,
          sequence
        })
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setProjectId(result.id)
      alert('Composition saved successfully!')
    } catch (err: any) {
      console.error('Save Error:', err)
      alert('Failed to save: ' + err.message)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden relative">
      {/* Background */}
      <div className="absolute inset-0 dot-pattern opacity-10" />

      {/* Studio Toolbar */}
      <div className="relative z-20 glass border-b border-white/5 px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          {/* Raga Selector */}
          <div className="relative group">
            <button className="glass-light px-5 py-2.5 rounded-2xl flex items-center gap-3 hover:border-primary/30 transition-all">
              <Music className="w-5 h-5 text-primary" />
              <span className="font-bold tracking-tight">{selectedRaga?.name || 'Select Raga'}</span>
              <ChevronDown className="w-4 h-4 text-white/30" />
            </button>
            <div className="absolute top-full left-0 mt-3 w-80 glass rounded-3xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  placeholder="Filter 120 ragas..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
                {filteredRagas.map(raga => (
                  <button
                    key={raga.id}
                    onClick={() => {
                      setSelectedRaga(raga)
                      setSequence(new Array(STEPS).fill(null))
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all flex justify-between items-center ${
                      selectedRaga?.id === raga.id
                        ? 'glass-gold text-primary-light'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-sm">{raga.name}</p>
                      <p className="text-[10px] text-white/25 uppercase tracking-widest">{raga.thaat}</p>
                    </div>
                    {selectedRaga?.id === raga.id && <div className="w-2 h-2 bg-primary rounded-full animate-glow-pulse" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-white/10" />

          {/* Project Name */}
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-transparent text-lg font-bold focus:ring-0 focus:outline-none w-56 text-white/70 focus:text-white transition-colors placeholder:text-white/20"
            placeholder="Name your composition..."
          />

          <div className="h-6 w-px bg-white/10" />

          {/* Audio Engine */}
          <button
            onClick={startAudio}
            disabled={isStarted}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm transition-all ${
              isStarted
                ? 'glass-gold text-primary-light'
                : 'btn-primary'
            }`}
          >
            {isStarted ? <div className="w-2 h-2 bg-primary rounded-full animate-glow-pulse" /> : <Zap className="w-4 h-4" />}
            {isStarted ? 'Engine Live' : 'Initialize Audio'}
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex gap-3 items-center">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={!isStarted || !selectedRaga}
            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
              isPlaying
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'glass-light hover:text-emerald-400'
            }`}
          >
            {isPlaying ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-emerald-600/20"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      {/* Main Studio Area */}
      <div className="relative z-10 flex-1 p-8 overflow-hidden flex flex-col gap-8">
        {!selectedRaga ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 blur-[60px] rounded-full" />
              <div className="relative w-28 h-28 glass rounded-[2rem] flex items-center justify-center shadow-glow">
                <Music className="w-12 h-12 text-primary animate-float" />
              </div>
            </div>
            <div className="text-center space-y-3">
              <h2 className="text-4xl font-black text-gradient-subtle tracking-tight">Select your Raag</h2>
              <p className="text-white/25 max-w-sm mx-auto leading-relaxed">
                Choose from 120 verified ragas to unlock their musical geometry and start composing.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-8 overflow-hidden animate-slide-up">
            {/* Raga Info Header */}
            <div className="flex justify-between items-start">
              <div>
                <span className="glass-gold px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] text-primary-light">
                  {selectedRaga.thaat} Thaat
                </span>
                <h2 className="text-5xl font-black mt-3 text-gradient-gold flex items-center gap-4">
                  {selectedRaga.name}
                  <button className="p-2 hover:bg-white/5 rounded-xl text-white/20 hover:text-primary transition-all">
                    <Wand2 className="w-6 h-6" />
                  </button>
                </h2>
                <div className="flex gap-4 mt-4 text-xs font-mono text-white/30">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full" /> Vadi: {selectedRaga.vadi}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full" /> Samvadi: {selectedRaga.samvadi}
                  </div>
                  <div className="text-white/15">{selectedRaga.time_of_day}</div>
                </div>
              </div>

              <div className="glass rounded-3xl p-5 max-w-xs">
                <p className="text-sm text-white/30 italic leading-relaxed">
                  &ldquo;{selectedRaga.mood || "The soul of this raga speaks through its precise note structure."}&rdquo;
                </p>
              </div>
            </div>

            {/* Sequencer Grid */}
            <div className="flex-1 overflow-x-auto pb-4">
              <div className="inline-flex flex-col gap-1 min-w-full glass rounded-3xl p-6">
                {selectedRaga.aroha.slice().reverse().map((swara) => (
                  <div key={swara} className="flex gap-1 group">
                    <div className="w-14 h-11 flex items-center justify-center font-black text-white/15 group-hover:text-primary transition-colors text-sm sticky left-0 bg-surface/80 z-10 rounded-l-xl">
                      {swara}
                    </div>
                    {new Array(STEPS).fill(0).map((_, step) => (
                      <button
                        key={step}
                        onClick={() => toggleSequence(step, swara)}
                        className={`w-11 h-11 rounded-lg border transition-all relative ${
                          sequence[step] === swara
                            ? 'bg-gradient-to-br from-primary to-primary-dark border-primary/50 shadow-glow'
                            : 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/5'
                        } ${activeStep === step ? 'ring-2 ring-white/30 ring-offset-2 ring-offset-background' : ''}`}
                      >
                        {activeStep === step && sequence[step] === swara && (
                          <div className="absolute inset-0 bg-white/30 rounded-lg animate-ping" />
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* AI Tip Bar */}
            <div className="glass-gold rounded-2xl px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-white/40">
                <Sparkles className="w-5 h-5 text-primary" />
                <p className="text-sm font-medium">
                  AI Tip: The characteristic phrase for <span className="text-primary-light font-bold">{selectedRaga.name}</span> often emphasizes <span className="text-primary-light font-bold">{selectedRaga.vadi}</span>
                </p>
              </div>
              <button className="glass-light px-4 py-2 rounded-xl text-xs font-bold transition-all hover:bg-white/10 text-white/50">
                Show Rules
              </button>
            </div>
          </div>
        )}
      </div>

      <Assistant ragaContext={selectedRaga?.name} />
    </div>
  )
}
