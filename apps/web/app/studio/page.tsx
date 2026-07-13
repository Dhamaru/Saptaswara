'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'
import { createClient } from '@/lib/supabase/client'
import { audioEngine } from '@/lib/audio'
import type { MasteringPreset } from '@/lib/audio'
import dynamic from 'next/dynamic'
import type { Raga } from '@saptaswara/core'
import { useSearchParams, useRouter } from 'next/navigation'
import { useGlobalAssistant } from '@/context/GlobalAssistantContext'
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
import { isVarjya } from '@/lib/ragaUtils'
import { swaraDisplayName } from '@/lib/swaraUtils'
import { swaraToFrequency } from '@/lib/musicalMath'
import { MoodPicker } from '@/components/MoodPicker'


import { SwaraTranscriber } from '@/components/SwaraTranscriber'
import type { Tala } from '@/lib/talas'
import { Guidebook } from '@/components/Guidebook'
import { LearnerGuide } from '@/components/LearnerGuide'
import { RagaRing } from '@/components/RagaRing'
import { EarTraining } from '@/components/EarTraining'
import TransportBar from '@/components/TransportBar'
import { ImmersiveHUD } from '@/components/ImmersiveHUD'
import { ConformanceScore } from '@/components/ConformanceScore'

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

// Maps swara label → QWERTY key shown on immersive side panels
const SWARA_KEY_LABELS: Record<string, string> = {
  'Sa': 'A', 're': 'W', 'Re': 'S', 'ga': 'E', 'Ga': 'D',
  'Ma': 'F', 'ma': 'T', 'Pa': 'G', 'dha': 'Y', 'Dha': 'H',
  'ni': 'U', 'Ni': 'J',
}

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

// ── MIDI import helpers ────────────────────────────────────────────────────────
function readVlq(view: DataView, offset: number): { value: number; bytesRead: number } {
  let value = 0; let bytesRead = 0
  let byte: number
  do {
    byte = view.getUint8(offset + bytesRead)
    value = (value << 7) | (byte & 0x7F)
    bytesRead++
  } while (byte & 0x80)
  return { value, bytesRead }
}

function parseMidiNoteEvents(buf: ArrayBuffer): { midiNote: number; tick: number }[] {
  const view = new DataView(buf)
  if (view.getUint32(0) !== 0x4D546864) return []
  const tickDiv = view.getInt16(12)
  if (tickDiv <= 0) return []

  const events: { midiNote: number; tick: number }[] = []
  let pos = 14
  const totalLen = buf.byteLength

  while (pos + 8 <= totalLen) {
    const chunkType = view.getUint32(pos)
    const chunkLen = view.getUint32(pos + 4)
    pos += 8
    if (chunkType !== 0x4D54726B) { pos += chunkLen; continue }

    let tick = 0
    let p = pos
    const end = pos + chunkLen
    let runningStatus = 0

    while (p < end) {
      const delta = readVlq(view, p)
      tick += delta.value
      p += delta.bytesRead
      if (p >= end) break

      let statusByte = view.getUint8(p)
      if (statusByte & 0x80) { runningStatus = statusByte; p++ } else { statusByte = runningStatus }

      const type = statusByte & 0xF0
      if (type === 0x80 || type === 0x90) {
        const note = view.getUint8(p); const vel = view.getUint8(p + 1); p += 2
        if (type === 0x90 && vel > 0) events.push({ midiNote: note, tick })
      } else if (type === 0xA0 || type === 0xB0 || type === 0xE0) { p += 2 }
        else if (type === 0xC0 || type === 0xD0) { p += 1 }
        else if (statusByte === 0xFF) { p++; const metaLen = readVlq(view, p); p += metaLen.bytesRead + metaLen.value }
        else if (statusByte === 0xF0 || statusByte === 0xF7) { const sysLen = readVlq(view, p); p += sysLen.bytesRead + sysLen.value }
        else { break }
    }
    pos += chunkLen
    if (events.length > 0) break
  }
  return events
}

const MIDI_TO_SWARA: Record<number, string> = {
  60: 'Sa', 61: 're', 62: 'Re', 63: 'ga', 64: 'Ga', 65: 'Ma',
  66: 'ma', 67: 'Pa', 68: 'dha', 69: 'Dha', 70: 'ni', 71: 'Ni', 72: "Sa'"
}

