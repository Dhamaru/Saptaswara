'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DetectResult {
  raga: string | null
  confidence: number
  tradition: string | null
  time_of_day: string | null
  evidence: string
  characteristic_phrases_found: string[]
}

export function RagaDetector() {
  const [state, setState] = useState<'idle' | 'recording' | 'uploading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<DetectResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const supabase = createClient()

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      mr.ondataavailable = e => chunksRef.current.push(e.data)
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        uploadAudio()
      }
      mr.start()
      mediaRef.current = mr
      setState('recording')
    } catch {
      setError('Mic access denied. Allow microphone in browser settings and try again.')
      setState('error')
    }
  }

  function stopRecording() {
    mediaRef.current?.stop()
    mediaRef.current = null
    setState('uploading')
  }

  async function uploadAudio() {
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const fd = new FormData()
      fd.append('audio', blob, 'recording.webm')
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}
      const res = await fetch('/api/audio/detect-raga', { method: 'POST', body: fd, headers })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Detection failed'); setState('error'); return }
      setResult(json)
      setState('done')
    } catch {
      setError('Upload failed.')
      setState('error')
    }
  }

  function reset() { setState('idle'); setResult(null); setError(null) }

  return (
    <div className="rounded-2xl bg-surface-container-low/30 border border-outline-variant/10 p-4 space-y-3">
      <div className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40">Raga Detector</div>

      {state === 'idle' && (
        <button
          onClick={startRecording}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/15 border border-primary/30 font-mono text-[9px] uppercase tracking-widest text-primary hover:bg-primary/25 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined !text-sm">mic</span>
          Record &amp; Detect Raga
        </button>
      )}

      {state === 'recording' && (
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
          <span className="font-mono text-[9px] text-red-400/80 uppercase tracking-widest">Recording…</span>
          <button
            onClick={stopRecording}
            className="ml-auto px-4 py-2 rounded-xl bg-red-500/15 border border-red-400/30 font-mono text-[9px] uppercase tracking-widest text-red-400 hover:bg-red-500/25 transition-all"
          >
            Stop
          </button>
        </div>
      )}

      {state === 'uploading' && (
        <div className="flex items-center gap-2 text-on-surface-variant/50">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="font-mono text-[9px] uppercase tracking-widest">Analysing…</span>
        </div>
      )}

      {state === 'error' && (
        <div className="space-y-2">
          <p className="font-mono text-[9px] text-red-400/80">{error}</p>
          <button onClick={reset} className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 hover:text-primary transition-colors">Try again</button>
        </div>
      )}

      {state === 'done' && result && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="font-display text-2xl font-light text-on-surface">
                {result.raga ?? 'Unknown raga'}
              </div>
              {result.tradition && (
                <div className="font-mono text-[8px] uppercase tracking-widest text-primary/60 mt-0.5">{result.tradition}</div>
              )}
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono text-sm font-bold border ${
              result.confidence >= 70 ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-400'
              : result.confidence >= 40 ? 'bg-amber-500/15 border-amber-400/30 text-amber-400'
              : 'bg-red-500/15 border-red-400/30 text-red-400'
            }`}>
              {result.confidence}%
            </div>
          </div>
          {result.evidence && (
            <p className="font-sans text-[11px] text-on-surface-variant/60 leading-relaxed italic">{result.evidence}</p>
          )}
          {result.characteristic_phrases_found.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {result.characteristic_phrases_found.map((p, i) => (
                <span key={i} className="px-2 py-1 rounded-lg bg-secondary/10 border border-secondary/20 font-mono text-[8px] text-secondary/70">{p}</span>
              ))}
            </div>
          )}
          <button onClick={reset} className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/30 hover:text-primary transition-colors">Detect again</button>
        </div>
      )}
    </div>
  )
}
