'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'
import { createClient } from '@/lib/supabase/client'
import { audioEngine } from '@/lib/audio'
import dynamic from 'next/dynamic'
import type { Raga } from '@saptaswara/core'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { usePlayback } from '@/context/PlaybackContext'

// Lazy-load heavy components
const Assistant = dynamic(() => import('@/components/Assistant').then(mod => mod.Assistant), { 
  ssr: false,
  loading: () => <div className="h-40 bg-white/5 animate-pulse rounded-2xl" /> 
})
const Piano = dynamic(() => import('@/components/Piano'), { 
  ssr: false,
  loading: () => <div className="h-64 bg-black/60 animate-pulse rounded-[48px]" />
})
const DrumPad = dynamic(() => import('@/components/DrumPad'), { 
  ssr: false,
  loading: () => <div className="h-64 bg-black/40 animate-pulse rounded-[32px]" />
})
const SwaPad = dynamic(() => import('@/components/SwaPad'), { 
  ssr: false,
  loading: () => <div className="h-64 bg-violet-900/10 animate-pulse rounded-[32px]" />
})
import { RagaEngine } from '@saptaswara/core'
import { CompositionProvider, useComposition } from '@/context/CompositionContext'
import { TALAS, DEFAULT_TALA, expandTala } from '@/lib/talas'
import type { Tala } from '@/lib/talas'
import { Guidebook } from '@/components/Guidebook'
import { LearnerGuide } from '@/components/LearnerGuide'
import { RagaRing } from '@/components/RagaRing'
import { EarTraining } from '@/components/EarTraining'
import TransportBar from '@/components/TransportBar'

// ── Track system ──────────────────────────────────────────────────────────────
type TrackType = 'melody' | 'rhythm' | 'vocal' | 'bass' | 'drone' | 'pad'
type KeyboardLayout = 'Piano' | 'Harmonium' | 'Swara' | 'SwaPad'

const TRACK_META: Record<TrackType, { icon: string; defaultName: string; colorIdx: number }> = {
  melody: { icon: 'music_note',  defaultName: 'Melody', colorIdx: 0 },
  rhythm: { icon: 'equalizer',   defaultName: 'Tabla',  colorIdx: 1 },
  vocal:  { icon: 'mic',         defaultName: 'Vocal',  colorIdx: 2 },
  bass:   { icon: 'piano',       defaultName: 'Bass',   colorIdx: 3 },
  drone:  { icon: 'waves',       defaultName: 'Drone',  colorIdx: 4 },
  pad:    { icon: 'blur_on',     defaultName: 'Pad',    colorIdx: 5 },
}

// Each index maps to a tailwind color family
const TRACK_COLORS = [
  { fill: 'bg-primary/25 border-primary/40',       text: 'text-primary',     dot: 'bg-primary',      active: 'bg-primary text-on-primary'       },
  { fill: 'bg-violet-500/25 border-violet-500/40', text: 'text-violet-400',  dot: 'bg-violet-400',   active: 'bg-violet-500 text-white'          },
  { fill: 'bg-rose-500/25 border-rose-500/40',     text: 'text-rose-400',    dot: 'bg-rose-400',     active: 'bg-rose-500 text-white'            },
  { fill: 'bg-amber-500/25 border-amber-500/40',   text: 'text-amber-400',   dot: 'bg-amber-400',    active: 'bg-amber-500 text-white'           },
  { fill: 'bg-emerald-500/25 border-emerald-500/40', text: 'text-emerald-400', dot: 'bg-emerald-400', active: 'bg-emerald-500 text-white'        },
  { fill: 'bg-cyan-500/25 border-cyan-500/40',     text: 'text-cyan-400',    dot: 'bg-cyan-400',     active: 'bg-cyan-500 text-white'            },
]

const LOOP_OPTIONS = [8, 16, 32] as const
const VELOCITY_STEPS = [0.25, 0.5, 0.75, 1.0] // shift+click cycles through these

interface StepEvent {
  label: string
  frequency?: number
  stroke?: string
  velocity: number  // 0–1
}