// ── StudioContent ─────────────────────────────────────────────────────────────
function StudioContent() {
  const searchParams = useSearchParams()
  // Accept both ?raga_id= (new) and ?project_id= (legacy bookmarks) for backward compat
  const ragaIdFromUrl = searchParams.get('raga_id') ?? searchParams.get('project_id')
  const ragaNameFromUrl = searchParams.get('raga_name')

  useEffect(() => { 
    document.title = 'Saptaswara Studio'
    setMounted(true)
  }, [])

  const { isPlaying, setIsPlaying, isRecording, setIsRecording, currentRagaId, setCurrentRagaId, saveTriggered, isImmersive, setIsImmersive } = usePlayback()
  const { state: comp, dispatch } = useComposition()
  const { activeInstrument, activeTradition } = comp
  const { setRagaContext } = useGlobalAssistant()
  const router = useRouter()

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
  const [masteringPreset, setMasteringPreset] = useState<MasteringPreset>('neutral')
  const [droneActive, setDroneActive] = useState(false)
  const [droneType, setDroneType] = useState<'Sa-Pa' | 'Sa-Ma'>('Sa-Pa')
  const [ornamentMode, setOrnamentMode] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [volume, setVolume] = useState(0)
  const [loopLength, setLoopLength] = useState<8 | 16 | 32>(16)
  const [beatSuggestions, setBeatSuggestions] = useState<Array<{label: string, taal: string, description: string, hits: Array<{step: number, stroke: string}>}>>([])
  const [beatLoading, setBeatLoading] = useState(false)
  const [swingAmount, setSwingAmount] = useState(0)          // 0–0.5
  const [ragaConstrained, setRagaConstrained] = useState(false)
  const [selectedTala, setSelectedTala] = useState<Tala>(DEFAULT_TALA)
  const [laySetting, setLaySetting] = useState<'vilambit' | 'madhya' | 'drut'>('madhya')

  // ── AI Generate state ────────────────────────────────────────────────────────
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generatePrompt, setGeneratePrompt] = useState('')
  const [generateLoading, setGenerateLoading] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

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

  const [projectId, setProjectId] = useState<string | null>(ragaIdFromUrl)
  const [projectName, setProjectName] = useState('Untitled Composition')
  const [detectedPhrases, setDetectedPhrases] = useState<any[]>([])
  const [ragasLoading, setRagasLoading] = useState(true)
  const [ragasError, setRagasError] = useState(false)
  const [isBlueprintPlaying, setIsBlueprintPlaying] = useState(false)
  const [isExportingMidi, setIsExportingMidi] = useState(false)
  const [isImportingMidi, setIsImportingMidi] = useState(false)
  const midiInputRef = useRef<HTMLInputElement>(null)
  const [exportFormat, setExportFormat] = useState<'webm' | 'wav'>('webm')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveModalTitle, setSaveModalTitle] = useState('')
  const [showMoodPicker, setShowMoodPicker] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const [showLearnGuide, setShowLearnGuide] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [showNotation, setShowNotation] = useState(false)
  const [showEarTraining, setShowEarTraining] = useState(false)
  const [immersiveTranscriber, setImmersiveTranscriber] = useState(false)
  const [sessionLogPrompt, setSessionLogPrompt] = useState<{ ragaName: string; minutes: number } | null>(null)
  const [mobilePianoOpen, setMobilePianoOpen] = useState(false)
  const [liveNotes, setLiveNotes] = useState<{ label: string; valid: boolean }[]>([])
  const liveNotesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pitchBend, setPitchBend] = useState(0)
  const pitchBendRef = useRef(0)
  const pitchDragStartY = useRef<number | null>(null)
  const pitchDragStartVal = useRef(0)

  // Ref so the keyboard handler can read the latest value without re-registering
  const isImmersiveRef = useRef(isImmersive)

  const supabaseClient = createClient()

  // Refs to avoid stale closures in playback loop
  const tracksRef = useRef(tracks)
  const bpmRef    = useRef(bpm)
  const swingRef  = useRef(swingAmount)
  const loopRef   = useRef(loopLength)

  // Ref for save handler — avoids stale closure in saveTriggered effect (BUG-001)
  // Ref for mounted state — guards async setState after unmount (BUG-004)
  const saveProjectRef = useRef<((titleOverride?: string) => Promise<void>) | null>(null)
  const mountedRef     = useRef(true)
  const isPlayingRef   = useRef(isPlaying)
  useEffect(() => { tracksRef.current      = tracks      }, [tracks])
  useEffect(() => { bpmRef.current         = bpm         }, [bpm])
  useEffect(() => { swingRef.current       = swingAmount }, [swingAmount])
  useEffect(() => { loopRef.current        = loopLength  }, [loopLength])
  useEffect(() => { isImmersiveRef.current = isImmersive }, [isImmersive])
  useEffect(() => { isPlayingRef.current   = isPlaying   }, [isPlaying])

  // Task 9: push active raga into GlobalAssistant context so Ask AI knows what raga is open
  useEffect(() => { setRagaContext(selectedRaga) }, [selectedRaga, setRagaContext])

  // Task 2: track live notes played on piano → phrase validator strip
  useEffect(() => {
    if (!activeSwara || !selectedRaga) return
    const scale = new Set([...(selectedRaga.aroha || []), ...(selectedRaga.avaroha || [])])
    const valid = scale.has(activeSwara)
    setLiveNotes(prev => [...prev.slice(-11), { label: activeSwara, valid }])
    if (liveNotesTimerRef.current) clearTimeout(liveNotesTimerRef.current)
    liveNotesTimerRef.current = setTimeout(() => setLiveNotes([]), 5000)
  }, [activeSwara, selectedRaga])

  // Task 3: when playback stops after >30s, prompt to log the session in journal
  const prevIsPlayingRef = useRef(false)
  useEffect(() => {
    const wasPlaying = prevIsPlayingRef.current
    prevIsPlayingRef.current = isPlaying
    if (wasPlaying && !isPlaying && selectedRaga) {
      const elapsed = Tone.getTransport().seconds
      if (elapsed > 30) {
        setSessionLogPrompt({ ragaName: selectedRaga.name, minutes: Math.max(1, Math.round(elapsed / 60)) })
      }
    }
  }, [isPlaying, selectedRaga])

  // Enter / exit fullscreen in sync with isImmersive.
  // Also listens for browser-native fullscreen exits (e.g. user presses browser Escape
  // or the OS forces exit) so isImmersive stays in sync with actual fullscreen state.
  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setIsImmersive(false)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)

    if (isImmersive) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
      setImmersiveTranscriber(false)
    }

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      // Exit fullscreen on unmount so navigating away doesn't strand the browser in fullscreen
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
  }, [isImmersive])

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
        const targetId = ragaIdFromUrl || currentRagaId
        const initial = (ragaNameFromUrl ? ragaData.find((r: any) => r.name.toLowerCase() === ragaNameFromUrl.toLowerCase()) : null)
          ?? ragaData.find((r: any) => r.id === targetId)
          ?? ragaData[0]
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
      } catch {
        // Auth check failed — middleware will redirect unauthenticated users
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
  // BUG-001 fix: use a ref so the effect always calls the latest handleSaveProject
  // (avoids stale closure — handleSaveProject captures state at definition time)
  useEffect(() => {
    if (saveTriggered > 0) saveProjectRef.current?.()
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

  // ── Beat suggestions ──────────────────────────────────────────────────────────
  const fetchBeatSuggestions = async () => {
    if (!selectedRaga || beatLoading) return
    setBeatLoading(true)
    setBeatSuggestions([])
    try {
      const res = await fetch('/api/ai/beat-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ragaName: selectedRaga.name, mood: selectedRaga.mood ?? '' }),
      })
      const json = await res.json()
      if (json.patterns) setBeatSuggestions(json.patterns)
    } catch {
      // silent fail
    } finally {
      setBeatLoading(false)
    }
  }

  const loadBeatPattern = (hits: Array<{step: number, stroke: string}>) => {
    const trackId = tracks.find(t => t.type === 'rhythm' && t.id === activeTrackId)?.id ?? activeTrackId
    pushHistory(tracks)
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t
      const seq: (StepEvent | null)[] = new Array(loopLength).fill(null)
      hits.forEach(h => {
        if (h.step >= 1 && h.step <= loopLength) {
          seq[h.step - 1] = { label: h.stroke, stroke: h.stroke, velocity: 0.8 }
        }
      })
      return { ...t, sequence: seq }
    }))
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
  // BUG-004 fix: mark unmounted so handleGenerate doesn't setState after unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      audioEngine?.stopAll()
    }
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

  // ── Pitch Bend drag handler ───────────────────────────────────────────────────
  const handlePitchDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY
    pitchDragStartY.current = y
    pitchDragStartVal.current = pitchBendRef.current

    const onMove = (ev: MouseEvent | TouchEvent) => {
      const curY = 'touches' in ev ? (ev as TouchEvent).touches[0].clientY : (ev as MouseEvent).clientY
      const delta = (pitchDragStartY.current! - curY) * 2
      const newVal = Math.max(-200, Math.min(200, pitchDragStartVal.current + delta))
      pitchBendRef.current = newVal
      setPitchBend(Math.round(newVal))
      audioEngine?.setDetune(Math.round(newVal))
    }
    const onUp = () => {
      pitchBendRef.current = 0
      setPitchBend(0)
      audioEngine?.setDetune(0)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove as any)
      window.removeEventListener('touchend', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove as any, { passive: true })
    window.addEventListener('touchend', onUp)
  }

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
      if (exportFormat === 'wav') {
        await audioEngine.stopRecordingAsWav()
      } else {
        await audioEngine.stopRecording()
      }
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

  const handleImportMidi = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsImportingMidi(true)
    try {
      const buf = await file.arrayBuffer()
      const noteEvents = parseMidiNoteEvents(buf)
      if (!noteEvents.length) { alert('No notes found in MIDI file.'); return }

      const maxTick = noteEvents[noteEvents.length - 1].tick || 1
      const newSeq: (StepEvent | null)[] = new Array(loopRef.current).fill(null)
      for (const ev of noteEvents) {
        const stepIdx = Math.floor((ev.tick / maxTick) * loopRef.current) % loopRef.current
        const swara = MIDI_TO_SWARA[ev.midiNote] ?? MIDI_TO_SWARA[(ev.midiNote % 12) + 60]
        if (!swara) continue
        const freq = swaraToFrequency(swara)
        newSeq[stepIdx] = { label: swara, frequency: freq, velocity: 0.8 }
      }

      setTracks(prev => prev.map(t =>
        t.type === 'melody' && t.id === prev.find(tt => tt.type === 'melody')?.id
          ? { ...t, sequence: newSeq }
          : t
      ))
    } catch (err) {
      console.error('MIDI import failed:', err)
      alert('Failed to parse MIDI file.')
    } finally {
      setIsImportingMidi(false)
      if (midiInputRef.current) midiInputRef.current.value = ''
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
          // Only capture when a step is already selected — otherwise let the browser scroll
          setActiveStep(prev => {
            if (prev < 0) return prev
            e.preventDefault()
            return (prev + 1) % loopRef.current
          })
          break
        }
        case 'ArrowLeft': {
          setActiveStep(prev => {
            if (prev < 0) return prev
            e.preventDefault()
            return (prev - 1 + loopRef.current) % loopRef.current
          })
          break
        }
        case 'ArrowDown': {
          // Only steal when a step is active (user is in sequencer mode)
          setActiveStep(prev => {
            if (prev < 0) return prev
            e.preventDefault()
            setTracks(ts => {
              const idx = ts.findIndex(t => t.id === activeTrackId)
              const next = ts[(idx + 1) % ts.length]
              setActiveTrackId(next.id)
              return ts
            })
            return prev
          })
          break
        }
        case 'ArrowUp': {
          setActiveStep(prev => {
            if (prev < 0) return prev
            e.preventDefault()
            setTracks(ts => {
              const idx = ts.findIndex(t => t.id === activeTrackId)
              const next = ts[(idx - 1 + ts.length) % ts.length]
              setActiveTrackId(next.id)
              return ts
            })
            return prev
          })
          break
        }
        case 'Delete':
        case 'Backspace': {
          setActiveStep(prev => {
            if (prev < 0) return prev
            e.preventDefault()
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
          if (isImmersiveRef.current) setIsImmersive(false)
          break
        }
        case '?': {
          e.preventDefault()
          setShowGuide(v => !v)
          break
        }
        case ' ': {
          e.preventDefault()
          // Use ref to avoid stale closure — isPlaying is not in effect deps
          setIsPlaying(!isPlayingRef.current)
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
    if (!user) { setSaveStatus('error'); return }
    const saveTitle = titleOverride || projectName
    setSaveStatus('saving')
    try {
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
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 4000)
      }
    } catch (err) {
      console.error('Save error:', err)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 4000)
    }
  }

  // ── Raga-valid notes ──────────────────────────────────────────────────────────
  // BUG-005 fix: guard with Array.isArray to prevent crash if API returns non-array
  const ragaValidNotes = ragaConstrained && selectedRaga
    ? [
        ...(Array.isArray(selectedRaga.aroha)   ? selectedRaga.aroha   : []),
        ...(Array.isArray(selectedRaga.avaroha) ? selectedRaga.avaroha : []),
      ]
    : null

  // BUG-001 fix: keep save ref pointing at the latest closure every render
  saveProjectRef.current = handleSaveProject

  // ── AI Sequence generation ───────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!selectedRaga) return
    setGenerateLoading(true)
    setGenerateError(null)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ragaName: selectedRaga.name,
          aroha:    selectedRaga.aroha   ?? [],
          avaroha:  selectedRaga.avaroha ?? [],
          vadi:     selectedRaga.vadi,
          samvadi:  selectedRaga.samvadi,
          steps:    loopLength,
          prompt:   generatePrompt,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')

      // Find or create melody track and fill its sequence
      const melodyId = tracks.find(t => t.type === 'melody')?.id ?? tracks[0].id
      setActiveTrackId(melodyId)
      pushHistory(tracks)
      setTracks(prev => prev.map(t => {
        if (t.id !== melodyId) return t
        const seq: (StepEvent | null)[] = Array(loopLength).fill(null)
        for (const s of data.steps as { step: number; note: string; octave: number; velocity: number }[]) {
          const idx = s.step - 1
          if (idx >= 0 && idx < loopLength) {
            seq[idx] = { 
              label: s.note, 
              frequency: swaraToFrequency(s.note, 261.63, s.octave),
              velocity: s.velocity / 100 
            }

          }
        }
        return { ...t, sequence: seq }
      }))
      setGenerateOpen(false)
      setGeneratePrompt('')
    } catch (e: unknown) {
      if (mountedRef.current) setGenerateError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      // BUG-004 fix: guard against setState after unmount
      if (mountedRef.current) setGenerateLoading(false)
    }
  }

  const colors = (idx: number) => TRACK_COLORS[idx % TRACK_COLORS.length]

  const melodyTrack = tracks.find(t => t.type === 'melody')
  const notationSequence = melodyTrack
    ? melodyTrack.sequence.map(ev => ev?.label ?? null)
    : []

  // ── Render ────────────────────────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="min-h-screen bg-surface-lowest flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className={`flex overflow-hidden bg-background transition-all duration-300 ${isImmersive ? 'h-screen' : 'h-[calc(100vh-64px)] md:h-[calc(100vh-80px)]'}`}>

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
        fixed md:relative z-50 md:z-auto top-16 md:top-0 bottom-0 left-0
        flex-shrink-0 bg-surface-lowest border-r border-outline-variant/10 flex flex-col overflow-hidden
        transition-all duration-300 ease-in-out
        ${isImmersive ? '!w-0 -translate-x-full overflow-hidden' : sidebarOpen ? 'w-80 translate-x-0' : 'md:w-12 w-80 -translate-x-full md:translate-x-0'}
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
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
              <button
                onClick={() => setShowMoodPicker(true)}
                title="Find a Raga by Mood"
                className="w-10 h-10 flex-shrink-0 rounded-xl border border-secondary/20 bg-secondary/5 text-secondary/60 hover:text-secondary hover:bg-secondary/10 transition-all flex items-center justify-center"
              >
                <span className="material-symbols-outlined !text-base">mood</span>
              </button>
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

          {/* ── Authentic Ornament Mode ── */}
          {selectedRaga && (
            <div className="px-4 py-3 border-t border-white/5">
              <button
                onClick={() => setOrnamentMode(v => !v)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition-all ${
                  ornamentMode
                    ? 'bg-violet-500/20 border-violet-400/30 text-violet-300'
                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined !text-base">auto_fix_high</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest font-bold">Authentic Ornaments</span>
                </div>
                <div className={`w-8 h-4 rounded-full transition-all relative ${ornamentMode ? 'bg-violet-500' : 'bg-white/20'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${ornamentMode ? 'left-[18px]' : 'left-0.5'}`} />
                </div>
              </button>
              {ornamentMode && (
                <p className="mt-2 font-mono text-[8px] text-on-surface-variant/40 uppercase tracking-wide px-1">
                  Ornaments auto-applied from raga gamaka profile
                </p>
              )}
            </div>
          )}
          {/* ── Pitch Bend Wheel ── */}
          {isStarted && (
            <div className="px-4 py-3 border-t border-white/5 flex flex-col items-center gap-2">
              <span className="font-mono text-[8px] uppercase tracking-widest text-white/30">Pitch</span>
              <div
                className="relative w-10 h-24 bg-white/5 rounded-xl border border-white/10 cursor-ns-resize flex items-center justify-center overflow-hidden select-none touch-none"
                onMouseDown={handlePitchDragStart}
                onTouchStart={handlePitchDragStart}
                title="Drag to bend pitch (±2 semitones). Releases on mouse up."
              >
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-white/20" />
                <div
                  className="absolute w-8 h-5 rounded-lg bg-primary/60 border border-primary/40"
                  style={{ top: `calc(50% - ${(pitchBend / 200) * 38}px - 10px)` }}
                />
              </div>
              <span className="font-mono text-[7px] text-white/20">{pitchBend > 0 ? '+' : ''}{pitchBend}¢</span>
            </div>
          )}
        </div>
        </div>{/* end full sidebar content */}
      </aside>

      {/* ── Main Workspace ────────────────────────────────────────────────────── */}
      <main className="flex-1 relative flex flex-col bg-surface overflow-hidden min-w-0">

        {/* HUD */}
        <div className="min-h-14 md:h-20 px-3 md:px-10 flex flex-wrap justify-between items-center border-b border-outline-variant/5 bg-surface/40 backdrop-blur-md flex-shrink-0 gap-2 py-2 md:py-0">
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
            {/* Laya presets — tempo feel selector */}
            <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl bg-surface-container-high/40 border border-outline-variant/10">
              {(['vilambit', 'madhya', 'drut'] as const).map(lay => {
                const [lo, hi] = selectedTala.laya[lay]
                const midBpm   = Math.round((lo + hi) / 2)
                return (
                  <button
                    key={lay}
                    onClick={() => { setLaySetting(lay); setBpm(midBpm) }}
                    title={`${lay} — ${lo}–${hi} BPM`}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[7px] uppercase tracking-widest font-bold transition-all ${
                      laySetting === lay
                        ? 'bg-primary/20 text-primary'
                        : 'text-on-surface-variant/30 hover:text-on-surface'
                    }`}
                  >
                    {lay}
                  </button>
                )
              })}
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
                  <span className="hidden sm:inline">Tanpura</span>
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
              disabled={saveStatus === 'saving'}
              className="flex items-center gap-2 px-3 md:px-5 py-2 bg-primary/10 border border-primary/20 rounded-xl font-mono text-[10px] uppercase tracking-widest text-primary hover:bg-primary/20 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saveStatus === 'saving' && <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />}
              {saveStatus === 'saved'  && <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />}
              {saveStatus === 'error'  && <div className="w-2.5 h-2.5 rounded-full bg-red-400" />}
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : saveStatus === 'error' ? 'Error' : 'Save'}
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
        <div className={`flex-1 overflow-auto p-4 md:p-10 space-y-8 md:space-y-14 scroll-thin ${isImmersive && selectedRaga?.aroha ? 'pt-12' : ''}`}>

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
                {/* AI Generate */}
                <div className="relative">
                  <button
                    onClick={() => { setGenerateOpen(v => !v); setGenerateError(null) }}
                    disabled={!selectedRaga}
                    title={selectedRaga ? 'AI Sequence Generation' : 'Select a raga first'}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border font-mono text-[8px] uppercase tracking-widest font-bold transition-all disabled:opacity-20 disabled:cursor-not-allowed ${
                      generateOpen
                        ? 'bg-secondary/15 border-secondary/40 text-secondary'
                        : 'border-outline-variant/10 text-on-surface-variant/30 hover:text-secondary/70 hover:border-secondary/25'
                    }`}
                  >
                    <span className="material-symbols-outlined !text-sm">auto_awesome</span>
                    Generate
                  </button>

                  {generateOpen && (
                    <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-2xl bg-[#0b0b16] border border-outline-variant/20 shadow-2xl p-4">
                      <p className="font-mono text-[8px] uppercase tracking-widest text-secondary/60 mb-2">AI Sequence — {selectedRaga?.name}</p>
                      <input
                        value={generatePrompt}
                        onChange={e => setGeneratePrompt(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleGenerate() }}
                        placeholder="e.g. ascending phrase, slow and meditative…"
                        className="w-full bg-surface-container-low border border-outline-variant/15 rounded-xl px-3 py-2 font-sans text-xs text-on-surface placeholder:text-on-surface-variant/30 outline-none focus:border-secondary/40 transition-colors mb-3"
                        maxLength={200}
                        autoFocus
                      />
                      {generateError && (
                        <p className="font-sans text-[10px] text-red-400 mb-2">{generateError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={handleGenerate}
                          disabled={generateLoading}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-secondary/15 border border-secondary/30 text-secondary font-mono text-[8px] uppercase tracking-widest font-bold hover:bg-secondary/25 transition-all disabled:opacity-40"
                        >
                          {generateLoading
                            ? <span className="material-symbols-outlined !text-sm animate-spin">progress_activity</span>
                            : <span className="material-symbols-outlined !text-sm">auto_awesome</span>
                          }
                          {generateLoading ? 'Generating…' : 'Generate'}
                        </button>
                        <button
                          onClick={() => setGenerateOpen(false)}
                          className="px-3 py-2 rounded-xl border border-outline-variant/10 text-on-surface-variant/40 hover:text-on-surface font-mono text-[8px] transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="font-sans text-[9px] text-on-surface-variant/30 mt-2 leading-relaxed">
                        Fills the Melody track with a raga-compliant phrase. Any varjya notes are automatically filtered.
                      </p>
                    </div>
                  )}
                </div>

                {/* Hidden MIDI file input */}
                <input
                  ref={midiInputRef}
                  type="file"
                  accept=".mid,.midi"
                  className="hidden"
                  onChange={handleImportMidi}
                />
                {/* MIDI import button */}
                <button
                  onClick={() => midiInputRef.current?.click()}
                  disabled={isImportingMidi}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-[10px] font-mono uppercase tracking-widest disabled:opacity-40"
                >
                  <span className="material-symbols-outlined !text-base">upload_file</span>
                  {isImportingMidi ? 'Importing…' : 'Import MIDI'}
                </button>

                {/* WAV / WebM export format toggle */}
                <button
                  onClick={() => setExportFormat(f => f === 'webm' ? 'wav' : 'webm')}
                  title="Toggle recording export format"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all text-[10px] font-mono uppercase tracking-widest"
                >
                  <span className="material-symbols-outlined !text-base">audio_file</span>
                  {exportFormat.toUpperCase()}
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
                        // Varjya check: only on melody tracks with a note, only when a raga is selected
                        const noteIsVarjya = track.type === 'melody' && hasNote && !!selectedRaga
                          && isVarjya(event!.label, selectedRaga.aroha, selectedRaga.avaroha)
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
                                ? `${track.type === 'melody' ? event!.label : event!.stroke} (vel ${velPct}%)${noteIsVarjya ? ' · ⚠ Varjya note — outside this raga' : ''} · Shift+click to cycle velocity`
                                : `Record to step ${stepIdx + 1}`
                            }
                            className={`relative h-8 rounded-md font-mono text-[7px] font-bold transition-all border flex items-end justify-center pb-0.5 overflow-hidden ${
                              isActiveStep
                                ? `${c.active} border-transparent shadow-step-active`
                                : isSelected
                                ? `border-primary/70 bg-primary/10 text-primary ring-1 ring-primary/20`
                                : noteIsVarjya
                                ? 'bg-red-500/10 border-red-500/50 text-red-400 ring-1 ring-red-500/30'
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
                                className={`absolute bottom-0 left-0 right-0 opacity-40 rounded-b-md ${noteIsVarjya ? 'bg-red-500' : isActiveTrack ? c.dot : 'bg-white'}`}
                                style={{ height: `${velPct}%` }}
                              />
                            )}
                            {/* Varjya warning pip */}
                            {noteIsVarjya && !isActiveStep && (
                              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-red-400 pointer-events-none" />
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
                  {/* Beat suggestion panel */}
                  {selectedRaga && (
                    <div className="mt-5 pt-5 border-t border-outline-variant/10">
                      {beatSuggestions.length === 0 ? (
                        <button
                          onClick={fetchBeatSuggestions}
                          disabled={beatLoading}
                          className="w-full py-3 rounded-2xl bg-primary/8 border border-primary/15 font-mono text-[9px] uppercase tracking-widest text-primary/70 hover:bg-primary/15 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {beatLoading ? (
                            <>
                              <div className="w-3 h-3 border border-primary/40 border-t-primary rounded-full animate-spin" />
                              <span>Finding patterns for {selectedRaga.name}…</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined !text-sm">drum</span>
                              <span>Suggest a pattern</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[9px] uppercase tracking-widest text-primary/50 font-bold">3 patterns for {selectedRaga.name}</span>
                            <button onClick={() => setBeatSuggestions([])} className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/30 hover:text-on-surface-variant transition-colors">Clear</button>
                          </div>
                          {beatSuggestions.map((pattern, pi) => (
                            <div key={pi} className="p-4 rounded-2xl bg-surface-container-low/20 border border-outline-variant/10 hover:border-primary/20 transition-all">
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div>
                                  <div className="font-mono text-[9px] uppercase tracking-widest text-primary/70 font-bold">{pattern.label}</div>
                                  <div className="font-sans text-[11px] text-on-surface-variant/50 mt-0.5">{pattern.description}</div>
                                </div>
                                <button
                                  onClick={() => loadBeatPattern(pattern.hits)}
                                  className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-primary/15 border border-primary/25 font-mono text-[8px] uppercase tracking-widest text-primary/80 hover:bg-primary/25 transition-all"
                                >
                                  Load
                                </button>
                              </div>
                              {/* 16-step mini grid */}
                              <div className="flex gap-1">
                                {Array.from({ length: 16 }, (_, i) => {
                                  const hit = pattern.hits.find(h => h.step === i + 1)
                                  return (
                                    <div
                                      key={i}
                                      className={`flex-1 h-5 rounded-sm text-[6px] flex items-center justify-center font-mono transition-all ${
                                        hit
                                          ? 'bg-primary/40 text-primary border border-primary/30'
                                          : 'bg-surface-container-low/30 border border-outline-variant/5 text-on-surface-variant/20'
                                      }`}
                                      title={hit ? hit.stroke : '—'}
                                    >
                                      {hit ? hit.stroke[0] : '·'}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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
              <>
              {/* Mobile piano drawer — fixed bottom sheet on small screens */}
              <div className={`
                md:block
                ${mobilePianoOpen
                  ? 'fixed inset-x-0 bottom-0 z-[200] bg-background/95 backdrop-blur-xl border-t border-outline-variant/10 rounded-t-3xl shadow-2xl max-h-[72vh] overflow-y-auto'
                  : 'hidden md:block'}
              `}>
              <section className="animate-slide-up p-4 md:p-0">
                {/* ── Keyboard layout tabs ── */}
                {(() => {
                  const LAYOUT_OPTIONS: { value: KeyboardLayout; label: string; instrument: string }[] = [
                    { value: 'SwaPad',    label: 'Swara Pad',  instrument: 'piano'    },
                    { value: 'Piano',     label: 'Piano',      instrument: 'piano'    },
                    { value: 'Harmonium', label: 'Harmonium',  instrument: 'harmonium' },
                    { value: 'Swara',     label: 'Swara Keys', instrument: 'harmonium' },
                  ]
                  return (
                    <div className="flex items-center gap-1 mb-4 p-1 rounded-xl bg-surface-container-high/40 border border-outline-variant/10 w-fit">
                      {LAYOUT_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setKeyboardLayout(opt.value)
                            dispatch({ type: 'SET_INSTRUMENT', value: opt.instrument as any })
                          }}
                          className={`px-3 py-1.5 rounded-lg font-mono text-[8px] uppercase tracking-widest font-bold transition-all ${
                            keyboardLayout === opt.value
                              ? 'bg-primary/20 text-primary border border-primary/20'
                              : 'text-on-surface-variant/30 hover:text-on-surface'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )
                })()}

                {/* ── Mastering strip ── */}
                {(() => {
                  const MASTERING_PRESETS: MasteringPreset[] = ['neutral', 'warm', 'clear', 'punchy', 'raga', 'concert', 'vocal', 'deep', 'bright']
                  const MASTERING_HINTS: Record<MasteringPreset, string> = {
                    neutral: 'Flat',
                    warm:    '+Low +Mid −High',
                    clear:   '−Low +High',
                    punchy:  '+Low −Mid +High',
                    raga:    '−Low +Mid +High',
                    concert: '+Low +Mid',
                    vocal:   '−Low +Pres',
                    deep:    '+Low −High',
                    bright:  '+High',
                  }
                  return (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-mono text-[7px] uppercase tracking-widest text-on-surface-variant/30 font-bold shrink-0">Mastering</span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {MASTERING_PRESETS.map(p => (
                          <button
                            key={p}
                            onClick={() => {
                              setMasteringPreset(p)
                              audioEngine?.setMasteringPreset(p)
                            }}
                            className={`px-2.5 py-1 rounded-lg font-mono text-[8px] uppercase tracking-widest font-bold transition-all ${
                              masteringPreset === p
                                ? 'bg-primary/20 text-primary border border-primary/20'
                                : 'text-on-surface-variant/30 hover:text-on-surface border border-transparent'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                      <span className="font-mono text-[7px] text-on-surface-variant/25 ml-auto shrink-0 hidden sm:block">
                        {MASTERING_HINTS[masteringPreset]}
                      </span>
                    </div>
                  )
                })()}

                {/* Context hint + Swara Transcriber */}
                <div className="relative flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activeStep >= 0 ? 'bg-primary animate-pulse' : 'bg-outline-variant/30'}`} />
                  <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40 flex-1">
                    {activeStep >= 0
                      ? `Step ${activeStep + 1} selected — ${keyboardLayout === 'SwaPad' ? 'tap a swara' : 'press a key'} to record`
                      : 'Select a step in the grid above to start recording'}
                  </span>
                  <SwaraTranscriber
                    aroha={selectedRaga?.aroha}
                    avaroha={selectedRaga?.avaroha}
                    onInsert={(note, _octave) => {
                      if (activeStep === -1) return
                      handleToggleStep(activeStep, { label: note, velocity: 0.8 })
                    }}
                  />
                </div>

                {/* Aroha — fixed left panel, only in immersive mode with a raga loaded */}
                {isImmersive && selectedRaga?.aroha && (
                  <div className="fixed left-0 top-1/2 -translate-y-1/2 z-[150] flex flex-col gap-2 px-4 py-5 bg-surface-lowest/85 backdrop-blur-xl border-r border-outline-variant/15 rounded-r-2xl shadow-2xl">
                    <span className="font-mono text-[7px] uppercase tracking-widest text-primary/60 font-bold mb-1">Aroha ↑</span>
                    {(selectedRaga.aroha as string[]).map((n, i) => {
                      const key = SWARA_KEY_LABELS[n]
                      const isActive = activeSwara === n
                      return (
                        <div key={i} className={`flex items-center gap-2.5 transition-all ${isActive ? 'opacity-100' : 'opacity-50'}`}>
                          <span className={`font-mono text-[12px] font-semibold w-8 ${isActive ? 'text-primary' : 'text-on-surface'}`}>
                            {swaraDisplayName(n)}
                          </span>
                          {key && (
                            <kbd className="h-5 min-w-[20px] px-1 rounded-md bg-surface-container-high border border-outline-variant/25 flex items-center justify-center font-mono text-[9px] text-on-surface-variant/60 leading-none">
                              {key}
                            </kbd>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Phrase validator strip — live note feedback */}
                {liveNotes.length > 0 && selectedRaga && (
                  <div className="flex items-center gap-1.5 px-2 py-2 min-h-[36px] overflow-x-auto scrollbar-none">
                    {liveNotes.map((n, i) => (
                      <span
                        key={i}
                        className={`font-label text-xs px-2.5 py-1 rounded-lg border transition-all flex-shrink-0 ${
                          n.valid
                            ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-400'
                            : 'bg-red-500/15 border-red-400/30 text-red-400'
                        }`}
                      >
                        {n.label}
                      </span>
                    ))}
                    {detectedPhrases.length > 0 && (
                      <div className="ml-2 flex items-center gap-1.5">
                        <div className="w-px h-4 bg-white/10" />
                        {detectedPhrases.map((p, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-lg bg-secondary/15 border border-secondary/30 font-mono text-[8px] uppercase tracking-widest text-secondary flex items-center gap-1">
                            <span className="material-symbols-outlined !text-[10px]">verified</span>
                            {p.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Live sargam notation strip */}
                {isPlaying && notationSequence.some(n => n !== null) && (
                  <div className="px-2 py-1.5 flex items-center gap-1 overflow-x-auto scrollbar-none border-b border-outline-variant/10">
                    {notationSequence.map((note, i) => (
                      <span
                        key={i}
                        className={[
                          'font-display text-sm px-2 py-0.5 rounded-md transition-all flex-shrink-0',
                          note === null
                            ? 'text-on-surface-variant/10'
                            : i === activeStep
                              ? 'bg-primary/30 text-primary font-semibold scale-110'
                              : i < activeStep
                                ? 'text-on-surface-variant/30'
                                : 'text-on-surface-variant/50',
                        ].join(' ')}
                      >
                        {note ?? '·'}
                      </span>
                    ))}
                  </div>
                )}

                {/* Keyboard — full width, unaffected by side panels */}
                {keyboardLayout === 'SwaPad' ? (
                  <SwaPad
                    activeRagaNotes={allRagaNotes}
                    ragaConstrained={ragaConstrained}
                    vadiNote={selectedRaga?.vadi}
                    ragaAroha={selectedRaga?.aroha}
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
                    ornamentMode={ornamentMode}
                    selectedRagaName={selectedRaga?.name}
                  />
                )}

                {/* Avaroha — fixed right panel, only in immersive mode with a raga loaded */}
                {isImmersive && selectedRaga?.avaroha && (
                  <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[150] flex flex-col gap-2 px-4 py-5 bg-surface-lowest/85 backdrop-blur-xl border-l border-outline-variant/15 rounded-l-2xl shadow-2xl">
                    <span className="font-mono text-[7px] uppercase tracking-widest text-primary/60 font-bold mb-1">Avaroha ↓</span>
                    {(selectedRaga.avaroha as string[]).map((n, i) => {
                      const key = SWARA_KEY_LABELS[n]
                      return (
                        <div key={i} className="flex items-center gap-2.5 opacity-50 hover:opacity-100 transition-opacity">
                          {key && (
                            <kbd className="h-5 min-w-[20px] px-1 rounded-md bg-surface-container-high border border-outline-variant/25 flex items-center justify-center font-mono text-[9px] text-on-surface-variant/60 leading-none">
                              {key}
                            </kbd>
                          )}
                          <span className="font-mono text-[12px] font-semibold w-8 text-on-surface">
                            {swaraDisplayName(n)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
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
              </div>
              </>
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
                      {(selectedRaga.aroha as string[]).map(swaraDisplayName).join(' – ')}
                    </p>
                  </div>
                  <div>
                    <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40 font-bold block mb-1">Avaroha</span>
                    <p className="font-label text-base text-on-surface/80 tracking-wide">
                      {(selectedRaga.avaroha as string[]).map(swaraDisplayName).join(' – ')}
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

        {/* ── Transport Rail (hidden in immersive) ── */}
        {!isImmersive && (
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
        )}

        {/* ── Raga Conformance Score ── */}
        {!isImmersive && (
          <div className="mx-8">
            <ConformanceScore
              isRecording={isRecording}
              aroha={selectedRaga?.aroha}
              avaroha={selectedRaga?.avaroha}
              ragaName={selectedRaga?.name}
            />
          </div>
        )}

        {/* ── Session log prompt (Task 3) ── */}
        {sessionLogPrompt && !isImmersive && (
          <div className="mx-8 mb-4 px-5 py-3.5 rounded-2xl bg-primary/10 border border-primary/20 backdrop-blur-md flex items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined !text-lg text-primary/60">edit_document</span>
              <span className="font-sans text-sm text-on-surface/80">
                Session ended — <span className="font-semibold">{sessionLogPrompt.minutes} min</span> on Raga {sessionLogPrompt.ragaName}. Log it?
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => router.push(`/journal?raga=${encodeURIComponent(sessionLogPrompt.ragaName)}`)}
                className="px-4 py-2 bg-primary text-on-primary rounded-xl font-mono text-[9px] uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-95"
              >
                Log Session
              </button>
              <button
                onClick={() => setSessionLogPrompt(null)}
                className="p-2 text-on-surface-variant/40 hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined !text-base">close</span>
              </button>
            </div>
          </div>
        )}

        {/* Mobile piano toggle — fixed bottom-right, only on small screens */}
        {!isImmersive && (
          <button
            className="md:hidden fixed bottom-6 right-4 z-[199] flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-on-primary shadow-glow font-mono text-[10px] uppercase tracking-widest font-bold active:scale-95 transition-all"
            onClick={() => setMobilePianoOpen(v => !v)}
          >
            <span className="material-symbols-outlined !text-lg">{mobilePianoOpen ? 'keyboard_arrow_down' : 'piano'}</span>
            {mobilePianoOpen ? 'Close' : 'Piano'}
          </button>
        )}

        {/* ── Immersive HUD ── */}
        {isImmersive && (
          <ImmersiveHUD
            bpm={bpm}
            loopLength={loopLength}
            transcriberActive={immersiveTranscriber}
            onToggleTranscriber={() => setImmersiveTranscriber(v => !v)}
          />
        )}
      </main>

      <Guidebook open={showGuide} onClose={() => setShowGuide(false)} />
      <LearnerGuide open={showLearnGuide} onClose={() => setShowLearnGuide(false)} />
      {showEarTraining && (
        <EarTraining raga={selectedRaga} onClose={() => setShowEarTraining(false)} />
      )}


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
      <MoodPicker
        open={showMoodPicker}
        onClose={() => setShowMoodPicker(false)}
        onSelectRaga={(name) => {
          const match = ragas.find(r => r.name.toLowerCase() === name.toLowerCase())
          if (match) {
            setSelectedRaga(match)
            setCurrentRagaId(match.id)
          } else {
            setSearchQuery(name)
          }
        }}
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
