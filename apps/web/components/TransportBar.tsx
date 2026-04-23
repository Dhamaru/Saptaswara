'use client'

import React, { useState, useEffect, useRef } from 'react'
import * as Tone from 'tone'
import { getAudioEngine } from '@/lib/audio'
import type { Tala } from '@/lib/talas'

interface TransportBarProps {
  isPlaying: boolean
  onTogglePlay: () => void
  isRecording: boolean
  onToggleRecording: () => void
  recordingTime: number
  bpm: number
  onBpmChange: (val: number) => void
  volume: number
  onVolumeChange: (val: number) => void
  tala: Tala
}

export default function TransportBar({
  isPlaying,
  onTogglePlay,
  isRecording,
  onToggleRecording,
  recordingTime,
  bpm,
  onBpmChange,
  volume,
  onVolumeChange,
  tala,
}: TransportBarProps) {
  const engine = getAudioEngine()
  const [metronomeOn, setMetronomeOn] = useState(false)
  const [masteringPreset, setMasteringPreset] = useState<'neutral' | 'clear' | 'warm' | 'punchy'>('neutral')
  const [meterLevel, setMeterLevel] = useState(-Infinity)
  const [currentTime, setCurrentTime] = useState(0)
  
  // BUG-021: empty deps — getAudioEngine() called inside interval to avoid
  // re-registering the meter poller whenever the engine reference changes.
  useEffect(() => {
    const interval = setInterval(() => {
      const eng = getAudioEngine()
      if (eng) setMeterLevel(eng.getMeterLevel())
    }, 50)
    return () => clearInterval(interval)
  }, [])

  // BUG-022: sync currentTime from transport immediately when play stops,
  // so the display shows 0 after Stop and the correct offset after Pause.
  useEffect(() => {
    if (!isPlaying) {
      setCurrentTime(Tone.getTransport().seconds)
      return
    }
    const interval = setInterval(() => {
      setCurrentTime(Tone.getTransport().seconds)
    }, 100)
    return () => clearInterval(interval)
  }, [isPlaying])

  const toggleMetronome = () => {
    const next = !metronomeOn
    setMetronomeOn(next)
    engine?.toggleMetronome(next, tala.matras)
  }

  const cycleMastering = () => {
    const presets: ('neutral' | 'clear' | 'warm' | 'punchy')[] = ['neutral', 'clear', 'warm', 'punchy']
    const next = presets[(presets.indexOf(masteringPreset) + 1) % presets.length]
    setMasteringPreset(next)
    engine?.setMasteringPreset(next)
  }

  const formatTime = (timeInSeconds: number) => {
    const mins = Math.floor(timeInSeconds / 60)
    const secs = Math.floor(timeInSeconds % 60)
    const ms = Math.floor((timeInSeconds % 1) * 10)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`
  }

  // Calculate meter percentage (approx -60dB to 0dB range)
  const meterWidth = Math.max(0, Math.min(100, (meterLevel + 60) * 1.6))

  return (
    <div className="h-20 glass-panel mx-8 mb-8 rounded-[32px] border border-white/5 flex items-center justify-between px-6 shadow-2xl bg-black/40 backdrop-blur-xl">
      
      {/* ── Section: Metronome + Tempo ── */}
      <div className="flex items-center bg-white/5 rounded-2xl p-1 gap-1 border border-white/5">
        <button
          onClick={toggleMetronome}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            metronomeOn ? 'bg-primary text-on-primary shadow-glow' : 'hover:bg-white/10 text-white/40'
          }`}
          title="Metronome"
        >
          <span className="material-symbols-outlined !text-xl">timer</span>
        </button>
        <div className="h-6 w-px bg-white/10 mx-1" />
        <div className="flex items-center gap-3 px-3 min-w-[100px]">
          <span
            className={`font-mono text-lg text-white font-light transition-all ${isPlaying ? 'animate-beat-pulse' : ''}`}
            style={isPlaying ? { animationDuration: `${(60 / bpm).toFixed(3)}s` } : undefined}
          >
            {bpm}
          </span>
          <span className="font-mono text-[8px] uppercase tracking-tighter text-white/30 font-bold">BPM</span>
          <div className="flex flex-col gap-0.5 ml-auto">
            <button onClick={() => onBpmChange(bpm + 1)} className="text-[10px] text-white/40 hover:text-white leading-none">▲</button>
            <button onClick={() => onBpmChange(bpm - 1)} className="text-[10px] text-white/40 hover:text-white leading-none">▼</button>
          </div>
        </div>
        <div className="h-6 w-px bg-white/10 mx-1" />
        <div className="px-3 font-mono text-[10px] text-white/40 font-bold tracking-widest">{tala.matras} / 4</div>
      </div>

      {/* ── Section: Transport Controls ── */}
      <div className="flex items-center gap-2">
         <button
          onClick={() => { Tone.getTransport().stop(); onTogglePlay() }}
          className="w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-white/5 transition-all text-white/60 active:scale-95"
        >
          <span className="material-symbols-outlined !text-2xl">first_page</span>
        </button>
        
        <button
          onClick={onTogglePlay}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
            isPlaying ? 'bg-white text-black shadow-xl scale-105' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          <span className="material-symbols-outlined !text-3xl">{isPlaying ? 'pause' : 'play_arrow'}</span>
        </button>

        <button
          onClick={onToggleRecording}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
            isRecording ? 'bg-red-500 text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-white/5 text-red-500/50 hover:bg-white/10'
          }`}
        >
          <span className="material-symbols-outlined !text-2xl">fiber_manual_record</span>
        </button>

        {/* Digital Time Display */}
        <div className="bg-black/60 border border-white/5 px-6 h-12 rounded-2xl flex items-center min-w-[120px] justify-center ml-2">
          <span className="font-mono text-xl tracking-widest text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]">
            {formatTime(isRecording ? recordingTime : currentTime)}
          </span>
        </div>
      </div>

      {/* ── Section: Mastering + Volume ── */}
      <div className="flex items-center gap-6">
        
        {/* Mastering Preset */}
        <button
          onClick={cycleMastering}
          className="flex flex-col items-start px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all min-w-[120px]"
        >
          <span className="font-mono text-[8px] uppercase tracking-widest text-white/30 font-bold mb-0.5">Mastering</span>
          <span className="font-sans text-[10px] text-primary uppercase font-bold tracking-wider">{masteringPreset}</span>
        </button>

        {/* Meter + Volume */}
        <div className="flex items-center gap-4 bg-white/5 rounded-2xl px-5 h-12 border border-white/5">
          <span className="material-symbols-outlined !text-lg text-white/30">volume_up</span>
          <div className="flex flex-col gap-1 w-32 relative">
            {/* VU Meter Background */}
            <div className="absolute -top-3 left-0 w-full h-[2px] bg-white/10 rounded-full overflow-hidden">
               <div 
                className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-75"
                style={{ width: `${meterWidth}%` }}
               />
            </div>
            <input 
              type="range" 
              min={-40} max={0} 
              value={volume} 
              onChange={(e) => onVolumeChange(Number(e.target.value))} 
              className="w-full h-1 accent-primary cursor-pointer" 
            />
          </div>
          <span className="font-mono text-[10px] text-white/40 min-w-[36px] text-right font-bold">{volume === -40 ? 'INF' : `${volume.toFixed(1)} dB`}</span>
        </div>
      </div>

    </div>
  )
}
