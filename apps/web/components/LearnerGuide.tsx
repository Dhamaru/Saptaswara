'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { swaraDisplayName, getSwaraType } from '@/lib/swaraUtils'

// ── Chapter config ─────────────────────────────────────────────────────────────
type ChapterId = 'welcome' | 'swaras' | 'scale' | 'raga' | 'vadi' | 'gamakas' | 'practice' | 'tips'

const CHAPTERS = [
  { id: 'welcome'  as ChapterId, label: 'Welcome',        icon: 'waving_hand',  tagline: 'Start your journey',          gradient: 'from-violet-600/30 to-indigo-500/10' },
  { id: 'swaras'   as ChapterId, label: 'The 7 Swaras',   icon: 'music_note',   tagline: 'The building blocks',          gradient: 'from-amber-500/30 to-orange-500/10' },
  { id: 'scale'    as ChapterId, label: 'Scale & Octave',  icon: 'straighten',   tagline: 'Space and pitch',              gradient: 'from-sky-500/30 to-cyan-500/10' },
  { id: 'raga'     as ChapterId, label: 'Ragas',           icon: 'auto_awesome', tagline: 'Beyond a scale',               gradient: 'from-emerald-500/30 to-teal-500/10' },
  { id: 'vadi'     as ChapterId, label: 'Vadi & Samvadi',  icon: 'stars',        tagline: 'Note hierarchy',               gradient: 'from-yellow-500/30 to-amber-500/10' },
  { id: 'gamakas'  as ChapterId, label: 'Gamakas',         icon: 'graphic_eq',   tagline: 'Ornamentation',                gradient: 'from-rose-500/30 to-pink-500/10' },
  { id: 'practice' as ChapterId, label: 'First Loop',      icon: 'play_lesson',  tagline: 'Make music now',               gradient: 'from-primary/30 to-secondary/10' },
  { id: 'tips'     as ChapterId, label: 'Practice Tips',   icon: 'lightbulb',    tagline: 'Habits that accelerate learning', gradient: 'from-lime-500/30 to-green-500/10' },
] as const

// ── Swara Explorer data ────────────────────────────────────────────────────────
const BASE_SWARAS = [
  {
    short: 'Sa', full: 'Shadja', western: 'C',
    type: 'achala',
    char: 'The root note — the absolute centre of gravity. Every other note is measured in relation to Sa. It never changes.',
    komal: null, tivra: null,
  },
  {
    short: 'Re', full: 'Rishabh', western: 'D',
    type: 'shuddha',
    char: 'Noble and bright. In its shuddha form it has an uplifted, dignified quality.',
    komal: { short: 're',  full: 'Komal Re',  western: 'C♯', char: 'Tender and vulnerable — often gives a raga a plaintive quality.' },
    tivra: null,
  },
  {
    short: 'Ga', full: 'Gandhara', western: 'E',
    type: 'shuddha',
    char: 'The most expressive swara. Shuddha Ga is warm and confident; komal Ga is heart-rending.',
    komal: { short: 'ga',  full: 'Komal Ga',  western: 'D♯', char: 'Deeply emotional — the signature of many beloved ragas like Darbari.' },
    tivra: null,
  },
  {
    short: 'Ma', full: 'Madhyama', western: 'F',
    type: 'shuddha',
    char: 'The bridge note — the midpoint between Sa and Pa. Shuddha Ma is stable and grounding.',
    komal: null,
    tivra: { short: 'ma', full: 'Tivra Ma', western: 'F♯', char: 'Bright and ethereal — the signature of Raga Yaman, giving it its evening character.' },
  },
  {
    short: 'Pa', full: 'Panchama', western: 'G',
    type: 'achala',
    char: 'The twin of Sa — equally stable, equally fixed. Sa and Pa anchor every raga like pillars.',
    komal: null, tivra: null,
  },
  {
    short: 'Dha', full: 'Dhaivata', western: 'A',
    type: 'shuddha',
    char: 'Rich and dignified. Often carries the emotional weight of the melody in the upper half of the octave.',
    komal: { short: 'dha', full: 'Komal Dha', western: 'G♯', char: 'Dark and introspective — key to the devotional colour of ragas like Bhairav.' },
    tivra: null,
  },
  {
    short: 'Ni', full: 'Nishada', western: 'B',
    type: 'shuddha',
    char: 'The note of longing and yearning — it naturally pulls the ear back toward Sa to complete the cycle.',
    komal: { short: 'ni',  full: 'Komal Ni',  western: 'A♯', char: 'Softer and more wistful than Shuddha Ni — common in evening and night ragas.' },
    tivra: null,
  },
] as const

// ── Reusable small components ─────────────────────────────────────────────────

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-surface-container-high border border-outline-variant/20 font-mono text-[9px] font-bold text-primary mx-0.5">
      {children}
    </kbd>
  )
}

function Tag({ children, color = 'primary' }: { children: React.ReactNode; color?: string }) {
  const cls = color === 'amber'   ? 'bg-amber-400/10 border-amber-400/20 text-amber-300/80'
            : color === 'sky'     ? 'bg-sky-400/10 border-sky-400/20 text-sky-300/80'
            : color === 'rose'    ? 'bg-rose-400/10 border-rose-400/20 text-rose-300/80'
            : color === 'emerald' ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-300/80'
            : color === 'orange'  ? 'bg-orange-400/10 border-orange-400/20 text-orange-300/80'
            :                       'bg-primary/10 border-primary/20 text-primary/80'
  return (
    <span className={`px-2.5 py-0.5 rounded-full border font-mono text-[8px] uppercase tracking-widest ${cls}`}>
      {children}
    </span>
  )
}

