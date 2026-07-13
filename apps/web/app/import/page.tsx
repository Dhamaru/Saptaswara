'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Upload, Music, ArrowLeft, AlertCircle } from 'lucide-react'

const ACCEPT = '.mp3,.wav,.m4a,.aac,.webm'
const MAX_MB = 10

interface DetectResult {
  raga: string | null
  confidence: number
  tradition: string | null
  time_of_day: string | null
  evidence: string
  characteristic_phrases_found: string[]
}

type PageState = 'idle' | 'loading' | 'result' | 'error'

export default function ImportPage() {
  const [pageState, setPageState] = useState<PageState>('idle')
  const [result, setResult] = useState<DetectResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [fileName, setFileName] = useState<string>('')
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    if (file.size > MAX_MB * 1024 * 1024) {
      setErrorMsg(`File too large — max ${MAX_MB} MB`)
      setPageState('error')
      return
    }

    setFileName(file.name)
    setPageState('loading')
    setResult(null)
    setErrorMsg('')

    const formData = new FormData()
    formData.append('audio', file)

    try {
      const res = await fetch('/api/audio/detect-raga', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Detection failed')
      setResult(data)
      setPageState('result')
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Something went wrong')
      setPageState('error')
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const confidenceColor = (c: number) =>
    c >= 75 ? 'text-emerald-400 border-emerald-400/30 bg-emerald-500/10'
    : c >= 50 ? 'text-amber-400 border-amber-400/30 bg-amber-500/10'
    : 'text-red-400 border-red-400/30 bg-red-500/10'

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 dot-pattern opacity-20" />
      <div className="absolute top-24 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link href="/library" className="inline-flex items-center gap-2 text-on-surface-variant/40 hover:text-on-surface-variant text-xs mb-6 transition-colors">
            <ArrowLeft className="w-3 h-3" />
            Back to Library
          </Link>
          <h1 className="text-4xl font-black text-gradient-subtle tracking-tight">Detect Raga</h1>
          <p className="text-on-surface-variant/40 mt-2 text-sm">
            Upload a recording — AI identifies the raga, its characteristic phrases, and how confident it is.
          </p>
        </div>

        {/* Drop zone */}
        {(pageState === 'idle' || pageState === 'error') && (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-300 p-12 flex flex-col items-center gap-4 ${
                isDragOver
                  ? 'border-primary/60 bg-primary/8 scale-[1.01]'
                  : 'border-outline-variant/20 bg-surface-container/20 hover:border-outline-variant/40 hover:bg-surface-container/30'
              }`}
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${isDragOver ? 'bg-primary/20' : 'bg-surface-container-low/60'}`}>
                <Upload className={`w-7 h-7 ${isDragOver ? 'text-primary' : 'text-on-surface-variant/30'}`} />
              </div>
              <div className="text-center">
                <div className="font-semibold text-on-surface/70 mb-1">
                  Drop your recording here
                </div>
                <div className="text-xs text-on-surface-variant/40">
                  MP3, WAV, M4A, AAC, WebM · max {MAX_MB} MB
                </div>
              </div>
              <div className="px-5 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary-light text-xs font-semibold hover:bg-primary/20 transition-all">
                Browse Files
              </div>
              <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={handleFileChange} />
            </div>

            {pageState === 'error' && (
              <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/8 border border-red-400/20">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-sm text-red-300/80">{errorMsg}</span>
              </div>
            )}
          </>
        )}

        {/* Loading */}
        {pageState === 'loading' && (
          <div className="rounded-3xl glass p-12 flex flex-col items-center gap-5">
            <div className="w-16 h-16 rounded-2xl glass-gold flex items-center justify-center animate-pulse">
              <Music className="w-7 h-7 text-primary-light" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-on-surface mb-1">Analysing {fileName}…</div>
              <div className="text-xs text-on-surface-variant/40">Gemini 1.5 Pro is listening for characteristic phrases</div>
            </div>
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* Result */}
        {pageState === 'result' && result && (
          <div className="space-y-4 animate-fade-in">
            {/* Main card */}
            <div className="rounded-3xl glass p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <div className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/30 mb-1">
                    Detected Raga
                  </div>
                  <h2 className="text-3xl font-black text-on-surface">
                    {result.raga ? `Raga ${result.raga}` : 'Unidentified'}
                  </h2>
                  {result.tradition && (
                    <div className="text-xs text-on-surface-variant/50 mt-1">
                      {result.tradition}{result.time_of_day ? ` · ${result.time_of_day}` : ''}
                    </div>
                  )}
                </div>
                <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center border font-display text-sm font-semibold ${confidenceColor(result.confidence)}`}>
                  {result.confidence}%
                  <span className="font-mono text-[7px] uppercase tracking-wider mt-0.5 opacity-60">conf</span>
                </div>
              </div>

              {result.evidence && (
                <p className="text-sm text-on-surface-variant/60 leading-relaxed mb-5">
                  {result.evidence}
                </p>
              )}

              {result.characteristic_phrases_found.length > 0 && (
                <div className="mb-5">
                  <div className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/30 mb-2">
                    Characteristic phrases found
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.characteristic_phrases_found.map((phrase, i) => (
                      <span key={i} className="px-3 py-1 rounded-lg bg-primary/8 border border-primary/15 font-mono text-xs text-on-surface/70">
                        {phrase}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {result.raga && (
                  <Link
                    href={`/studio?raga_name=${encodeURIComponent(result.raga)}`}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:bg-primary/90 transition-all active:scale-95"
                  >
                    <Music className="w-4 h-4" />
                    Open in Studio
                  </Link>
                )}
                <button
                  onClick={() => { setPageState('idle'); setResult(null); if (inputRef.current) inputRef.current.value = '' }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl glass-light hover:bg-primary/10 text-on-surface-variant text-sm font-semibold transition-all"
                >
                  Try Another
                </button>
              </div>
            </div>

            {result.confidence < 50 && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-400/20">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-amber-300/80">
                  Low confidence — result may not be accurate. Try a cleaner recording with minimal accompaniment.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
