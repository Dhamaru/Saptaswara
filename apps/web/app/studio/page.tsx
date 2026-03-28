'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { audioEngine } from '@/lib/audio'
import { Assistant } from '@/components/Assistant'
import Piano from '@/components/Piano'
import type { Raga } from '@saptaswara/core'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const STEPS = 16
const TABLA_STROKES = ['Dha', 'Na', 'Ti', 'Te']

type LayerType = 'melody' | 'rhythm' | 'drone'
type KeyboardLayout = 'Piano' | 'Harmonium' | 'Swara'
type InstrumentType = 'piano' | 'harmonium' | 'sitar'

interface Layer {
  id: string
  type: LayerType
  name: string
  sequence: (any | null)[]
  visible: boolean
}

const SWARA_OFFSETS: Record<string, number> = {
  'Sa': 0, 're': 1, 'Re': 2, 'ga': 3, 'Ga': 4, 'Ma': 5, 'ma': 6, 'Pa': 7, 'dha': 8, 'Dha': 9, 'ni': 10, 'Ni': 11
}

function StudioContent() {
  const searchParams = useSearchParams()
  const projectIdFromUrl = searchParams.get('project_id')

  const [user, setUser] = useState<any>(null)
  const [ragas, setRagas] = useState<Raga[]>([])
  const [selectedRaga, setSelectedRaga] = useState<Raga | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isStarted, setIsStarted] = useState(false)
  const [activeStep, setActiveStep] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  
  const [keyboardLayout, setKeyboardLayout] = useState<KeyboardLayout>('Piano')
  const [activeInstrument, setActiveInstrument] = useState<InstrumentType>('piano')

  const [layers, setLayers] = useState<Layer[]>([
    { id: '1', type: 'melody', name: 'Melody', sequence: new Array(STEPS).fill(null), visible: true },
    { id: '2', type: 'rhythm', name: 'Tabla', sequence: new Array(STEPS).fill(null), visible: true },
  ])
  const [activeLayerId, setActiveLayerId] = useState('1')
  
  const [projectId, setProjectId] = useState<string | null>(projectIdFromUrl)
  const [projectName, setProjectName] = useState('Untitled Composition')

  const supabaseClient = createClient()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const activeLayer = layers.find(l => l.id === activeLayerId) || layers[0]

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser()
      setUser(user)
      const { data: ragaData } = await supabaseClient.from('ragas').select('*').order('name')
      if (ragaData && ragaData.length > 0) {
        setRagas(ragaData as any)
        // Auto-select first raga for immediate visibility
        setSelectedRaga(ragaData[0] as any)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setActiveStep((prev) => {
          const nextStep = (prev + 1) % STEPS
          layers.forEach(layer => {
            const event = layer.sequence[nextStep]
            if (event && audioEngine) {
              if (layer.type === 'melody') audioEngine.playSwara(event.frequency)
              if (layer.type === 'rhythm') audioEngine.playStroke(event.stroke)
            }
          })
          return nextStep
        })
      }, 500)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setActiveStep(-1)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isPlaying, layers])

  const getFreq = (swara: string, octave = 4) => {
    const offset = SWARA_OFFSETS[swara] || 0
    return 261.63 * Math.pow(2, octave - 4) * Math.pow(2, offset / 12)
  }

  const handleToggleStep = (stepIdx: number, value: any) => {
    setLayers(prev => prev.map(l => {
      if (l.id === activeLayerId) {
        const newSeq = [...l.sequence]
        newSeq[stepIdx] = newSeq[stepIdx]?.label === value.label ? null : value
        return { ...l, sequence: newSeq }
      }
      return l
    }))
  }

  const handleInstrumentChange = (inst: InstrumentType) => {
    setActiveInstrument(inst)
    if (audioEngine) audioEngine.setInstrument(inst)
  }

  const handleInitAudio = async () => {
    if (audioEngine) {
      await audioEngine.start()
      setIsStarted(true)
    }
  }

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-background">
      {!isStarted && (
        <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-8 animate-pulse text-primary">
            <span className="material-symbols-outlined !text-4xl">headphones</span>
          </div>
          <h2 className="font-display text-4xl font-light text-on-surface mb-4 tracking-tight">Activate the Resonance.</h2>
          <p className="text-on-surface-variant max-w-sm mb-12 font-sans font-light">
            Explicit interaction is required to initialize the studio engine. Click below to begin your melodic dialogue.
          </p>
          <button onClick={handleInitAudio} className="px-10 py-5 bg-primary text-on-primary rounded-2xl font-medium tracking-tight shadow-glow hover:scale-105 active:scale-95 transition-all">
            Initialize Audio Engine
          </button>
        </div>
      )}

      {/* Control Sidebar */}
      <aside className="w-80 bg-surface-lowest border-r border-outline-variant/10 flex flex-col overflow-hidden">
        <div className="p-8 border-b border-outline-variant/10">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-2 font-bold opacity-60">Project</div>
          <input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="w-full bg-transparent font-display text-2xl font-light text-on-surface focus:outline-none focus:text-primary transition-colors mb-8" />
          
          <div className="space-y-6">
             <div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 block mb-3 font-bold">Instrument Engine</span>
                <select 
                   value={activeInstrument} 
                   onChange={(e) => handleInstrumentChange(e.target.value as InstrumentType)}
                   className="w-full bg-surface-container-low rounded-xl py-3 px-4 text-xs font-mono uppercase tracking-widest text-on-surface border border-outline-variant/10 focus:border-primary/40 transition-all outline-none"
                >
                   <option value="piano">Concert Piano</option>
                   <option value="harmonium">Reed Harmonium</option>
                   <option value="sitar">Sitar (WIP)</option>
                </select>
             </div>
             <div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 block mb-3 font-bold">Input Method</span>
                <select 
                   value={keyboardLayout} 
                   onChange={(e) => setKeyboardLayout(e.target.value as KeyboardLayout)}
                   className="w-full bg-surface-container-low rounded-xl py-3 px-4 text-xs font-mono uppercase tracking-widest text-on-surface border border-outline-variant/10 focus:border-primary/40 transition-all outline-none"
                >
                   <option value="Piano">Chromatic Piano</option>
                   <option value="Harmonium">Classic Harmonium</option>
                   <option value="Swara">Swara Boards</option>
                </select>
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-12 scroll-thin">
           <section>
              <div className="font-mono text-[9px] uppercase tracking-widest text-primary/60 mb-6 font-bold">Studio Tracks</div>
              <div className="space-y-4">
                 {layers.map(layer => (
                   <button
                     key={layer.id}
                     onClick={() => setActiveLayerId(layer.id)}
                     className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all border ${
                       activeLayerId === layer.id ? 'bg-surface-container-high border-primary/40 shadow-glow' : 'bg-surface-lowest border-outline-variant/5 hover:border-outline-variant/20'
                     }`}
                   >
                     <div className="flex items-center gap-4">
                       <span className="material-symbols-outlined !text-xl opacity-40">{layer.type === 'melody' ? 'music_note' : 'equalizer'}</span>
                       <span className="font-sans text-xs font-medium uppercase tracking-widest opacity-80">{layer.name}</span>
                     </div>
                     <div className={`w-2 h-2 rounded-full ${activeLayerId === layer.id ? 'bg-primary animate-pulse' : 'bg-outline-variant/20'}`} />
                   </button>
                 ))}
              </div>
           </section>

           <section>
              <div className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 mb-6 font-bold">Raga Selection</div>
              <div className="relative group mb-4">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined !text-xl text-on-surface-variant/40">search</span>
                <input placeholder="Find foundation..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-surface-container-low rounded-xl py-3 pl-10 pr-4 text-xs font-sans border border-outline-variant/10" />
              </div>
              <div className="h-64 overflow-y-auto scroller-none space-y-1 pr-2">
                 {ragas.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).map(raga => (
                   <button key={raga.id} onClick={() => setSelectedRaga(raga)} className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-medium transition-all ${selectedRaga?.id === raga.id ? 'bg-primary/20 text-primary border border-primary/20' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'}`}>
                     {raga.name}
                   </button>
                 ))}
              </div>
           </section>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 relative flex flex-col bg-surface overflow-hidden">
        {/* Header HUD Capsule */}
        <div className="h-20 px-12 flex justify-between items-center border-b border-outline-variant/5 bg-surface/40 backdrop-blur-md">
           <div className="px-6 py-2 rounded-full bg-surface-container-high border border-outline-variant/10 flex items-center gap-4">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary/60 font-bold">Active Resonance</span>
              <span className="font-display text-lg font-light text-on-surface tracking-wide uppercase">{selectedRaga?.name || 'Searching...'}</span>
           </div>

           <div className="flex items-center gap-8">
              <div className="flex flex-col items-end">
                <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40">Master Tempo</span>
                <span className="font-mono text-xl font-light text-primary tracking-tighter">120.0 <span className="text-[10px] text-on-surface-variant/40">BPM</span></span>
              </div>
              <button className="px-6 py-2 bg-primary/10 border border-primary/20 rounded-xl font-mono text-[10px] uppercase tracking-widest text-primary hover:bg-primary/20 transition-all">Save Project</button>
           </div>
        </div>

        <div className="flex-1 overflow-auto p-12 space-y-12 scroll-thin">
           {/* Visual Keyboard Segment */}
           <section className="animate-slide-up">
              <Piano 
                layout={keyboardLayout}
                activeRagaNotes={selectedRaga?.aroha || []} 
                onNoteClick={(note, freq) => {
                  // Link piano click to selected step in sequencer
                  if (activeStep !== -1) {
                    handleToggleStep(activeStep, { label: note, frequency: freq })
                  }
                }}
              />
           </section>

           {/* Sequencer Grid */}
           <section className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-8 border-b border-outline-variant/5 pb-4">
                 <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-on-surface font-bold">Pulse Sequencer</span>
                 </div>
                 <div className="font-mono text-[10px] text-on-surface-variant/40 uppercase tracking-widest">16 Steps / {activeLayer.name}</div>
              </div>

              <div className="grid grid-cols-16 gap-3">
                 {new Array(STEPS).fill(0).map((_, i) => {
                   const step = activeLayer.sequence[i]
                   const isActive = step !== null
                   const isPlayhead = activeStep === i
                   
                   return (
                     <div key={i} className="flex flex-col gap-3">
                        <button
                          className={`w-full aspect-square rounded-2xl transition-all border flex flex-col items-center justify-center gap-2 group ${
                            isActive 
                              ? 'bg-primary border-primary shadow-glow scale-105' 
                              : isPlayhead 
                                ? 'bg-surface-container-highest border-primary/40' 
                                : 'bg-surface-lowest border-outline-variant/10 hover:border-outline-variant/30'
                          }`}
                        >
                           {isActive && <span className="font-mono text-[9px] font-bold text-white uppercase">{step.label || 'Note'}</span>}
                           {isPlayhead && !isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />}
                        </button>
                        <div className={`h-1 mx-auto rounded-full transition-all ${isPlayhead ? 'w-full bg-primary' : 'w-2 bg-outline-variant/10'}`} />
                     </div>
                   )
                 })}
              </div>
           </section>
        </div>

        {/* Playback Rail */}
        <div className="h-28 glass-panel mx-8 mb-8 rounded-[40px] border border-outline-variant/20 flex items-center justify-between px-16 shadow-2xl">
           <div className="flex items-center gap-12">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                  isPlaying ? 'bg-primary text-on-primary shadow-glow' : 'bg-surface-container-high border border-outline-variant/10 text-on-surface hover:text-primary'
                }`}
              >
                 <span className="material-symbols-outlined !text-4xl">{isPlaying ? 'square' : 'play_arrow'}</span>
              </button>
              
              <div className="flex flex-col">
                 <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40 mb-1">Time Signature</span>
                 <span className="font-mono text-xl font-light text-on-surface">16 / 4 <span className="text-[10px] opacity-40 italic">Matra</span></span>
              </div>
           </div>

           <div className="flex-1 flex justify-center gap-12 border-x border-outline-variant/10 mx-16 px-16">
              <div className="flex flex-col gap-2 w-48">
                 <div className="flex justify-between font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40">
                   <span>Main Vol</span>
                   <span className="text-primary">-0.0 DB</span>
                 </div>
                 <div className="h-1 bg-surface-container-low rounded-full overflow-hidden">
                    <div className="h-full w-[80%] bg-primary shadow-glow" />
                 </div>
              </div>
           </div>

           <button className="flex items-center gap-3 px-8 py-3.5 bg-primary text-on-primary rounded-2xl font-mono text-[10px] uppercase tracking-widest font-bold shadow-glow hover:scale-105 active:scale-95 transition-all">
              <span>Rec Master</span>
              <span className="material-symbols-outlined !text-xl animate-pulse">fiber_manual_record</span>
           </button>
        </div>
      </main>

      <Assistant ragaContext={selectedRaga} />
    </div>
  )
}

export default function StudioPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface-lowest flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    }>
      <StudioContent />
    </Suspense>
  )
}