function ConceptCard({ icon, title, desc, color = 'default' }: { icon: string; title: string; desc: string; color?: string }) {
  const bg = color === 'amber'   ? 'bg-amber-400/8 border-amber-400/15'
           : color === 'sky'     ? 'bg-sky-400/8 border-sky-400/15'
           : color === 'rose'    ? 'bg-rose-400/8 border-rose-400/15'
           : color === 'emerald' ? 'bg-emerald-400/8 border-emerald-400/15'
           :                       'bg-surface-container-low/50 border-outline-variant/10'
  const ic = color === 'amber' ? 'text-amber-400' : color === 'sky' ? 'text-sky-400' : color === 'rose' ? 'text-rose-400' : color === 'emerald' ? 'text-emerald-400' : 'text-primary/70'
  return (
    <div className={`rounded-2xl border p-4 ${bg}`}>
      <div className="flex items-start gap-3">
        <span className={`material-symbols-outlined !text-lg flex-shrink-0 mt-0.5 ${ic}`}>{icon}</span>
        <div>
          <p className="font-sans text-sm font-semibold text-on-surface/85 mb-1">{title}</p>
          <p className="font-sans text-xs text-on-surface-variant/60 leading-relaxed">{desc}</p>
        </div>
      </div>
    </div>
  )
}