interface Track {
  id: string
  type: TrackType
  name: string
  sequence: (StepEvent | null)[]
  muted: boolean
  soloed: boolean
  volume: number    // -40 to 0 dB
  colorIdx: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
// Static IDs for base layers to ensure consistency across SSR and client hydration
const INITIAL_ID_MELODY = 'layer-melody-1'
const INITIAL_ID_RHYTHM = 'layer-rhythm-1'

function makeTrack(type: TrackType, loopLen: number, overrides: Partial<Track> = {}): Track {
  const meta = TRACK_META[type]
  return {
    id: overrides.id || `layer-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    name: meta.defaultName,
    sequence: new Array(loopLen).fill(null),
    muted: false,
    soloed: false,
    volume: 0,
    colorIdx: meta.colorIdx,
    ...overrides,
  }
}

// ── StudioContent ─────────────────────────────────────────────────────────────
function StudioContent() {
  const searchParams = useSearchParams()
  const projectIdFromUrl = searchParams.get('project_id')

  useEffect(() => { 
    document.title = 'Saptaswara Studio'
    setMounted(true)
  }, [])

  const { isPlaying, setIsPlaying, isRecording, setIsRecording, currentRagaId, setCurrentRagaId, saveTriggered } = usePlayback()
  const { state: comp, dispatch } = useComposition()
  const { activeInstrument, activeTradition } = comp

  // ── Core state ──────────────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<any>(null)
  
  // Track state initialized with static IDs for hydration safety
  const [tracks, setTracks] = useState<Track[]>([
    makeTrack('melody', 16, { id: INITIAL_ID_MELODY, name: 'Melody', colorIdx: 0 }),
    makeTrack('rhythm', 16, { id: INITIAL_ID_RHYTHM, name: 'Tabla',  colorIdx: 1 }),
  ])
  const [activeTrackId, setActiveTrackId] = useState(INITIAL_ID_MELODY)
  const [showAddTrack, setShowAddTrack] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)

  // ── Project state ────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [ragas, setRagas] = useState<Raga[]>([])
  const [selectedRaga, setSelectedRaga] = useState<Raga | null>(null)
  const [activeSwara, setActiveSwara] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isStarted, setIsStarted] = useState(false)
  const [activeStep, setActiveStep] = useState(-1)
  const [recordingTime, setRecordingTime] = useState(0)

  const [keyboardLayout, setKeyboardLayout] = useState<KeyboardLayout>('Piano')
  const [droneActive, setDroneActive] = useState(false)
  const [droneType, setDroneType] = useState<'Sa-Pa' | 'Sa-Ma'>('Sa-Pa')
  const [bpm, setBpm] = useState(120)
  const [volume, setVolume] = useState(0)
  const [loopLength, setLoopLength] = useState<8 | 16 | 32>(16)
  const [swingAmount, setSwingAmount] = useState(0)          // 0–0.5
  const [ragaConstrained, setRagaConstrained] = useState(false)
  const [selectedTala, setSelectedTala] = useState<Tala>(DEFAULT_TALA)
  const [laySetting, setLaySetting] = useState<'vilambit' | 'madhya' | 'drut'>('madhya')

  // Automatically switch Tala when tradition changes
  useEffect(() => {
    if (!selectedTala) return
    const currentIsHindustani = selectedTala.tradition === 'hindustani'
    const targetIsHindustani = activeTradition === 'hindustani'
    
    if (currentIsHindustani !== targetIsHindustani) {
      const defaultTala = TALAS.find(t => t.tradition === activeTradition)
      if (defaultTala) setSelectedTala(defaultTala)
    }
  }, [activeTradition, setSelectedTala])

  const [projectId, setProjectId] = useState<string | null>(projectIdFromUrl)
  const [projectName, setProjectName] = useState('Untitled Composition')
  const [detectedPhrases, setDetectedPhrases] = useState<any[]>([])
  const [ragasLoading, setRagasLoading] = useState(true)
  const [ragasError, setRagasError] = useState(false)
  const [isBlueprintPlaying, setIsBlueprintPlaying] = useState(false)
  const [isExportingMidi, setIsExportingMidi] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveModalTitle, setSaveModalTitle] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  const [showLearnGuide, setShowLearnGuide] = useState(false)
  const [showNotation, setShowNotation] = useState(false)
  const [showEarTraining, setShowEarTraining] = useState(false)

  const supabaseClient = createClient()

  // Refs to avoid stale closures in playback loop
  const tracksRef = useRef(tracks)
  const bpmRef    = useRef(bpm)
  const swingRef  = useRef(swingAmount)
  const loopRef   = useRef(loopLength)
  useEffect(() => { tracksRef.current = tracks   }, [tracks])
  useEffect(() => { bpmRef.current    = bpm      }, [bpm])
  useEffect(() => { swingRef.current  = swingAmount }, [swingAmount])
  useEffect(() => { loopRef.current   = loopLength  }, [loopLength])

  // ── Undo / Redo history (max 20 snapshots) ────────────────────────────────────
  const historyRef = useRef<Track[][]>([])
  const redoRef    = useRef<Track[][]>([])

  const pushHistory = useCallback((snapshot: Track[]) => {
    historyRef.current = [...historyRef.current.slice(-19), snapshot.map(t => ({ ...t, sequence: [...t.sequence] }))]
    redoRef.current = [] // clear redo on new action
  }, [])

  const handleUndo = useCallback(() => {
    if (historyRef.current.length === 0) return
    const prev = historyRef.current[historyRef.current.length - 1]
    historyRef.current = historyRef.current.slice(0, -1)
    redoRef.current = [...redoRef.current.slice(-19), tracks.map(t => ({ ...t, sequence: [...t.sequence] }))]
    setTracks(prev)
  }, [tracks])

  const handleRedo = useCallback(() => {
    if (redoRef.current.length === 0) return
    const next = redoRef.current[redoRef.current.length - 1]
    redoRef.current = redoRef.current.slice(0, -1)
    historyRef.current = [...historyRef.current, tracks.map(t => ({ ...t, sequence: [...t.sequence] }))]
    setTracks(next)
  }, [tracks])

  const playbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Raga loading ─────────────────────────────────────────────────────────────
  const loadRagas = useCallback(async () => {
    setRagasLoading(true)
    setRagasError(false)
    try {
      const { data: ragaData, error } = await supabaseClient.from('ragas').select('*, raga_phrases(*)').order('name')
      if (error) throw error
      if (ragaData && ragaData.length > 0) {
        setRagas(ragaData as any)
        const targetId = projectIdFromUrl || currentRagaId
        const initial = ragaData.find((r: any) => r.id === targetId) || ragaData[0]
        setSelectedRaga(initial as any)
        setCurrentRagaId(initial.id)
      }
    } catch (err) {
      console.error('Failed to load ragas:', err)
      setRagasError(true)
    } finally {
      setRagasLoading(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      let activeUser = null

      try {
        const { data: { user } } = await supabaseClient.auth.getUser()
        activeUser = user
      } catch (err) {
        console.warn('Studio: Supabase auth check failed, checking for guest mode.', err)
      }

      // Guest mode bypass for development and automated testing
      const isGuestMode = searchParams.get('guest') === 'true' || process.env.NODE_ENV === 'development'
      
      if (!activeUser && isGuestMode) {
        console.log('Studio: Initializing in Guest Mode.')
        activeUser = { 
          id: 'guest-user', 
          email: 'guest@saptaswara.ai',
          user_metadata: { full_name: 'Guest Composer' } 
        }
      }

      let token = accessToken
      // If no bearer token in state (cookie-auth login), try fetching from session
      if (!token) {
        const { data: { session } } = await supabaseClient.auth.getSession()
        token = session?.access_token ?? null
        if (token) setAccessToken(token)
      }

      setUser(activeUser)
      setAccessToken(token)
      await loadRagas()
    }
    init()
  }, [searchParams, loadRagas])

  // ── Navbar save trigger ──────────────────────────────────────────────────────
  useEffect(() => {
    if (saveTriggered > 0) handleSaveProject()
  }, [saveTriggered])

  // ── Playback engine (setTimeout chain for swing support) ────────────────────
  useEffect(() => {
    if (!isPlaying) {
      if (playbackTimer.current) clearTimeout(playbackTimer.current)
      setActiveStep(-1)
      return
    }

    let running = true

    const scheduleNext = (step: number) => {
      if (!running) return
      const currentStep = step % loopRef.current
      setActiveStep(currentStep)

      // Determine which tracks should play
      const allTracks = tracksRef.current
      const hasSolo = allTracks.some(t => t.soloed)
      allTracks.forEach(track => {
        const shouldPlay = !track.muted && (!hasSolo || track.soloed)
        if (!shouldPlay) return
        const event = track.sequence[currentStep]
        if (!event || !audioEngine) return
        const vel = event.velocity ?? 0.8
        if (track.type === 'rhythm') {
          audioEngine.playStroke(event.stroke || event.label)
        } else if (event.frequency) {
          audioEngine.playSwara(event.frequency, '8n', undefined, vel)
        }
      })

      // Swing timing: even steps get longer, odd steps shorter
      const baseMsPerStep = (60 / bpmRef.current) * 1000 / 4
      const swing = swingRef.current
      const swingMs = currentStep % 2 === 0
        ? baseMsPerStep * (1 + swing)
        : baseMsPerStep * (1 - swing)

      playbackTimer.current = setTimeout(
        () => scheduleNext(currentStep + 1),
        Math.max(swingMs, 30)
      )
    }

    scheduleNext(0)
    return () => {
      running = false
      if (playbackTimer.current) clearTimeout(playbackTimer.current)
    }
  }, [isPlaying])

  // ── Track management ─────────────────────────────────────────────────────────
  const addTrack = (type: TrackType) => {
    const t = makeTrack(type, loopLength)
    setTracks(prev => [...prev, t])
    setActiveTrackId(t.id)
    setShowAddTrack(false)
  }

  const removeTrack = (id: string) => {
    setTracks(prev => {
      if (prev.length <= 1) return prev
      const next = prev.filter(t => t.id !== id)
      if (activeTrackId === id) setActiveTrackId(next[0].id)
      return next
    })
  }

  const updateTrack = (id: string, patch: Partial<Track>) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  const toggleMute = (id: string) => {
    updateTrack(id, { muted: !tracks.find(t => t.id === id)?.muted })
  }

  const toggleSolo = (id: string) => {
    const isSoloed = tracks.find(t => t.id === id)?.soloed
    setTracks(prev => prev.map(t =>
      t.id === id ? { ...t, soloed: !isSoloed } : { ...t, soloed: false }
    ))
  }

  // When loop length changes, resize all track sequences
  const handleLoopLengthChange = (len: 8 | 16 | 32) => {
    pushHistory(tracks)
    setLoopLength(len)
    setTracks(prev => prev.map(t => {
      const seq = new Array(len).fill(null)
      t.sequence.slice(0, len).forEach((e, i) => { seq[i] = e })
      return { ...t, sequence: seq }
    }))
    setActiveStep(-1)
  }

  // ── Step toggling ─────────────────────────────────────────────────────────────
  const handleToggleStep = (stepIdx: number, value: StepEvent, trackId = activeTrackId) => {
    pushHistory(tracks)
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t
      const seq = [...t.sequence]
      seq[stepIdx] = seq[stepIdx]?.label === value.label ? null : value
      return { ...t, sequence: seq }
    }))
  }

  // Cycle velocity on a filled step: 25 → 50 → 75 → 100 → 25 …
  const cycleVelocity = (stepIdx: number, trackId: string) => {
    pushHistory(tracks)
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t
      const seq = [...t.sequence]
      const ev = seq[stepIdx]
      if (!ev) return t
      const curIdx = VELOCITY_STEPS.findIndex(v => ev.velocity <= v)
      const nextVel = VELOCITY_STEPS[(curIdx + 1) % VELOCITY_STEPS.length]
      seq[stepIdx] = { ...ev, velocity: nextVel }
      return { ...t, sequence: seq }
    }))
  }

  // ── Audio init ────────────────────────────────────────────────────────────────
  const handleInitAudio = async () => {
    if (audioEngine) {
      await audioEngine.start()
      audioEngine.setTimbre(activeInstrument as any, activeTradition as any)
      setIsStarted(true)
    }
  }

  React.useEffect(() => {
    if (isStarted && audioEngine) {
      audioEngine.setTimbre(activeInstrument as any, activeTradition as any)
    }
  }, [activeInstrument, activeTradition, isStarted])

  // Stop playback on unmount — do NOT dispose singleton
  useEffect(() => {
    return () => { audioEngine?.stopAll() }
  }, [])

  // ── Tanpura drone toggle ──────────────────────────────────────────────────────
  const handleToggleDrone = useCallback((nextActive?: boolean) => {
    const active = nextActive ?? !droneActive
    // Sa is tuned to C4 = 261.63 Hz (standard concert pitch for Indian classical)
    const rootFreq = 261.63
    audioEngine?.toggleDrone(active, droneType, rootFreq)
    setDroneActive(active)
  }, [droneActive, droneType])

  const handleCycleDroneType = useCallback(() => {
    const next: 'Sa-Pa' | 'Sa-Ma' = droneType === 'Sa-Pa' ? 'Sa-Ma' : 'Sa-Pa'
    setDroneType(next)
    if (droneActive) {
      const rootFreq = 261.63
      audioEngine?.toggleDrone(false, droneType, rootFreq)
      audioEngine?.toggleDrone(true, next, rootFreq)
    }
  }, [droneActive, droneType])

  // ── Blueprint (aroha/avaroha demo) ────────────────────────────────────────────
  const handlePlayBlueprint = () => {
    if (!audioEngine || !selectedRaga?.aroha || !selectedRaga?.avaroha) return
    if (isBlueprintPlaying) {
      audioEngine.isSequencing = false
      setIsBlueprintPlaying(false)
      setActiveSwara(null)
      return
    }
    setIsBlueprintPlaying(true)
    audioEngine.playArohaAvaroha(selectedRaga.aroha, selectedRaga.avaroha, (note) => {
      setActiveSwara(note)
      if (!note) setIsBlueprintPlaying(false)
    })
  }

  // ── Recording ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let interval: any
    if (isRecording) {
      setRecordingTime(0)
      interval = setInterval(() => setRecordingTime(prev => prev + 1), 1000)
    } else {
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [isRecording])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleToggleRecording = async () => {
    if (!audioEngine) return
    if (!isRecording) {
      await audioEngine.startRecording()
      setIsRecording(true)
    } else {
      await audioEngine.stopRecording()
      setIsRecording(false)
    }
  }

  // ── Real-time phrase detection ────────────────────────────────────────────────
  useEffect(() => {
    const melodyTrack = tracks.find(t => t.type === 'melody')
    if (!melodyTrack || !selectedRaga?.raga_phrases?.length) {
      setDetectedPhrases([])
      return
    }
    const seq = melodyTrack.sequence.filter(Boolean).map(s => s!.label)
    if (seq.length === 0) { setDetectedPhrases([]); return }
    try {
      setDetectedPhrases(RagaEngine.detectPhrases(seq as any, selectedRaga as any))
    } catch {
      setDetectedPhrases([])
    }
  }, [tracks, selectedRaga])

  // ── MIDI export ───────────────────────────────────────────────────────────────
  const handleExportMidi = async () => {
    setIsExportingMidi(true)
    try {
      // Resolve token from state or live session (handles cookie-auth users)
      let token = accessToken
      if (!token) {
        const { data: { session } } = await supabaseClient.auth.getSession()
        token = session?.access_token ?? null
        if (token) setAccessToken(token)
      }
      if (!token) { alert('Please sign in to export MIDI.'); return }
      const res = await fetch('/api/export/midi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ composition: { layers: tracks, bpm, name: projectName } }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        alert(json.error || 'MIDI export failed.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${projectName || 'composition'}.mid`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('MIDI export error:', err)
      alert('MIDI export failed.')
    } finally {
      setIsExportingMidi(false)
    }
  }