function PracticeStep({ num, title, where, desc }: { num: number; title: string; where?: string; desc: string }) {
  return (
    <div className="flex gap-3 p-3 rounded-xl bg-surface-container-low/40 border border-outline-variant/8">
      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
        {num}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="font-sans text-sm font-semibold text-on-surface/85">{title}</span>
          {where && <Tag color="primary">{where}</Tag>}
        </div>
        <p className="font-sans text-xs text-on-surface-variant/60 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

// ── Interactive: Swara Explorer ───────────────────────────────────────────────
function SwaraExplorer() {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const sw = selectedIdx !== null ? BASE_SWARAS[selectedIdx] : null

  return (
    <div>
      {/* 7 base swara tiles */}
      <div className="grid grid-cols-7 gap-2 mb-3">
        {BASE_SWARAS.map((s, i) => {
          const isSelected = selectedIdx === i
          const isAchala = s.type === 'achala'
          return (
            <button
              key={s.short}
              onClick={() => setSelectedIdx(isSelected ? null : i)}
              className={`flex flex-col items-center gap-1.5 py-4 rounded-2xl border transition-all duration-200 ${
                isSelected
                  ? isAchala
                    ? 'bg-amber-400/20 border-amber-400/60 scale-105 shadow-lg'
                    : 'bg-primary/20 border-primary/60 scale-105 shadow-lg'
                  : 'bg-surface-container-low/50 border-outline-variant/10 hover:border-primary/30 hover:bg-surface-container-high/40 hover:scale-102'
              }`}
            >
              <span className={`font-display text-2xl font-medium transition-colors ${
                isAchala ? 'text-amber-300' : isSelected ? 'text-primary' : 'text-on-surface/80'
              }`}>{s.short}</span>
              <span className="font-mono text-[8px] text-on-surface-variant/40">{s.western}</span>
              {isAchala && (
                <span className="font-mono text-[6px] uppercase tracking-widest text-amber-400/50 px-1.5 py-0.5 rounded-full border border-amber-400/20 bg-amber-400/8">
                  fixed
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Detail card */}
      {sw ? (
        <div className="rounded-2xl bg-surface-container-low/60 border border-outline-variant/15 p-5 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              sw.type === 'achala' ? 'bg-amber-400/15 border border-amber-400/20' : 'bg-primary/10 border border-primary/20'
            }`}>
              <span className={`font-display text-3xl font-medium ${sw.type === 'achala' ? 'text-amber-300' : 'text-primary'}`}>
                {sw.short}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-display text-xl font-light text-on-surface">{sw.full}</h3>
                <Tag color={sw.type === 'achala' ? 'amber' : 'primary'}>{sw.type}</Tag>
                <Tag color="sky">{sw.western} (west)</Tag>
              </div>
              <p className="font-sans text-sm text-on-surface-variant/70 leading-relaxed mb-3">{sw.char}</p>
              {(sw.komal || sw.tivra) && (
                <div className="flex flex-wrap gap-2">
                  {sw.komal && (
                    <div className="flex-1 min-w-[160px] px-3 py-2 rounded-xl bg-sky-400/8 border border-sky-400/20">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-display text-base text-sky-300">{sw.komal.short}</span>
                        <span className="font-mono text-[8px] text-sky-400/60 uppercase tracking-widest">{sw.komal.full}</span>
                        <span className="font-mono text-[8px] text-sky-400/50">· {sw.komal.western}</span>
                      </div>
                      <p className="font-sans text-[10px] text-on-surface-variant/55 leading-snug">{sw.komal.char}</p>
                    </div>
                  )}
                  {sw.tivra && (
                    <div className="flex-1 min-w-[160px] px-3 py-2 rounded-xl bg-orange-400/8 border border-orange-400/20">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-display text-base text-orange-300">{sw.tivra.short}</span>
                        <span className="font-mono text-[8px] text-orange-400/60 uppercase tracking-widest">{sw.tivra.full}</span>
                        <span className="font-mono text-[8px] text-orange-400/50">· {sw.tivra.western}</span>
                      </div>
                      <p className="font-sans text-[10px] text-on-surface-variant/55 leading-snug">{sw.tivra.char}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-outline-variant/15 p-4 text-center">
          <span className="material-symbols-outlined !text-2xl text-on-surface-variant/20 block mb-1">touch_app</span>
          <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/30">Tap any note tile to explore it</p>
        </div>
      )}
    </div>
  )
}

// ── Interactive: Aroha Visualizer ─────────────────────────────────────────────
function ArohaVisualizer({ notes, label }: { notes: string[]; label: string }) {
  const [activeIdx, setActiveIdx] = useState(-1)
  const [running, setRunning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setRunning(false)
    setActiveIdx(-1)
  }, [])

  const animate = useCallback(() => {
    if (running) { stop(); return }
    setRunning(true)
    setActiveIdx(-1)
    let i = 0
    const step = () => {
      if (i >= notes.length) { stop(); return }
      setActiveIdx(i)
      i++
      timerRef.current = setTimeout(step, 650)
    }
    step()
  }, [running, notes, stop])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/40 font-bold">{label}</span>
        <button
          onClick={animate}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-[8px] uppercase tracking-widest transition-all border ${
            running
              ? 'bg-primary/20 border-primary/40 text-primary'
              : 'bg-surface-container-high/40 border-outline-variant/10 text-on-surface-variant/50 hover:border-primary/30 hover:text-primary/80'
          }`}
        >
          <span className="material-symbols-outlined !text-xs leading-none">{running ? 'stop' : 'play_arrow'}</span>
          {running ? 'Playing…' : 'Animate'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {notes.map((note, i) => {
          const type = getSwaraType(note)
          const display = swaraDisplayName(note)
          const isActive = i === activeIdx
          return (
            <div
              key={`${note}-${i}`}
              className={`px-3 py-2 rounded-xl font-mono text-sm font-bold border transition-all duration-300 ${
                isActive
                  ? type === 'achala'   ? 'bg-amber-400/30 border-amber-400/70 text-amber-200 scale-125 shadow-glow'
                  : type === 'komal'    ? 'bg-sky-400/30 border-sky-400/70 text-sky-200 scale-125'
                  : type === 'tivra'   ? 'bg-orange-400/30 border-orange-400/70 text-orange-200 scale-125'
                  :                      'bg-primary/30 border-primary/70 text-primary scale-125'
                  : type === 'achala'  ? 'bg-amber-400/10 border-amber-400/20 text-amber-400/70'
                  : type === 'komal'   ? 'bg-sky-400/10 border-sky-400/20 text-sky-400/70'
                  : type === 'tivra'  ? 'bg-orange-400/10 border-orange-400/20 text-orange-400/70'
                  :                     'bg-surface-container-high/40 border-outline-variant/10 text-on-surface/60'
              }`}
            >
              {display}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Raga anatomy ──────────────────────────────────────────────────────────────
const RAGA_ELEMENTS = [
  { term: 'Aroha',    icon: 'arrow_upward',          color: 'emerald', desc: 'The ascending pattern — how you climb from low Sa to high Sa. Not always in strict order.' },
  { term: 'Avaroha',  icon: 'arrow_downward',         color: 'sky',     desc: 'The descending pattern — often different from the Aroha, giving each raga its unique shape.' },
  { term: 'Vadi',     icon: 'grade',                  color: 'amber',   desc: 'The "king" note — the most important, most frequently used swara. Always return to it.' },
  { term: 'Samvadi',  icon: 'supervised_user_circle', color: 'primary', desc: 'The "minister" note — second most important, usually a fourth or fifth away from Vadi.' },
  { term: 'Pakad',    icon: 'fingerprint',            color: 'rose',    desc: 'A signature phrase that instantly identifies the raga — its melodic fingerprint.' },
  { term: 'Rasa',     icon: 'mood',                   color: 'orange',  desc: 'The emotional colour — devotion, romance, longing, courage. Each raga has its own.' },
]

// Yaman is the standard example raga
const YAMAN_AROHA  = ['Sa', 'Re', 'Ga', 'ma', 'Pa', 'Dha', 'Ni', 'Sa']
const YAMAN_AVAROHA = ['Sa', 'Ni', 'Dha', 'Pa', 'ma', 'Ga', 'Re', 'Sa']

// ── Chapter content ───────────────────────────────────────────────────────────
function ChWelcome() {
  const zones = [
    { icon: 'view_sidebar',    label: 'Left Sidebar',    desc: 'Tracks, Raga selector, and Tradition toggle. Pick your raga and manage composition layers here.' },
    { icon: 'grid_on',         label: 'Sequencer Grid',  desc: 'Click any cell to select a step, then press a key or tap the keyboard to record a note.' },
    { icon: 'piano',           label: 'Keyboard Area',   desc: 'Piano / SwaPad / DrumPad — your instrument. Keys are colour-coded to show the active raga\'s grammar.' },
    { icon: 'horizontal_rule', label: 'Transport Rail',  desc: 'The bar at the bottom — Play, Stop, Drone, Tempo, Volume, Swing, Record, MIDI Export.' },
    { icon: 'auto_fix_high',   label: 'AI Assistant',    desc: 'The glowing button (bottom-right) — ask it anything about ragas, ask for a melody suggestion, or switch to Learn mode.' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="font-mono text-[9px] uppercase tracking-widest text-primary/60 font-bold mb-3">Studio layout</p>
          {zones.map(z => (
            <div key={z.label} className="flex gap-3 p-3 rounded-xl bg-surface-container-low/40 border border-outline-variant/8">
              <span className="material-symbols-outlined !text-base text-primary/60 flex-shrink-0 mt-0.5">{z.icon}</span>
              <div>
                <p className="font-sans text-sm font-semibold text-on-surface/85">{z.label}</p>
                <p className="font-sans text-xs text-on-surface-variant/60 leading-relaxed">{z.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <p className="font-mono text-[9px] uppercase tracking-widest text-secondary/60 font-bold mb-3">You will learn</p>
          {[
            ['music_note',  'The 7 swaras (notes) and their variants'],
            ['straighten',  'How octaves and registers work'],
            ['menu_book',   'What makes a raga different from a scale'],
            ['stars',       'Why some notes matter more than others'],
            ['graphic_eq',  'How notes are ornamented (gamakas)'],
            ['play_lesson', 'How to build your first loop'],
            ['lightbulb',   'Daily practice habits that actually work'],
          ].map(([icon, text]) => (
            <div key={text as string} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined !text-sm text-secondary/70">{icon as string}</span>
              </div>
              <span className="font-sans text-sm text-on-surface-variant/70">{text as string}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-primary/8 to-secondary/8 border border-primary/15 p-4">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined !text-lg text-primary/70 flex-shrink-0">tips_and_updates</span>
          <div>
            <p className="font-sans text-sm font-semibold text-on-surface/85 mb-1">Two traditions, one note system</p>
            <p className="font-sans text-xs text-on-surface-variant/65 leading-relaxed">
              Indian classical music has two main traditions — <strong className="text-on-surface/80">Hindustani</strong> (North India) and <strong className="text-on-surface/80">Carnatic</strong> (South India).
              They share the same 7 swaras but have different ragas and styles. Switch between them in the sidebar's tradition toggle.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-2xl bg-surface-container-low/30 border border-outline-variant/10">
        <span className="material-symbols-outlined !text-2xl text-secondary/60">school</span>
        <div>
          <p className="font-sans text-sm text-on-surface/70 leading-relaxed">
            Use the chapters on the left to move at your own pace. The <strong className="text-on-surface/85">AI Assistant</strong> can answer any question — switch it to <strong className="text-on-surface/85">Learn mode</strong> (school icon in the chat header) for beginner-friendly explanations.
          </p>
        </div>
      </div>
    </div>
  )
}

function ChSwaras() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 p-5">
        <p className="font-display text-lg font-light text-on-surface mb-2">The Indian equivalent of Do Re Mi</p>
        <p className="font-sans text-sm text-on-surface-variant/70 leading-relaxed">
          Indian music uses <strong className="text-on-surface/85">7 base swaras</strong> — Sa Re Ga Ma Pa Dha Ni. From these 7, you get 12 distinct pitches by adding komal (flat ♭) and tivra (sharp ♯) variants.
          <strong className="text-amber-300"> Sa and Pa are special</strong> — they never change, never have variants. They are the anchors.
        </p>
      </div>

      <SwaraExplorer />

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-surface-container-low/50 border border-outline-variant/10 text-center">
          <span className="font-display text-2xl font-light text-on-surface/80 block mb-1">Uppercase</span>
          <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40">Shuddha (natural)</p>
          <p className="font-sans text-xs text-on-surface-variant/50 mt-1">Re, Ga, Ma, Dha, Ni</p>
        </div>
        <div className="p-3 rounded-xl bg-sky-500/8 border border-sky-500/15 text-center">
          <span className="font-display text-2xl font-light text-sky-300 block mb-1">Lowercase</span>
          <p className="font-mono text-[8px] uppercase tracking-widest text-sky-400/60">Komal (flat ♭)</p>
          <p className="font-sans text-xs text-sky-300/50 mt-1">re, ga, dha, ni</p>
        </div>
        <div className="p-3 rounded-xl bg-orange-500/8 border border-orange-500/15 text-center">
          <span className="font-display text-2xl font-light text-orange-300 block mb-1">ma</span>
          <p className="font-mono text-[8px] uppercase tracking-widest text-orange-400/60">Tivra (sharp ♯)</p>
          <p className="font-sans text-xs text-orange-300/50 mt-1">only Ma has a sharp variant</p>
        </div>
      </div>
    </div>
  )
}

function ChScale() {
  const registers = [
    { name: 'Mandra',  label: 'Low Register',    icon: 'keyboard_double_arrow_down', color: 'violet', desc: 'Deep, resonant. The chest voice range. Use it for grounded, serious phrases.', key: 'Octave 3' },
    { name: 'Madhya',  label: 'Middle Register',  icon: 'remove',                     color: 'primary', desc: 'The natural singing range. Where you will spend most of your practice time.', key: 'Octave 4' },
    { name: 'Taar',    label: 'High Register',    icon: 'keyboard_double_arrow_up',   color: 'amber',  desc: 'Bright and intense. Upper notes have a piercing, urgent quality.', key: 'Octave 5' },
  ]

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-surface-container-low/40 border border-outline-variant/10 p-4">
        <p className="font-display text-base font-light text-on-surface mb-1">One note, three voices</p>
        <p className="font-sans text-xs text-on-surface-variant/65 leading-relaxed">
          An octave is a doubling of frequency. If Sa is at 261 Hz, the next Sa up is 522 Hz — twice as fast, but felt as <em>the same note in a higher voice</em>.
          This is why Sa Re Ga Ma Pa Dha Ni repeats — the cycle continues in each register.
        </p>
      </div>

      <div className="space-y-3">
        {registers.map(r => {
          const bg  = r.color === 'violet' ? 'bg-violet-500/8 border-violet-500/15' : r.color === 'amber' ? 'bg-amber-500/8 border-amber-500/15' : 'bg-primary/8 border-primary/15'
          const ico = r.color === 'violet' ? 'text-violet-400' : r.color === 'amber' ? 'text-amber-400' : 'text-primary'
          return (
            <div key={r.name} className={`flex items-center gap-4 p-4 rounded-2xl border ${bg}`}>
              <div className="text-center w-14 flex-shrink-0">
                <span className={`material-symbols-outlined !text-2xl ${ico}`}>{r.icon}</span>
                <p className={`font-display text-xl font-light mt-1 ${ico}`}>{r.name}</p>
                <p className="font-mono text-[7px] text-on-surface-variant/30 uppercase tracking-widest">{r.key}</p>
              </div>
              <div>
                <p className="font-sans text-xs font-semibold text-on-surface/80 mb-0.5">{r.label}</p>
                <p className="font-sans text-xs text-on-surface-variant/60 leading-relaxed">{r.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-primary/8 to-transparent border border-primary/15 p-4">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined !text-lg text-primary/70 flex-shrink-0">piano</span>
          <p className="font-sans text-sm text-on-surface-variant/65 leading-relaxed">
            In the <strong className="text-on-surface/85">SwaPad</strong>, use the <Kbd>Mandra</Kbd> / <Kbd>Madhya</Kbd> / <Kbd>Taar</Kbd> buttons to change register.
            Start in <strong className="text-on-surface/85">Madhya</strong> — it's the most natural and is the default.
          </p>
        </div>
      </div>
    </div>
  )
}

function ChRaga() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 p-5">
        <p className="font-display text-lg font-light text-on-surface mb-2">More than a scale — a living personality</p>
        <p className="font-sans text-sm text-on-surface-variant/70 leading-relaxed">
          Two ragas can share the exact same notes and still sound completely different — because of <em>how</em> those notes are approached, which are emphasised, and how they move between each other.
          A raga has <strong className="text-on-surface/85">grammar, emotion, time of day, and season</strong>.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {RAGA_ELEMENTS.map(el => (
          <ConceptCard key={el.term} icon={el.icon} title={el.term} desc={el.desc} color={el.color as any} />
        ))}
      </div>

      <div className="rounded-2xl bg-surface-container-low/40 border border-outline-variant/10 p-4 space-y-4">
        <p className="font-mono text-[9px] uppercase tracking-widest text-emerald-400/60 font-bold">Example — Raga Yaman (Hindustani, evening)</p>
        <ArohaVisualizer notes={YAMAN_AROHA}  label="Aroha (ascending)" />
        <ArohaVisualizer notes={YAMAN_AVAROHA} label="Avaroha (descending)" />
        <p className="font-sans text-[10px] text-on-surface-variant/40 italic">
          Notice tivra Ma (♯ F) in both directions — that single altered note gives Yaman its ethereal, evening character.
        </p>
      </div>
    </div>
  )
}

function ChVadi() {
  const hierarchy = [
    {
      rank: 1, title: 'Vadi', subtitle: 'The King',
      icon: 'grade', color: 'amber',
      bg: 'bg-amber-400/12 border-amber-400/30', text: 'text-amber-300',
      desc: 'The most used, most important note. Begin phrases here. Rest here. Return here constantly.',
      example: 'Yaman → Ga is Vadi (the amber key on the Piano)',
    },
    {
      rank: 2, title: 'Samvadi', subtitle: 'The Minister',
      icon: 'supervised_user_circle', color: 'sky',
      bg: 'bg-sky-400/12 border-sky-400/30', text: 'text-sky-300',
      desc: 'Second most important. Usually a fourth or fifth away from Vadi — creates natural tension and resolution.',
      example: 'Yaman → Ni is Samvadi (the blue key on the Piano)',
    },
    {
      rank: 3, title: 'Anuvadi', subtitle: 'Supporting Notes',
      icon: 'people', color: 'primary',
      bg: 'bg-primary/12 border-primary/30', text: 'text-primary',
      desc: 'All other allowed notes. Use them freely to build phrases — just be sure to resolve back to Vadi.',
      example: 'Yaman → Re, Ma, Pa, Dha are Anuvadi',
    },
    {
      rank: 4, title: 'Varjya', subtitle: 'Forbidden Notes',
      icon: 'block', color: 'rose',
      bg: 'bg-rose-500/10 border-rose-500/25', text: 'text-rose-400',
      desc: 'Notes explicitly excluded from this raga. Playing them breaks the raga\'s grammar.',
      example: 'Turn on "Scale Lock" to block these automatically',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border border-yellow-500/20 p-4">
        <p className="font-display text-base font-light text-on-surface mb-1">Every raga has a note hierarchy</p>
        <p className="font-sans text-sm text-on-surface-variant/70 leading-relaxed">
          Not all notes in a raga carry equal weight. The Vadi is so central that classical musicians orient their entire improvisation around it — like a planet with gravity pulling everything into orbit.
        </p>
      </div>

      <div className="space-y-2">
        {hierarchy.map(h => (
          <div key={h.rank} className={`flex gap-4 p-4 rounded-2xl border ${h.bg}`}>
            <div className="flex-shrink-0 w-10 text-center">
              <div className={`w-10 h-10 rounded-full border ${h.bg} flex items-center justify-center mb-1`}>
                <span className={`material-symbols-outlined !text-base ${h.text}`}>{h.icon}</span>
              </div>
              <span className="font-mono text-[7px] text-on-surface-variant/30">#{h.rank}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`font-display text-base font-medium ${h.text}`}>{h.title}</span>
                <span className="font-mono text-[8px] text-on-surface-variant/40 uppercase tracking-widest">{h.subtitle}</span>
              </div>
              <p className="font-sans text-xs text-on-surface-variant/65 leading-relaxed mb-1">{h.desc}</p>
              <p className="font-mono text-[8px] text-on-surface-variant/35 italic">{h.example}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 p-3 rounded-xl bg-surface-container-low/30 border border-outline-variant/10">
        <span className="material-symbols-outlined !text-base text-primary/60 flex-shrink-0 mt-0.5">tips_and_updates</span>
        <p className="font-sans text-xs text-on-surface-variant/65 leading-relaxed">
          The simplest raga phrase structure: start near Vadi → move through Anuvadis → resolve back to Vadi or Sa. Even that simple pattern already sounds like authentic raga improvisation.
        </p>
      </div>
    </div>
  )
}

function ChGamakas() {
  const types = [
    { name: 'Meend',     icon: 'trending_up',           wave: '〜',  desc: 'A smooth continuous glide between two notes — pitch slides without breaking.' },
    { name: 'Andolan',   icon: 'waves',                  wave: '≋',  desc: 'A slow, gentle oscillation on one note — like a note breathing in and out.' },
    { name: 'Gamak',     icon: 'bolt',                   wave: '⚡', desc: 'Rapid, forceful alternation between two notes. Heavy and energetic.' },
    { name: 'Kan',       icon: 'touch_app',              wave: '·',  desc: 'A quick grace note from a neighbour before landing on the main note.' },
    { name: 'Murki',     icon: 'keyboard_double_arrow_down', wave: '↓↓', desc: 'A fast descending cluster of 3–4 notes that tumbles and resolves quickly.' },
    { name: 'Khatka',    icon: 'electric_bolt',          wave: '⚡⚡', desc: 'A sharp, snapping group executed with crisp precision.' },
    { name: 'Sparsh',    icon: 'arrow_upward',           wave: '↑',  desc: 'A light ascending grace note approaching the target from below.' },
    { name: 'Pratyahat', icon: 'arrow_downward',         wave: '↓',  desc: 'A light descending grace note approaching from above — mirror of Sparsh.' },
  ]

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-rose-500/10 to-pink-500/5 border border-rose-500/20 p-5">
        <p className="font-display text-lg font-light text-on-surface mb-2">Notes are just the starting point</p>
        <p className="font-sans text-sm text-on-surface-variant/70 leading-relaxed">
          In Western music, a note is a fixed pitch held for a duration. In Indian music, a note is a <em>journey</em>.
          How it moves, oscillates, slides, and snaps — that's called a <strong className="text-on-surface/85">gamaka</strong>. Two musicians playing the same notes without gamakas sound mechanical. With the right gamakas, they instantly sound like a raga.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {types.map(t => (
          <div key={t.name} className="flex gap-3 p-3 rounded-xl bg-surface-container-low/40 border border-outline-variant/8">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0 text-lg">
              <span className="font-display text-base text-rose-400/70">{t.wave}</span>
            </div>
            <div>
              <p className="font-sans text-sm font-semibold text-on-surface/85">{t.name}</p>
              <p className="font-sans text-[10px] text-on-surface-variant/55 leading-snug">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-surface-container-low/30 border border-outline-variant/10 p-4">
        <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40 font-bold mb-3">Example — Raga Bhairav (dawn raga)</p>
        {[
          { swara: 're',  label: 'Komal Re',  type: 'komal', gamaka: 'Andolan', desc: 'Slow oscillation — the signature sound of Bhairav\'s meditative dawn character.' },
          { swara: 'dha', label: 'Komal Dha', type: 'komal', gamaka: 'Andolan', desc: 'Also oscillates — these two andolans mirror each other across Sa, creating stillness.' },
          { swara: 'Ga',  label: 'Shuddha Ga', type: 'shuddha', gamaka: 'Meend', desc: 'Approached with a glide from komal Ga — a characteristic ascending slide.' },
        ].map(row => (
          <div key={row.swara} className="flex gap-3 items-start py-2 border-b border-outline-variant/5 last:border-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              row.type === 'komal' ? 'bg-sky-400/10' : 'bg-primary/10'
            }`}>
              <span className={`font-display text-lg font-medium ${row.type === 'komal' ? 'text-sky-300' : 'text-primary'}`}>{swaraDisplayName(row.swara)}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-sans text-xs font-semibold text-on-surface/80">{row.gamaka}</span>
                <Tag color={row.type === 'komal' ? 'sky' : 'primary'}>{row.label}</Tag>
              </div>
              <p className="font-sans text-[10px] text-on-surface-variant/55 leading-snug">{row.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChPractice() {
  const steps = [
    { num: 1, title: 'Unlock audio',       where: 'Any click',       desc: 'Click anywhere or press ▶ Play. The browser needs one user gesture before sound can play.' },
    { num: 2, title: 'Select Raga Yaman',  where: 'Left Sidebar',    desc: 'Type "Yaman" in the raga search box and click it. The Piano keys update their colour coding immediately.' },
    { num: 3, title: 'Turn on Scale Lock', where: 'Piano HUD',       desc: 'Click "Scale Locked" in the black bar above the Piano. Forbidden notes dim — you can\'t play a wrong note.' },
    { num: 4, title: 'Click Melody track', where: 'Sequencer Grid',  desc: 'Click the "Melody" label on the left side of the grid. It highlights to show it\'s the active recording track.' },
    { num: 5, title: 'Select Step 1',      where: 'Sequencer Grid',  desc: 'Click the first cell in the Melody row. It glows — this step is now selected and ready to record a note.' },
    { num: 6, title: 'Record notes',       where: 'Keyboard',        desc: 'Press A (Sa), then click Step 2 and press D (Ga), then Step 3 and press G (Pa). Build a short melody.' },
    { num: 7, title: 'Press Space to play', where: 'Keyboard shortcut', desc: 'Your loop plays on repeat. Click a filled cell to erase it. Click an empty cell then press a key to add.' },
    { num: 8, title: 'Add the drone',      where: 'Transport Rail',  desc: 'Click the ≋ Drone button. It holds Sa and Pa continuously — this grounds your melody.' },
    { num: 9, title: 'Try tabla rhythm',   where: 'Sidebar → Tabla', desc: 'Click the Tabla track. Select Step 1, press A (Dha). Step 5, press A again. Now melody + rhythm play together.' },
    { num: 10, title: 'Adjust tempo',      where: 'Transport Rail',  desc: 'Drag the Tempo slider to ~80 BPM to slow down. Slower = hear each note more clearly while learning.' },
  ]

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-secondary/5 border border-primary/20 p-4">
        <p className="font-display text-base font-light text-on-surface mb-1">Ten steps to your first composition</p>
        <p className="font-sans text-xs text-on-surface-variant/65">Follow these in order. Don't aim for perfect — aim for <em>sound coming out</em>.</p>
      </div>
      <div className="space-y-2">
        {steps.map(s => <PracticeStep key={s.num} {...s} />)}
      </div>
    </div>
  )
}

function ChTips() {
  const tips = [
    { icon: 'repeat',         title: 'One raga at a time',           desc: 'Spend at least a week with one raga. Explore its Aroha, Avaroha, Pakads, registers. Depth beats breadth.' },
    { icon: 'hearing',        title: 'Listen before you play',        desc: 'Search for a recording of a master performing the raga. Even 5 minutes of listening gives your ear a template theory can\'t.' },
    { icon: 'graphic_eq',     title: 'Always use the drone',          desc: 'Turn on the Drone button while practising. It holds Sa and Pa continuously, training your ear to hear every other note relative to root.' },
    { icon: 'speed',          title: 'Slow down the tempo',           desc: 'Set BPM to 60 or lower. Speed hides mistakes; slowness reveals the character of each note. Increase gradually once comfortable.' },
    { icon: 'stars',          title: 'Return to Vadi constantly',     desc: 'Whatever phrase you play, resolve it back to the Vadi. This one habit instantly makes your playing sound authentic.' },
    { icon: 'auto_fix_high',  title: 'Use the AI assistant',          desc: 'Ask for a beginner exercise in your current raga, or ask it to suggest a Pakad phrase to memorise. It knows every raga\'s grammar.' },
    { icon: 'psychology',     title: 'Sing what you play',            desc: 'Indian classical is built on the human voice. Even humming along connects your ear to the notes far faster than playing silently.' },
    { icon: 'calendar_month', title: '15 minutes daily beats 2 hours weekly', desc: 'Short consistent sessions build muscle memory and ear training faster than occasional long ones.' },
  ]

  const beginnerRagas = [
    { name: 'Yaman',   trad: 'Hindustani', note: 'Peaceful, evening — all 7 notes, tivra Ma gives it a bright quality' },
    { name: 'Bhupali', trad: 'Hindustani', note: 'Serene, pentatonic — only 5 notes, no black keys, great for beginners' },
    { name: 'Mohanam', trad: 'Carnatic',   note: 'Joyful, pentatonic — Carnatic equivalent of Bhupali' },
    { name: 'Bilawal', trad: 'Hindustani', note: 'Morning raga — uses the natural scale, closest to Western major' },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        {tips.map(t => (
          <div key={t.title} className="flex gap-3 p-3 rounded-xl bg-surface-container-low/40 border border-outline-variant/8">
            <div className="w-8 h-8 rounded-xl bg-lime-500/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined !text-sm text-lime-400/80">{t.icon}</span>
            </div>
            <div>
              <p className="font-sans text-xs font-semibold text-on-surface/85 mb-0.5">{t.title}</p>
              <p className="font-sans text-[10px] text-on-surface-variant/55 leading-snug">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/5 border border-primary/15 p-5">
        <p className="font-display text-base font-light text-on-surface mb-1">Ragas for beginners</p>
        <p className="font-sans text-xs text-on-surface-variant/50 mb-4">Start your journey with one of these — simple note sets, clear emotional identities.</p>
        <div className="grid grid-cols-2 gap-2">
          {beginnerRagas.map(r => (
            <div key={r.name} className="p-3 rounded-xl bg-surface-container-low/50 border border-outline-variant/10">
              <p className="font-mono text-xs font-bold text-on-surface/80">{r.name}</p>
              <Tag color="primary">{r.trad}</Tag>
              <p className="font-sans text-[10px] text-on-surface-variant/55 leading-relaxed mt-1">{r.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Chapter registry ──────────────────────────────────────────────────────────
const CHAPTER_CONTENT: Record<ChapterId, React.ReactNode> = {
  welcome:  <ChWelcome />,
  swaras:   <ChSwaras />,
  scale:    <ChScale />,
  raga:     <ChRaga />,
  vadi:     <ChVadi />,
  gamakas:  <ChGamakas />,
  practice: <ChPractice />,
  tips:     <ChTips />,
}

// ── Main component ────────────────────────────────────────────────────────────
interface LearnerGuideProps {
  open: boolean
  onClose: () => void
}

export function LearnerGuide({ open, onClose }: LearnerGuideProps) {
  const [active, setActive] = useState<ChapterId>('welcome')
  const [visited, setVisited] = useState<Set<ChapterId>>(new Set(['welcome']))
  const contentRef = useRef<HTMLDivElement>(null)

  const currentIdx = CHAPTERS.findIndex(c => c.id === active)
  const prev = currentIdx > 0 ? CHAPTERS[currentIdx - 1] : null
  const next = currentIdx < CHAPTERS.length - 1 ? CHAPTERS[currentIdx + 1] : null
  const chapter = CHAPTERS[currentIdx]

  const goTo = useCallback((id: ChapterId) => {
    setActive(id)
    setVisited(v => new Set([...v, id]))
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowRight' && next) goTo(next.id)
      if (e.key === 'ArrowLeft' && prev) goTo(prev.id)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose, next, prev, goTo])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[400] flex flex-col bg-[#08080f] animate-fade-in">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10 bg-surface-lowest/60 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-secondary/15 flex items-center justify-center">
            <span className="material-symbols-outlined !text-base text-secondary">school</span>
          </div>
          <div>
            <span className="font-display text-lg font-light text-on-surface">Learner's Guide</span>
            <span className="font-mono text-[8px] uppercase tracking-widest text-secondary/40 ml-3">Indian Classical Music</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/30">
            {currentIdx + 1} / {CHAPTERS.length}
          </span>
          <div className="hidden sm:flex items-center gap-1 font-mono text-[8px] text-on-surface-variant/30">
            <Kbd>←</Kbd><Kbd>→</Kbd> to navigate
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-outline-variant/20 bg-surface-container-high/60 text-on-surface/70 hover:text-on-surface hover:border-outline-variant/40 hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined !text-sm leading-none">close</span>
            <span className="font-mono text-[9px] uppercase tracking-widest font-bold">Close</span>
          </button>
        </div>
      </div>

      {/* ── Progress bar ─────────────────────────────────────────────────────── */}
      <div className="h-0.5 bg-surface-container-high flex-shrink-0">
        <div
          className="h-full bg-gradient-to-r from-secondary to-primary transition-all duration-500"
          style={{ width: `${((currentIdx + 1) / CHAPTERS.length) * 100}%` }}
        />
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left chapter nav */}
        <nav className="w-52 flex-shrink-0 border-r border-outline-variant/10 py-4 overflow-y-auto bg-surface-lowest/30">
          {CHAPTERS.map((c, i) => {
            const isActive = active === c.id
            const isDone = visited.has(c.id) && !isActive
            return (
              <button
                key={c.id}
                onClick={() => goTo(c.id)}
                className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-all ${
                  isActive
                    ? 'bg-secondary/10 border-r-2 border-secondary text-secondary'
                    : 'text-on-surface-variant/40 hover:text-on-surface hover:bg-white/3'
                }`}
              >
                <span className={`material-symbols-outlined !text-sm flex-shrink-0 ${
                  isActive ? 'text-secondary' : isDone ? 'text-primary/50' : 'text-on-surface-variant/25'
                }`}>
                  {isDone && !isActive ? 'check_circle' : c.icon}
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-[9px] uppercase tracking-widest font-bold truncate">{c.label}</p>
                  {isActive && (
                    <p className="font-sans text-[10px] text-secondary/50 truncate mt-0.5">{c.tagline}</p>
                  )}
                </div>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-secondary flex-shrink-0" />
                )}
              </button>
            )
          })}
        </nav>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Chapter hero */}
          <div className={`flex-shrink-0 px-8 py-6 bg-gradient-to-r ${chapter.gradient} border-b border-outline-variant/8`}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined !text-2xl text-white/70">{chapter.icon}</span>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-white/40 mb-0.5">
                  Chapter {currentIdx + 1}
                </p>
                <h1 className="font-display text-2xl font-light text-on-surface tracking-tight">{chapter.label}</h1>
                <p className="font-sans text-sm text-on-surface-variant/60">{chapter.tagline}</p>
              </div>
            </div>
          </div>

          {/* Scrollable content */}
          <div ref={contentRef} className="flex-1 overflow-y-auto px-8 py-6 scroll-thin">
            {CHAPTER_CONTENT[active]}

            {/* ── Chapter footer nav ── */}
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-outline-variant/8">
              <button
                onClick={() => prev && goTo(prev.id)}
                disabled={!prev}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/50 hover:text-on-surface border border-outline-variant/10 hover:border-outline-variant/25 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined !text-sm">arrow_back</span>
                {prev?.label}
              </button>
              <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/20">
                {currentIdx + 1} of {CHAPTERS.length}
              </span>
              {next ? (
                <button
                  onClick={() => goTo(next.id)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-[9px] uppercase tracking-widest bg-secondary/15 text-secondary border border-secondary/25 hover:bg-secondary/25 hover:border-secondary/40 transition-all"
                >
                  {next.label}
                  <span className="material-symbols-outlined !text-sm">arrow_forward</span>
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-[9px] uppercase tracking-widest bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25 transition-all"
                >
                  Back to Studio
                  <span className="material-symbols-outlined !text-sm">arrow_forward</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