  // ── Global keyboard navigation ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      // Don't steal keys from inputs, textareas, or selects
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      switch (e.key) {
        case 'ArrowRight': {
          e.preventDefault()
          setActiveStep(prev => {
            const next = prev < 0 ? 0 : (prev + 1) % loopRef.current
            return next
          })
          break
        }
        case 'ArrowLeft': {
          e.preventDefault()
          setActiveStep(prev => {
            if (prev < 0) return loopRef.current - 1
            return (prev - 1 + loopRef.current) % loopRef.current
          })
          break
        }
        case 'ArrowDown': {
          e.preventDefault()
          setTracks(prev => {
            const idx = prev.findIndex(t => t.id === activeTrackId)
            const next = prev[(idx + 1) % prev.length]
            setActiveTrackId(next.id)
            return prev
          })
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          setTracks(prev => {
            const idx = prev.findIndex(t => t.id === activeTrackId)
            const next = prev[(idx - 1 + prev.length) % prev.length]
            setActiveTrackId(next.id)
            return prev
          })
          break
        }
        case 'Delete':
        case 'Backspace': {
          e.preventDefault()
          setActiveStep(prev => {
            if (prev < 0) return prev
            setTracks(ts => ts.map(t => {
              if (t.id !== activeTrackId) return t
              const seq = [...t.sequence]
              seq[prev] = null
              return { ...t, sequence: seq }
            }))
            return prev
          })
          break
        }
        case 'Escape': {
          setActiveStep(-1)
          break
        }
        case '?': {
          e.preventDefault()
          setShowGuide(v => !v)
          break
        }
        case ' ': {
          e.preventDefault()
          setIsPlaying(!isPlaying)
          break
        }
        case 'z': {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            if (e.shiftKey) handleRedo()
            else handleUndo()
          }
          break
        }
        case 'y': {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            handleRedo()
          }
          break
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeTrackId, setIsPlaying, handleUndo, handleRedo])

  // ── Save project ──────────────────────────────────────────────────────────────
  const handleSaveProject = async (titleOverride?: string) => {
    if (!user || user.id === 'guest-user') { alert('Please sign in to save projects.'); return }
    const saveTitle = titleOverride || projectName
    try {
      // Resolve token (handles cookie-auth users)
      let token = accessToken
      if (!token) {
        const { data: { session } } = await supabaseClient.auth.getSession()
        token = session?.access_token ?? null
        if (token) setAccessToken(token)
      }
      const melodyTrack = tracks.find(t => t.type === 'melody') || tracks[0]
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ projectId, title: saveTitle, raga_id: selectedRaga?.id, bpm, sequence: melodyTrack.sequence }),
      })
      const data = await res.json()
      if (data.id) { 
        setProjectId(data.id)
        setProjectName(saveTitle)
        setShowSaveModal(false)
        alert('Project saved!')
      }
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save project.')
    }
  }

  // ── Raga-valid notes ──────────────────────────────────────────────────────────
  const ragaValidNotes = ragaConstrained && selectedRaga
    ? [...(selectedRaga.aroha || []), ...(selectedRaga.avaroha || [])]
    : null

  const colors = (idx: number) => TRACK_COLORS[idx % TRACK_COLORS.length]

  // ── Render ────────────────────────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="min-h-screen bg-surface-lowest flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] overflow-hidden bg-background">

      {/* Save project modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-surface-lowest rounded-[32px] border border-outline-variant/10 p-10 shadow-2xl">
            <h2 className="font-display text-3xl font-light text-on-surface mb-2">Save Composition</h2>
            <p className="font-sans text-sm text-on-surface-variant/60 mb-8">Give your composition a name to save it to your projects.</p>
            <input
              id="save-title-input"
              type="text"
              value={saveModalTitle}
              onChange={e => setSaveModalTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && saveModalTitle.trim()) handleSaveProject(saveModalTitle.trim()) }}
              placeholder="e.g. Bhairavi Evening Loop"
              autoFocus
              className="w-full bg-surface-container-low rounded-xl py-3.5 px-4 text-sm font-sans text-on-surface border border-outline-variant/10 focus:border-primary/40 focus:outline-none transition-colors mb-6 placeholder:text-on-surface-variant/20"
            />
            <div className="flex gap-3">
              <button
                id="save-confirm-btn"
                onClick={() => { if (saveModalTitle.trim()) handleSaveProject(saveModalTitle.trim()) }}
                className="flex-1 py-3.5 bg-gradient-to-r from-primary to-primary/80 rounded-2xl font-medium text-white shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Save
              </button>
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-6 py-3.5 bg-surface-container-low rounded-2xl font-medium text-on-surface-variant hover:bg-surface-container-high transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audio init gate */}
      {!isStarted && (
        <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-8 animate-pulse text-primary">
            <span className="material-symbols-outlined !text-4xl">headphones</span>
          </div>
          <h2 className="font-display text-4xl font-light text-on-surface mb-4 tracking-tight">Ready to Play?</h2>
          <p className="text-on-surface-variant max-w-sm mb-12 font-sans font-light">
            Click the button below to start the audio engine and begin your raga session.
          </p>
          <button onClick={handleInitAudio} className="px-10 py-5 bg-primary text-on-primary rounded-2xl font-medium tracking-tight shadow-glow hover:scale-105 active:scale-95 transition-all">
            Initialize Audio Engine
          </button>
        </div>
      )}

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={`
        fixed md:relative z-50 md:z-auto inset-y-0 left-0
        flex-shrink-0 bg-surface-lowest border-r border-outline-variant/10 flex flex-col overflow-hidden
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-80 translate-x-0' : 'md:w-12 w-80 -translate-x-full md:translate-x-0'}
      `}>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setSidebarOpen(v => !v)}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="hidden md:flex absolute top-4 right-3 z-10 w-6 h-6 rounded-md items-center justify-center text-on-surface-variant/30 hover:text-primary hover:bg-white/5 transition-all"
        >
          <span className="material-symbols-outlined !text-base">
            {sidebarOpen ? 'chevron_left' : 'chevron_right'}
          </span>
        </button>

        {/* Mobile close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden absolute top-4 right-3 z-10 w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant/40 hover:text-on-surface transition-all"
        >
          <span className="material-symbols-outlined !text-base">close</span>
        </button>

        {/* Collapsed icon strip — desktop only */}
        {!sidebarOpen && (
          <div className="hidden md:flex flex-col items-center pt-14 gap-5 text-on-surface-variant/30">
            <span className="material-symbols-outlined !text-lg" title="Project">edit_note</span>
            <span className="material-symbols-outlined !text-lg" title="Tracks">layers</span>
            <span className="material-symbols-outlined !text-lg" title="Raga">music_note</span>
          </div>
        )}

        {/* Full sidebar content */}
        <div className={`flex flex-col flex-1 overflow-hidden transition-opacity duration-200 ${sidebarOpen ? 'opacity-100' : 'md:opacity-0 md:pointer-events-none opacity-100'}`}>
        {/* Project header */}
        <div className="p-8 border-b border-outline-variant/10 flex-shrink-0">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-2 font-bold opacity-60">Project</div>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full bg-transparent font-display text-2xl font-light text-on-surface focus:outline-none focus:text-primary transition-colors mb-8"
          />
          <div className="space-y-4">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 block mb-3 font-bold">Input Method</span>
              <select
                value={keyboardLayout}
                onChange={(e) => setKeyboardLayout(e.target.value as KeyboardLayout)}
                className="w-full bg-surface-container-low rounded-xl py-3 px-4 text-xs font-mono uppercase tracking-widest text-on-surface border border-outline-variant/10 focus:border-primary/40 transition-all outline-none"
              >
                <option value="SwaPad">Swara Pad</option>
                <option value="Piano">Chromatic Piano</option>
                <option value="Harmonium">Classic Harmonium</option>
                <option value="Swara">Swara Boards</option>
              </select>
            </div>

            {/* Tala selector */}
            <div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 block mb-2 font-bold">Tala</span>
              <select
                value={selectedTala.name}
                onChange={(e) => {
                  const t = TALAS.find(t => t.name === e.target.value) ?? DEFAULT_TALA
                  setSelectedTala(t)
                  handleLoopLengthChange(Math.min(32, Math.max(8, t.matras)) as any)
                }}
                className="w-full bg-surface-container-low rounded-xl py-3 px-4 text-xs font-mono uppercase tracking-widest text-on-surface border border-outline-variant/10 focus:border-primary/40 transition-all outline-none"
              >
                {TALAS.map(t => (
                  <option key={t.name} value={t.name}>{t.name} ({t.matras} matras)</option>
                ))}
              </select>
            </div>

            {/* Laya presets */}
            <div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 block mb-2 font-bold">Laya</span>
              <div className="flex gap-1.5">
                {(['vilambit', 'madhya', 'drut'] as const).map(lay => {
                  const [lo, hi] = selectedTala.laya[lay]
                  const midBpm   = Math.round((lo + hi) / 2)
                  return (
                    <button
                      key={lay}
                      onClick={() => { setLaySetting(lay); setBpm(midBpm) }}
                      className={`flex-1 py-2 rounded-xl font-mono text-[7px] uppercase tracking-wider font-bold transition-all border ${
                        laySetting === lay
                          ? 'bg-primary/20 text-primary border-primary/30'
                          : 'bg-surface-container-low text-on-surface-variant/40 border-outline-variant/10 hover:border-primary/20 hover:text-on-surface'
                      }`}
                      title={`${lo}–${hi} BPM`}
                    >
                      {lay}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin">
          {/* ── Track Manager ── */}
          <div className="p-6 border-b border-outline-variant/10">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[9px] uppercase tracking-widest text-primary/60 font-bold">Tracks</span>
              <button
                onClick={() => setShowAddTrack(v => !v)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                  showAddTrack ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant/60 hover:text-primary border border-outline-variant/10'
                }`}
                title="Add Track"
              >
                <span className="material-symbols-outlined !text-base">{showAddTrack ? 'close' : 'add'}</span>
              </button>
            </div>

            {/* Add Track panel */}
            {showAddTrack && (
              <div className="mb-4 p-4 rounded-2xl bg-surface-container-low/50 border border-outline-variant/10">
                <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40 mb-3">Choose track type</p>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(TRACK_META) as TrackType[]).map(type => {
                    const meta = TRACK_META[type]
                    const c = colors(meta.colorIdx)
                    return (
                      <button
                        key={type}
                        onClick={() => addTrack(type)}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/10 hover:border-primary/30 transition-all group"
                      >
                        <span className={`material-symbols-outlined !text-lg ${c.text} opacity-70 group-hover:opacity-100`}>{meta.icon}</span>
                        <span className="font-mono text-[7px] uppercase tracking-widest text-on-surface-variant/50 group-hover:text-on-surface">{meta.defaultName}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Track list */}
            <div className="space-y-2">
              {tracks.map(track => {
                const c = colors(track.colorIdx)
                const isActive = activeTrackId === track.id
                return (
                  <div
                    key={track.id}
                    className={`rounded-xl border transition-all ${
                      isActive ? `${c.fill} shadow-sm` : 'border-outline-variant/5 bg-surface-lowest hover:border-outline-variant/15'
                    }`}
                  >
                    {/* Main row */}
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      {/* Color dot + icon */}
                      <button onClick={() => setActiveTrackId(track.id)} className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot} ${isActive ? 'animate-pulse' : 'opacity-40'}`} />
                        <span className={`material-symbols-outlined !text-base flex-shrink-0 ${isActive ? c.text : 'text-on-surface-variant/40'}`}>
                          {TRACK_META[track.type].icon}
                        </span>
                        {renamingId === track.id ? (
                          <input
                            autoFocus
                            defaultValue={track.name}
                            onBlur={(e) => { updateTrack(track.id, { name: e.target.value || track.name }); setRenamingId(null) }}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                            className="flex-1 bg-transparent text-xs font-medium font-sans outline-none border-b border-primary/40"
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <span
                            className={`flex-1 text-xs font-medium font-sans truncate text-left ${isActive ? c.text : 'text-on-surface-variant/60'}`}
                            onDoubleClick={() => setRenamingId(track.id)}
                            title="Double-click to rename"
                          >
                            {track.name}
                          </span>
                        )}
                      </button>

                      {/* Controls */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleMute(track.id)}
                          title="Mute"
                          className={`w-6 h-6 rounded-md font-mono text-[8px] font-bold transition-all ${
                            track.muted ? 'bg-error/20 text-error border border-error/30' : 'text-on-surface-variant/30 hover:text-on-surface border border-transparent'
                          }`}
                        >
                          M
                        </button>
                        <button
                          onClick={() => toggleSolo(track.id)}
                          title="Solo"
                          className={`w-6 h-6 rounded-md font-mono text-[8px] font-bold transition-all ${
                            track.soloed ? 'bg-secondary/20 text-secondary border border-secondary/30' : 'text-on-surface-variant/30 hover:text-on-surface border border-transparent'
                          }`}
                        >
                          S
                        </button>
                        {tracks.length > 1 && (
                          <button
                            onClick={() => removeTrack(track.id)}
                            title="Remove track"
                            className="w-6 h-6 rounded-md text-on-surface-variant/20 hover:text-error transition-all flex items-center justify-center"
                          >
                            <span className="material-symbols-outlined !text-sm">remove</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Volume slider (only for active track) */}
                    {isActive && (
                      <div className="px-3 pb-2.5 flex items-center gap-2">
                        <span className="material-symbols-outlined !text-xs text-on-surface-variant/30">volume_up</span>
                        <input
                          type="range" min={-40} max={0} step={1} value={track.volume}
                          onChange={(e) => updateTrack(track.id, { volume: Number(e.target.value) })}
                          className="flex-1 h-0.5 accent-primary cursor-pointer"
                        />
                        <span className="font-mono text-[7px] text-on-surface-variant/30 w-8 text-right">{track.volume}dB</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Raga Selection ── */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 font-bold">Raga</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRagaConstrained(v => !v)}
                  title={ragaConstrained ? 'Raga constraint ON — only raga notes accepted' : 'Raga constraint OFF'}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[7px] uppercase tracking-widest font-bold transition-all ${
                    ragaConstrained
                      ? 'bg-secondary/20 text-secondary border border-secondary/30'
                      : 'bg-surface-container-low text-on-surface-variant/30 border border-outline-variant/5 hover:border-secondary/20'
                  }`}
                >
                  <span className="material-symbols-outlined !text-[10px]">{ragaConstrained ? 'lock' : 'lock_open'}</span>
                  {ragaConstrained ? 'Locked' : 'Free'}
                </button>
                <div className="flex p-0.5 rounded-full bg-surface-container-low border border-outline-variant/10">
                  {(['hindustani', 'carnatic'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => dispatch({ type: 'SET_TRADITION', value: t })}
                      className={`px-2 py-0.5 rounded-full font-mono text-[7px] uppercase tracking-widest font-bold transition-all ${
                        activeTradition === t
                          ? t === 'carnatic'
                            ? 'bg-secondary text-on-secondary shadow-sm'
                            : 'bg-primary text-on-primary shadow-sm'
                          : 'text-on-surface-variant/40 hover:text-on-surface'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="relative mb-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined !text-base text-on-surface-variant/30">search</span>
              {(() => {
                const filteredForNav = ragas.filter(r => {
                  const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase())
                  const matchTradition = !r.tradition || r.tradition.toLowerCase() === activeTradition
                  return matchSearch && matchTradition
                })
                return (
                  <input
                    placeholder="Find raga..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value) }}
                    onKeyDown={(e) => {
                      if (!filteredForNav.length) return
                      const idx = filteredForNav.findIndex(r => r.id === selectedRaga?.id)
                      if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        const next = filteredForNav[Math.min(idx + 1, filteredForNav.length - 1)]
                        if (next) { setSelectedRaga(next); setCurrentRagaId(next.id) }
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        const next = filteredForNav[Math.max(idx - 1, 0)]
                        if (next) { setSelectedRaga(next); setCurrentRagaId(next.id) }
                      } else if (e.key === 'Enter' && filteredForNav.length > 0) {
                        e.preventDefault()
                        const pick = idx < 0 ? filteredForNav[0] : filteredForNav[idx]
                        setSelectedRaga(pick); setCurrentRagaId(pick.id)
                      }
                    }}
                    className="w-full bg-surface-container-low rounded-xl py-2.5 pl-9 pr-4 text-xs font-sans border border-outline-variant/10 outline-none focus:border-primary/30"
                  />
                )
              })()}
            </div>
            <div className="h-52 overflow-y-auto scroller-none space-y-1">
              {ragasLoading ? (
                [1,2,3,4].map(i => <div key={i} className="h-8 rounded-lg bg-surface-container-high/50 animate-pulse mb-1" />)
              ) : ragasError ? (
                <div className="py-6 text-center">
                  <span className="material-symbols-outlined !text-xl text-error/40 block mb-2">wifi_off</span>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-error/60 mb-2">Failed to load</p>
                  <button onClick={loadRagas} className="font-mono text-[8px] uppercase tracking-widest text-primary/60 hover:text-primary border border-primary/20 px-3 py-1 rounded-lg transition-all">Retry</button>
                </div>
              ) : (() => {
                const filtered = ragas.filter(r => {
                  const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase())
                  const matchTradition = !r.tradition || r.tradition.toLowerCase() === activeTradition
                  return matchSearch && matchTradition
                })
                if (!filtered.length) return <div className="py-6 text-center opacity-40"><p className="font-mono text-[8px] uppercase tracking-widest">No ragas found</p></div>
                return filtered.map(raga => (
                  <button
                    key={raga.id}
                    onClick={() => { setSelectedRaga(raga); setCurrentRagaId(raga.id) }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all relative overflow-hidden ${
                      selectedRaga?.id === raga.id 
                        ? 'bg-primary/20 text-primary border border-primary/40 shadow-[0_0_15px_-3px_rgba(var(--primary-rgb),0.3)]' 
                        : 'text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container-high border border-transparent'
                    }`}
                  >
                    {selectedRaga?.id === raga.id && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-r-full" />
                    )}
                    {raga.name}
                  </button>
                ))
              })()}
            </div>
          </div>
        </div>
        </div>{/* end full sidebar content */}
      </aside>

      {/* ── Main Workspace ────────────────────────────────────────────────────── */}
      <main className="flex-1 relative flex flex-col bg-surface overflow-hidden min-w-0">

        {/* HUD */}
        <div className="h-14 md:h-20 px-3 md:px-10 flex justify-between items-center border-b border-outline-variant/5 bg-surface/40 backdrop-blur-md flex-shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile sidebar open button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant/40 hover:text-primary hover:bg-white/5 transition-all flex-shrink-0 border border-outline-variant/10"
            >
              <span className="material-symbols-outlined !text-base">menu</span>
            </button>

            <div className="px-3 md:px-5 py-1.5 md:py-2 rounded-full bg-surface-container-high border border-outline-variant/10 flex items-center gap-2 min-w-0">
              <span className="font-mono text-[7px] md:text-[8px] uppercase tracking-[0.2em] text-primary/60 font-bold hidden sm:block">Active Resonance</span>
              <span className="font-display text-sm md:text-base font-light text-on-surface tracking-wide uppercase truncate">
                {selectedRaga?.name || (ragasLoading ? '...' : 'Select a Raga')}
              </span>
            </div>
            <div className="hidden sm:flex px-3 py-1.5 rounded-full bg-white/5 border border-white/10 items-center gap-2 flex-shrink-0">
              <span className="font-mono text-[8px] uppercase tracking-widest text-white/40 font-bold">{activeTradition}</span>
              <div className="w-px h-3 bg-white/10" />
              <span className="font-mono text-[8px] uppercase tracking-widest text-primary/70 font-bold">{activeInstrument}</span>
            </div>

            {/* ── Tanpura Drone — always visible in HUD ── */}
            {isStarted && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleToggleDrone()}
                  title={droneActive ? 'Stop tanpura drone' : 'Start tanpura drone (Sa–Pa)'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-[9px] uppercase tracking-widest font-bold transition-all active:scale-95 ${
                    droneActive
                      ? 'bg-secondary/20 border-secondary/40 text-secondary shadow-[0_0_12px_rgba(132,214,185,0.2)]'
                      : 'border-outline-variant/15 text-on-surface-variant/40 hover:text-secondary/70 hover:border-secondary/20 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined !text-sm">radio_button_checked</span>
                  Tanpura
                  {droneActive && <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />}
                </button>
                {droneActive && (
                  <button
                    onClick={handleCycleDroneType}
                    title="Toggle Sa-Pa / Sa-Ma tuning"
                    className="px-2 py-1.5 rounded-xl border border-secondary/20 bg-secondary/5 font-mono text-[8px] text-secondary/60 hover:text-secondary hover:border-secondary/40 transition-all"
                  >
                    {droneType}
                  </button>
                )}
              </div>
            )}
            {/* Phrase detection badges — desktop only */}
            <div className="hidden lg:flex gap-2">
              {detectedPhrases.map((phrase, i) => (
                <div key={i} className="px-3 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 flex items-center gap-1.5 animate-glow">
                  <span className="material-symbols-outlined !text-xs text-secondary">verified</span>
                  <span className="font-mono text-[8px] uppercase tracking-widest text-secondary font-bold whitespace-nowrap">{phrase.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-6 flex-shrink-0">
            <div className="hidden sm:flex flex-col items-end">
              <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40">Tempo</span>
              <span className="font-mono text-lg font-light text-primary">{bpm} <span className="text-[9px] text-on-surface-variant/40">BPM</span></span>
            </div>
            <button
              id="save-project-btn"
              onClick={() => { setSaveModalTitle(projectName); setShowSaveModal(true) }}
              className="px-3 md:px-5 py-2 bg-primary/10 border border-primary/20 rounded-xl font-mono text-[10px] uppercase tracking-widest text-primary hover:bg-primary/20 transition-all active:scale-95"
            >
              Save
            </button>
            {isStarted && (
              <button
                onClick={() => setShowEarTraining(true)}
                title="Ear Training — identify swaras by listening"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-tertiary/20 bg-tertiary/5 font-mono text-[9px] uppercase tracking-widest text-tertiary/70 hover:text-tertiary hover:border-tertiary/40 hover:bg-tertiary/10 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined !text-sm">hearing</span>
                Ear
              </button>
            )}
            <button
              onClick={() => setShowLearnGuide(v => !v)}
              title="Open Learner's Guide"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-secondary/20 bg-secondary/5 font-mono text-[9px] uppercase tracking-widest text-secondary/70 hover:text-secondary hover:border-secondary/40 hover:bg-secondary/10 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined !text-sm">school</span>
              Learn
            </button>
            <button
              onClick={() => setShowGuide(v => !v)}
              title="Open Studio Guide (?)"
              className="w-8 h-8 rounded-xl border border-outline-variant/15 bg-surface-container-high/40 flex items-center justify-center font-mono text-xs font-bold text-on-surface-variant/50 hover:text-primary hover:border-primary/30 transition-all active:scale-95"
            >
              ?
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-auto p-4 md:p-10 space-y-8 md:space-y-14 scroll-thin">

          {/* ── Step Sequencer ── */}
          <section className="animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined !text-base">grid_on</span>
                </div>
                <div>
                  <h3 className="font-display text-lg font-light text-on-surface tracking-tight uppercase">Step Sequencer</h3>
                  <p className="font-mono text-[7px] uppercase tracking-widest text-on-surface-variant/30 font-bold">
                    Select step → press key to record · Shift+click filled step to cycle velocity
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Loop length */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-container-low border border-outline-variant/10">
                  {LOOP_OPTIONS.map(len => (
                    <button
                      key={len}
                      onClick={() => handleLoopLengthChange(len as any)}
                      className={`px-3 py-1 rounded-lg font-mono text-[8px] font-bold transition-all ${
                        loopLength === len ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant/40 hover:text-on-surface'
                      }`}
                    >
                      {len}
                    </button>
                  ))}
                </div>
                {/* Notation view toggle */}
                <button
                  onClick={() => setShowNotation(v => !v)}
                  title="Toggle notation view"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border font-mono text-[8px] uppercase tracking-widest font-bold transition-all ${
                    showNotation
                      ? 'bg-secondary/15 border-secondary/30 text-secondary'
                      : 'border-outline-variant/10 text-on-surface-variant/30 hover:text-on-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined !text-sm">abc</span>
                  Notation
                </button>
                <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/30">
                  {activeStep >= 0 && !isPlaying ? `Step ${activeStep + 1}` : isPlaying ? '▶' : ''}
                </span>
              </div>
            </div>

            <div className="rounded-[20px] bg-surface-lowest border border-outline-variant/10 p-3 md:p-5 overflow-x-auto">
              <div className="min-w-[480px]">
              {/* Tala-aware beat markers */}
              {(() => {
                const cells = expandTala(selectedTala)
                // Only show up to loopLength cells; pad if tala < loopLength
                const displayCells = Array.from({ length: loopLength }, (_, i) => cells[i % cells.length])
                return (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-28 flex-shrink-0" />
                    <div className="flex-1" style={{ display: 'grid', gridTemplateColumns: `repeat(${loopLength}, minmax(0,1fr))`, gap: '3px' }}>
                      {displayCells.map((cell, i) => (
                        <div
                          key={i}
                          className={`text-center font-mono text-[6px] leading-tight ${
                            cell.isSam
                              ? 'text-amber-400 font-black'
                              : cell.isFirstInVibhag && cell.type === 'khali'
                                ? 'text-on-surface-variant/30 font-bold'
                                : cell.isFirstInVibhag
                                  ? 'text-primary/60 font-bold'
                                  : 'text-on-surface-variant/15'
                          }`}
                          title={cell.isSam ? 'Sam (X)' : cell.isFirstInVibhag ? cell.type === 'khali' ? 'Khali (0)' : `Tali ${cell.label}` : ''}
                        >
                          {cell.isSam ? 'X' : cell.isFirstInVibhag ? cell.type === 'khali' ? '0' : cell.label : '·'}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Track rows */}
              {tracks.map(track => {
                const c = colors(track.colorIdx)
                const isActiveTrack = activeTrackId === track.id
                const hasSolo = tracks.some(t => t.soloed)
                const isAudible = !track.muted && (!hasSolo || track.soloed)
                return (
                  <div key={track.id} className={`flex items-center gap-2 py-1 ${!isAudible ? 'opacity-30' : ''}`}>
                    {/* Track label */}
                    <button
                      onClick={() => setActiveTrackId(track.id)}
                      className={`w-28 flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all text-left ${
                        isActiveTrack ? `${c.fill} border` : 'hover:bg-surface-container-high/30'
                      }`}
                    >
                      <span className={`material-symbols-outlined !text-xs ${isActiveTrack ? c.text : 'text-on-surface-variant/30'}`}>
                        {TRACK_META[track.type].icon}
                      </span>
                      <span className={`font-mono text-[8px] uppercase tracking-widest truncate ${isActiveTrack ? c.text : 'text-on-surface-variant/30'} font-bold`}>
                        {track.name}
                      </span>
                    </button>

                    {/* Step cells */}
                    <div className="flex-1" style={{ display: 'grid', gridTemplateColumns: `repeat(${loopLength}, minmax(0,1fr))`, gap: '3px' }}>
                      {track.sequence.map((event, stepIdx) => {
                        const isActiveStep = activeStep === stepIdx && isPlaying
                        const isSelected = activeStep === stepIdx && !isPlaying && isActiveTrack
                        const hasNote = !!event
                        const velPct = hasNote ? Math.round((event!.velocity ?? 0.8) * 100) : 0
                        const isBeat = stepIdx % 4 === 0
                        return (
                          <button
                            key={stepIdx}
                            onClickCapture={(e) => {
                              if (isPlaying) return
                              if (e.shiftKey && hasNote) {
                                cycleVelocity(stepIdx, track.id)
                                return
                              }
                              setActiveTrackId(track.id)
                              if (hasNote) {
                                handleToggleStep(stepIdx, event!, track.id)
                                if (activeStep === stepIdx && isActiveTrack) setActiveStep(-1)
                              } else {
                                setActiveStep(activeStep === stepIdx && isActiveTrack ? -1 : stepIdx)
                              }
                            }}
                            title={
                              hasNote
                                ? `${track.type === 'melody' ? event!.label : event!.stroke} (vel ${velPct}%) · Shift+click to cycle velocity`
                                : `Record to step ${stepIdx + 1}`
                            }
                            className={`relative h-8 rounded-md font-mono text-[7px] font-bold transition-all border flex items-end justify-center pb-0.5 overflow-hidden ${
                              isActiveStep
                                ? `${c.active} border-transparent shadow-step-active`
                                : isSelected
                                ? `border-primary/70 bg-primary/10 text-primary ring-1 ring-primary/20`
                                : hasNote
                                ? isActiveTrack
                                  ? `${c.fill} ${c.text}`
                                  : 'bg-surface-container-high border-outline-variant/20 text-on-surface/50'
                                : isBeat
                                ? 'bg-surface-container-low/50 border-outline-variant/10 text-transparent hover:border-primary/15'
                                : 'bg-surface-container-low/20 border-outline-variant/5 text-transparent hover:border-outline-variant/10'
                            }`}
                          >
                            {/* Velocity fill bar */}
                            {hasNote && !isActiveStep && (
                              <div
                                className={`absolute bottom-0 left-0 right-0 opacity-40 rounded-b-md ${isActiveTrack ? c.dot : 'bg-white'}`}
                                style={{ height: `${velPct}%` }}
                              />
                            )}
                            {/* Beat ring pulse — expands and fades on the active playhead */}
                            {isActiveStep && (
                              <span
                                key={`ring-${stepIdx}-${activeStep}`}
                                className="absolute inset-0 rounded-md border-2 border-current animate-beat-ring pointer-events-none"
                              />
                            )}
                            <span className="relative z-10">
                              {hasNote ? (track.type === 'melody' ? event!.label : event!.stroke) : null}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>{/* end min-w-[480px] */}
            </div>

            {/* ── Notation view ── */}
            {showNotation && (() => {
              const activeTrack = tracks.find(t => t.id === activeTrackId)
              if (!activeTrack) return null
              // Build notation string: each filled step as label, rests as "—", barlines every 4
              const tokens = activeTrack.sequence.map((s, i) => {
                const tok = s
                  ? (activeTrack.type === 'melody' ? s.label : (s.stroke ?? '—'))
                  : '—'
                // Insert | barline before every 4th step (except the first)
                return i > 0 && i % 4 === 0 ? `| ${tok}` : tok
              })
              const notationLine = tokens.join('  ')
              return (
                <div className="mt-3 px-5 py-4 rounded-2xl bg-surface-container border border-outline-variant/10 animate-fade-in">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-secondary/70 font-bold">
                      {activeTrack.name} — Swara Notation
                    </span>
                    <div className="flex-1 h-px bg-outline-variant/10" />
                    <span className="font-mono text-[8px] text-on-surface-variant/30">{bpm} BPM · {selectedTala.name}</span>
                  </div>
                  <p className="font-mono text-sm text-on-surface/80 leading-relaxed tracking-wider">
                    {notationLine}
                  </p>
                  <p className="font-mono text-[8px] text-on-surface-variant/25 mt-2">
                    — = rest &nbsp;·&nbsp; | = vibhag boundary
                  </p>
                </div>
              )
            })()}
          </section>

          {/* ── Input section: Piano for melodic tracks, DrumPad for rhythm ── */}
          {(() => {
            const activeTrack = tracks.find(t => t.id === activeTrackId)
            const isRhythmTrack = activeTrack?.type === 'rhythm'

            if (isRhythmTrack) {
              return (
                <section className="animate-slide-up max-w-4xl mx-auto">
                  {/* Context hint */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-2 h-2 rounded-full ${activeStep >= 0 ? 'bg-primary animate-pulse' : 'bg-outline-variant/30'}`} />
                    <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40">
                      {activeStep >= 0
                        ? `Step ${activeStep + 1} selected — press a key or click a pad to record`
                        : 'Select a step in the grid above, then press a key to record'}
                    </span>
                  </div>
                  <DrumPad
                    keyboardActive={true}
                    onStroke={(stroke) => {
                      if (activeStep === -1) return
                      handleToggleStep(activeStep, { label: stroke, stroke, velocity: 0.8 })
                    }}
                  />
                </section>
              )
            }

            // Derive raga grammar for Piano visual encoding
            const ragaAroha   = selectedRaga?.aroha   || []
            const ragaAvaroha = selectedRaga?.avaroha || []
            const allRagaNotes = [...ragaAroha, ...ragaAvaroha]

            const onNoteRecord = (note: string, freq: number) => {
              if (activeStep === -1) return
              if (ragaValidNotes && !(ragaValidNotes as string[]).includes(note)) return
              handleToggleStep(activeStep, { label: note, frequency: freq, velocity: 0.8 })
            }

            return (
              <section className="animate-slide-up">
                {/* Context hint */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full ${activeStep >= 0 ? 'bg-primary animate-pulse' : 'bg-outline-variant/30'}`} />
                  <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40">
                    {activeStep >= 0
                      ? `Step ${activeStep + 1} selected — ${keyboardLayout === 'SwaPad' ? 'tap a swara' : 'press a key'} to record`
                      : 'Select a step in the grid above to start recording'}
                  </span>
                </div>

                {keyboardLayout === 'SwaPad' ? (
                  <SwaPad
                    activeRagaNotes={allRagaNotes}
                    ragaConstrained={ragaConstrained}
                    vadiNote={selectedRaga?.vadi}
                    onSwara={(label, freq) => onNoteRecord(label, freq)}
                  />
                ) : (
                  <Piano
                    layout={keyboardLayout === 'Piano' ? 'Piano' : keyboardLayout === 'Harmonium' ? 'Harmonium' : 'Swara'}
                    activeRagaNotes={allRagaNotes}
                    externalActiveNote={activeSwara || ''}
                    vadiNote={selectedRaga?.vadi}
                    samvadiNote={selectedRaga?.samvadi}
                    onNoteClick={onNoteRecord}
                  />
                )}

                {ragaConstrained && selectedRaga && (
                  <div className="mt-3 flex items-center gap-2 justify-center">
                    <span className="material-symbols-outlined !text-sm text-secondary/60">lock</span>
                    <span className="font-mono text-[8px] uppercase tracking-widest text-secondary/60">
                      Raga constraint active — only {selectedRaga.name} notes accepted
                    </span>
                  </div>
                )}
              </section>
            )
          })()}

          {/* ── Raga Ring Diagram ── */}
          {selectedRaga?.aroha && selectedRaga?.avaroha && (
            <section className="animate-slide-up max-w-4xl mx-auto border-t border-outline-variant/5 pt-14">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
                <div className="flex-shrink-0">
                  <RagaRing
                    ragaName={selectedRaga.name}
                    aroha={selectedRaga.aroha as string[]}
                    avaroha={selectedRaga.avaroha as string[]}
                    vadi={selectedRaga.vadi}
                    samvadi={selectedRaga.samvadi}
                    size={220}
                  />
                </div>
                <div className="flex-1 space-y-5">
                  <div>
                    <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40 font-bold block mb-1">Aroha</span>
                    <p className="font-label text-base text-on-surface/80 tracking-wide">
                      {(selectedRaga.aroha as string[]).join(' – ')}
                    </p>
                  </div>
                  <div>
                    <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40 font-bold block mb-1">Avaroha</span>
                    <p className="font-label text-base text-on-surface/80 tracking-wide">
                      {(selectedRaga.avaroha as string[]).join(' – ')}
                    </p>
                  </div>
                  {selectedRaga.vadi && (
                    <div className="flex gap-6">
                      <div>
                        <span className="font-mono text-[8px] uppercase tracking-widest text-amber-400/70 font-bold block mb-1">Vadi</span>
                        <span className="font-label text-lg font-bold text-amber-400">{selectedRaga.vadi}</span>
                      </div>
                      {selectedRaga.samvadi && (
                        <div>
                          <span className="font-mono text-[8px] uppercase tracking-widest text-blue-400/70 font-bold block mb-1">Samvadi</span>
                          <span className="font-label text-lg font-bold text-blue-400">{selectedRaga.samvadi}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {selectedRaga.mood && (
                    <div>
                      <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40 font-bold block mb-1">Rasa</span>
                      <p className="font-sans text-sm text-on-surface-variant/70 font-light">{selectedRaga.mood}</p>
                    </div>
                  )}
                  {(selectedRaga as any).time_of_day && (
                    <div>
                      <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40 font-bold block mb-1">Time of Day</span>
                      <p className="font-sans text-sm text-on-surface-variant/70 font-light">{(selectedRaga as any).time_of_day}</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ── Melodic Guide ── */}
          <section className="animate-slide-up max-w-4xl mx-auto border-t border-outline-variant/5 pt-14">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined">menu_book</span>
                </div>
                <div>
                  <h3 className="font-display text-2xl font-light text-on-surface tracking-tight uppercase">Melodic Guide</h3>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 font-bold">Characteristic Phrases (Pakads)</p>
                </div>
              </div>
              {selectedRaga?.aroha && selectedRaga?.avaroha && (
                <button
                  onClick={handlePlayBlueprint}
                  disabled={!isStarted}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-mono text-[10px] uppercase tracking-widest font-bold transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
                    isBlueprintPlaying ? 'bg-secondary text-on-secondary animate-pulse shadow-glow' : 'bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20'
                  }`}
                >
                  <span className="material-symbols-outlined !text-base">{isBlueprintPlaying ? 'stop' : 'play_arrow'}</span>
                  {isBlueprintPlaying ? 'Stop' : 'Play Blueprint'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedRaga?.raga_phrases && (selectedRaga.raga_phrases as any).length > 0 ? (
                (selectedRaga.raga_phrases as any).map((phrase: any, i: number) => (
                  <div key={i} className="p-6 rounded-3xl bg-surface-container-low/40 border border-outline-variant/10 hover:border-secondary/20 transition-all group/guide">
                    <div className="flex justify-between items-start mb-4">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-secondary font-bold">{phrase.label}</span>
                      <span className="material-symbols-outlined !text-lg text-secondary/0 group-hover/guide:text-secondary/40 transition-all">info</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {phrase.sequence.map((s: string, j: number) => (
                        <span key={j} className="font-label text-sm text-on-surface/80">
                          {s}{j < phrase.sequence.length - 1 ? ' - ' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 p-12 rounded-[32px] border border-dashed border-outline-variant/10 text-center opacity-40">
                  <p className="font-sans text-sm font-light italic">No signature phrases archived for this foundation yet.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ── Transport Rail ── */}
        <TransportBar
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          isRecording={isRecording}
          onToggleRecording={handleToggleRecording}
          recordingTime={recordingTime}
          bpm={bpm}
          onBpmChange={(v) => { setBpm(v); Tone.getTransport().bpm.value = v }}
          volume={volume}
          onVolumeChange={(v) => { setVolume(v); audioEngine?.setVolume(v) }}
          tala={selectedTala}
        />
      </main>

      <Guidebook open={showGuide} onClose={() => setShowGuide(false)} />
      <LearnerGuide open={showLearnGuide} onClose={() => setShowLearnGuide(false)} />
      {showEarTraining && (
        <EarTraining raga={selectedRaga} onClose={() => setShowEarTraining(false)} />
      )}

      {/* ── Mobile gate — studio requires a desktop viewport ── */}
      <div className="md:hidden fixed inset-0 z-[9999] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center px-8 text-center">
        <div className="mb-8 w-16 h-16 rounded-[20px] bg-surface-container-high border border-outline-variant/10 flex items-center justify-center">
          <span className="material-symbols-outlined !text-3xl text-primary/70">desktop_windows</span>
        </div>
        <h2 className="font-display text-3xl font-light text-on-surface tracking-tight mb-3">
          Studio needs a bigger screen.
        </h2>
        <p className="font-sans text-sm text-on-surface-variant/60 font-light leading-relaxed max-w-xs mb-8">
          The Saptaswara Studio is designed for desktop and tablet. Open it on a device with a wider screen for the full experience.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <a
            href="/learn"
            className="py-3 px-6 bg-primary/10 border border-primary/20 rounded-2xl font-sans text-sm text-primary font-medium text-center"
          >
            Go to Learner Guide
          </a>
          <a
            href="/"
            className="py-3 px-6 bg-surface-container-high border border-outline-variant/10 rounded-2xl font-sans text-sm text-on-surface-variant font-medium text-center"
          >
            Back to Home
          </a>
        </div>
      </div>

      <Assistant
        ragaContext={selectedRaga}
        studioContext={(() => {
          const active = tracks.find(t => t.id === activeTrackId)
          if (!active) return undefined
          const steps = active.sequence
            .map((s, i) => s ? `step${i + 1}:${typeof s === 'object' && 'note' in s ? (s as any).note : s}` : null)
            .filter(Boolean)
          return steps.length
            ? `Track "${active.name}" (${active.type}), ${active.sequence.length} steps, BPM ${bpm}: [${steps.join(', ')}]`
            : undefined
        })()}
      />
    </div>
  )
}

export default function StudioPage() {
  return (
    <CompositionProvider>
      <Suspense fallback={
        <div className="min-h-screen bg-surface-lowest flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }>
        <StudioContent />
      </Suspense>
    </CompositionProvider>
  )
}
