'use client'

import React, { useState, useEffect } from 'react'

// ── Section definitions ───────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'start',      label: 'Getting Started', icon: 'rocket_launch'   },
  { id: 'keys',       label: 'Keyboard Keys',   icon: 'keyboard'        },
  { id: 'sequencer',  label: 'Step Sequencer',  icon: 'grid_on'         },
  { id: 'instruments',label: 'Instruments',     icon: 'piano'           },
  { id: 'raga',       label: 'Raga System',     icon: 'menu_book'       },
  { id: 'playback',   label: 'Playback',        icon: 'play_circle'     },
  { id: 'tracks',     label: 'Tracks',          icon: 'layers'          },
] as const

type SectionId = typeof SECTIONS[number]['id']

// ── Small helper components ───────────────────────────────────────────────────
function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="font-mono text-[9px] uppercase tracking-[0.25em] text-primary/70 font-bold mb-3 mt-6 first:mt-0">
      {children}
    </h4>
  )
}

function Para({ children }: { children: React.ReactNode }) {
  return <p className="font-sans text-sm text-on-surface-variant/70 leading-relaxed mb-3">{children}</p>
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-container-high border border-outline-variant/20 font-mono text-[10px] font-bold text-primary mx-0.5">
      {children}
    </kbd>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-outline-variant/5 last:border-0">
      <span className="w-44 font-sans text-xs text-on-surface-variant/60 flex-shrink-0">{label}</span>
      <span className="font-mono text-[10px] text-on-surface/80">{children}</span>
    </div>
  )
}

function KeyGrid({ keys }: { keys: { key: string; label: string; sub?: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2 my-3">
      {keys.map(({ key, label, sub }) => (
        <div key={key} className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-xl bg-surface-container-high border border-outline-variant/15 flex items-center justify-center shadow-inner">
            <span className="font-mono text-sm font-bold text-primary">{key}</span>
          </div>
          <span className="font-mono text-[8px] font-bold text-on-surface/70 tracking-wide">{label}</span>
          {sub && <span className="font-mono text-[7px] text-on-surface-variant/40">{sub}</span>}
        </div>
      ))}
    </div>
  )
}

function Chip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase tracking-widest ${color}`}>
      {children}
    </span>
  )
}

// ── Section content ───────────────────────────────────────────────────────────
function SectionStart() {
  return (
    <>
      <Heading>Welcome to Saptaswara Studio</Heading>
      <Para>
        Saptaswara is a DAW built around Indian classical music. It lets you compose with ragas,
        play melodic instruments and percussion, record step sequences, and export MIDI — all in the browser.
      </Para>

      <Heading>First-time audio</Heading>
      <Para>
        Browsers block audio until you interact. Click any key, pad, or the <strong>Play</strong> button once —
        the audio engine initialises automatically. A subtle status indicator in the Piano HUD confirms it's live.
      </Para>

      <Heading>Basic workflow</Heading>
      <div className="space-y-3 mb-4">
        {[
          ['1', 'Pick a raga', 'Choose from the left sidebar. Use the search box or arrow keys to navigate.'],
          ['2', 'Select a track', 'Click a track name in the Step Sequencer to make it active.'],
          ['3', 'Select a step', 'Click an empty cell in the active track row to highlight it (it glows).'],
          ['4', 'Press a key or tap a pad', 'The note is recorded into that step. Clicking a filled step toggles it off.'],
          ['5', 'Hit Play', 'Press Space or the ▶ button. The loop plays back continuously.'],
          ['6', 'Export', 'Click Export MIDI in the playback rail to download your composition.'],
        ].map(([num, title, desc]) => (
          <div key={num} className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/15 text-primary font-mono text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {num}
            </div>
            <div>
              <p className="font-sans text-sm font-semibold text-on-surface/80">{title}</p>
              <p className="font-sans text-xs text-on-surface-variant/55 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <Heading>Tip</Heading>
      <Para>
        Press <Kbd>?</Kbd> at any time to open or close this guide. Pressing <Kbd>Esc</Kbd> deselects
        the active sequencer step without closing the guide.
      </Para>
    </>
  )
}

function SectionKeys() {
  return (
    <>
      {/* Piano / Melodic instruments */}
      <Heading>Piano · Harmonium · Veena · Bansuri · Sarangi · Sitar · Tambura</Heading>
      <Para>
        These melodic instruments all share the same keyboard layout. The two rows map to two octaves
        of the 12-note scale. Black-key notes (komal/tivra) use the top row; white-key notes use the home row.
      </Para>

      <div className="rounded-2xl border border-outline-variant/10 overflow-hidden mb-4">
        <div className="px-4 py-2 bg-surface-container-low/40 border-b border-outline-variant/10">
          <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/50">Octave 4 (lower)</span>
        </div>
        <div className="p-4">
          <KeyGrid keys={[
            { key: 'A', label: 'Sa',  sub: 'C4'  },
            { key: 'S', label: 'Re',  sub: 'D4'  },
            { key: 'D', label: 'Ga',  sub: 'E4'  },
            { key: 'F', label: 'Ma',  sub: 'F4'  },
            { key: 'G', label: 'Pa',  sub: 'G4'  },
            { key: 'H', label: 'Dha', sub: 'A4'  },
            { key: 'J', label: 'Ni',  sub: 'B4'  },
          ]} />
          <KeyGrid keys={[
            { key: 'W', label: 're',  sub: 'C♯4' },
            { key: 'E', label: 'ga',  sub: 'D♯4' },
            { key: 'T', label: 'ma',  sub: 'F♯4' },
            { key: 'Y', label: 'dha', sub: 'G♯4' },
            { key: 'U', label: 'ni',  sub: 'A♯4' },
          ]} />
        </div>

        <div className="px-4 py-2 bg-surface-container-low/40 border-t border-b border-outline-variant/10">
          <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/50">Octave 5 (upper)</span>
        </div>
        <div className="p-4">
          <KeyGrid keys={[
            { key: 'K', label: 'Sa',  sub: 'C5'  },
          ]} />
          <Para>Extend the upper octave by holding a note on the piano with your mouse while pressing keys.</Para>
        </div>
      </div>

      {/* Tabla / Mridangam */}
      <Heading>Tabla</Heading>
      <KeyGrid keys={[
        { key: 'A', label: 'Dha',  sub: 'Bass+Ring' },
        { key: 'S', label: 'Dhin', sub: 'Resonant'  },
        { key: 'D', label: 'Na',   sub: 'High Tone' },
        { key: 'F', label: 'Te',   sub: 'Muted'     },
        { key: 'G', label: 'Ge',   sub: 'Bass Snap' },
        { key: 'H', label: 'Ka',   sub: 'Palm Mute' },
        { key: 'J', label: 'Ti',   sub: 'Finger'    },
      ]} />

      <Heading>Mridangam</Heading>
      <KeyGrid keys={[
        { key: 'A', label: 'Thom', sub: 'Deep Roll' },
        { key: 'S', label: 'Nam',  sub: 'Rim Tone'  },
        { key: 'D', label: 'Dhi',  sub: 'Slap'      },
        { key: 'F', label: 'Tha',  sub: 'Muted'     },
      ]} />

      {/* SwaPad */}
      <Heading>Swara Pad</Heading>
      <Para>
        The Swara Pad uses the same home row. Each key plays the swara in the currently selected register
        (Mandra / Madhya / Taar). Holding a key sustains the note; releasing lets it go.
      </Para>
      <KeyGrid keys={[
        { key: 'A', label: 'Sa'  },
        { key: 'S', label: 'Re'  },
        { key: 'D', label: 'Ga'  },
        { key: 'F', label: 'Ma'  },
        { key: 'G', label: 'Pa'  },
        { key: 'H', label: 'Dha' },
        { key: 'J', label: 'Ni'  },
      ]} />

      {/* Global shortcuts */}
      <Heading>Global Studio Shortcuts</Heading>
      <div className="rounded-2xl border border-outline-variant/10 overflow-hidden">
        <Row label="Play / Pause"><Kbd>Space</Kbd></Row>
        <Row label="Next sequencer step"><Kbd>→</Kbd></Row>
        <Row label="Prev sequencer step"><Kbd>←</Kbd></Row>
        <Row label="Next track"><Kbd>↓</Kbd></Row>
        <Row label="Prev track"><Kbd>↑</Kbd></Row>
        <Row label="Delete active step"><Kbd>Delete</Kbd> or <Kbd>Backspace</Kbd></Row>
        <Row label="Deselect step"><Kbd>Esc</Kbd></Row>
        <Row label="Open / close guide"><Kbd>?</Kbd></Row>
        <Row label="Navigate raga list"><Kbd>↑</Kbd> <Kbd>↓</Kbd> <span className="text-on-surface-variant/40 ml-1">(focus raga search box)</span></Row>
      </div>
    </>
  )
}

function SectionSequencer() {
  return (
    <>
      <Heading>How the sequencer works</Heading>
      <Para>
        The Step Sequencer is a grid where each row is a track and each column is a time slot (step).
        When the loop plays it advances left-to-right and triggers whatever notes are recorded in each step.
      </Para>

      <Heading>Recording a note</Heading>
      <div className="space-y-2 mb-4">
        {[
          'Click a track name on the left to make it the active track (it highlights).',
          'Click an empty step cell — it glows with a ring to show it is selected.',
          'Press a keyboard key or tap an instrument pad. The note name appears in the cell.',
          'Click a filled step to erase it (toggle off). Click again to restore.',
        ].map((t, i) => (
          <div key={i} className="flex gap-3">
            <span className="font-mono text-[9px] font-bold text-primary/60 w-4 flex-shrink-0 mt-0.5">{i + 1}.</span>
            <p className="font-sans text-sm text-on-surface-variant/70 leading-relaxed">{t}</p>
          </div>
        ))}
      </div>

      <Heading>Velocity</Heading>
      <Para>
        Each step has a velocity (volume) shown as a fill bar inside the cell.
        <Kbd>Shift</Kbd>+click a filled step to cycle through four levels:
        25% → 50% → 75% → 100%.
      </Para>

      <Heading>Loop length</Heading>
      <Para>
        Choose <strong>8</strong>, <strong>16</strong>, or <strong>32</strong> steps using the buttons above the grid.
        Changing the loop length trims or pads all tracks at once.
      </Para>

      <Heading>Tala markers</Heading>
      <Para>
        Above the step grid, small markers show the rhythmic cycle (Tala). <strong>X</strong> marks the Sam
        (the downbeat), bold numbers mark Tali (stressed beats), and <strong>0</strong> marks the Khali (empty beat).
        These are visual guides only — they don't affect playback timing.
      </Para>

      <Heading>Swing</Heading>
      <Para>
        The Swing slider (in the playback rail) nudges every off-beat step slightly late, giving the loop
        a groovy, humanised feel. 0 % = straight, 50 % = maximum swing.
      </Para>
    </>
  )
}

function SectionInstruments() {
  const melodic = [
    { name: 'Piano',     tradition: 'Western',    desc: 'Bright triangle-wave piano. Clean, neutral, good for all ragas.' },
    { name: 'Veena',     tradition: 'Carnatic',   desc: 'Rich plucked string with chorus and reverb. Resonant, meditative.' },
    { name: 'Bansuri',   tradition: 'Carnatic',   desc: 'FM-synthesis flute with breathy noise layer. Airy and delicate.' },
    { name: 'Tambura',   tradition: 'Carnatic',   desc: 'Deep drone instrument with layered overtones. Works best with Drone mode.' },
    { name: 'Harmonium', tradition: 'Hindustani', desc: 'Detuned sawtooth reeds for that classic reed-organ warmth.' },
    { name: 'Sarangi',   tradition: 'Hindustani', desc: 'FM-synthesised bowed string with reverb. Expressive and wavering.' },
    { name: 'Sitar',     tradition: 'Hindustani', desc: 'Plucked string with chorus shimmer. Characteristic sympathetic ring.' },
  ]
  const percussion = [
    { name: 'Tabla',     tradition: 'Hindustani', desc: '7 unique strokes: Dha, Dhin, Na, Te, Ge, Ka, Ti. Keys A–J.' },
    { name: 'Mridangam', tradition: 'Carnatic',   desc: '4 strokes: Thom, Nam, Dhi, Tha. Keys A–D.' },
  ]

  return (
    <>
      <Heading>Switching instruments</Heading>
      <Para>
        Open the instrument dropdown in the Piano HUD (the button that shows the current instrument name).
        Instruments are grouped by tradition. Switching crossfades the audio in ~100 ms so there is no click.
      </Para>

      <Heading>Melodic instruments</Heading>
      <div className="space-y-2 mb-4">
        {melodic.map(i => (
          <div key={i.name} className="flex gap-3 py-2 border-b border-outline-variant/5 last:border-0">
            <div className="w-28 flex-shrink-0">
              <p className="font-mono text-xs font-bold text-on-surface/80">{i.name}</p>
              <Chip color="text-secondary/70 bg-secondary/10">{i.tradition}</Chip>
            </div>
            <p className="font-sans text-sm text-on-surface-variant/60 leading-relaxed">{i.desc}</p>
          </div>
        ))}
      </div>

      <Heading>Percussion instruments</Heading>
      <div className="space-y-2 mb-4">
        {percussion.map(i => (
          <div key={i.name} className="flex gap-3 py-2 border-b border-outline-variant/5 last:border-0">
            <div className="w-28 flex-shrink-0">
              <p className="font-mono text-xs font-bold text-on-surface/80">{i.name}</p>
              <Chip color="text-primary/70 bg-primary/10">{i.tradition}</Chip>
            </div>
            <p className="font-sans text-sm text-on-surface-variant/60 leading-relaxed">{i.desc}</p>
          </div>
        ))}
      </div>

      <Heading>Scale Lock</Heading>
      <Para>
        The <strong>Scale Lock</strong> toggle in the Piano HUD, when on, only lets you play notes that are in
        the selected raga. Keys outside the raga are greyed out and unclickable.
        Toggle it to <strong>Omni Mode</strong> to play all 12 notes freely.
      </Para>

      <Heading>Keyboard layouts</Heading>
      <Para>
        The layout selector above the instrument grid offers three views for melodic tracks and one for percussion:
      </Para>
      <div className="rounded-2xl border border-outline-variant/10 overflow-hidden">
        <Row label="Piano"><span>Full 2-octave keyboard with white and black keys</span></Row>
        <Row label="Harmonium"><span>Same layout, styled to match a reed organ</span></Row>
        <Row label="Swara"><span>Wide swara buttons — great for touchscreens</span></Row>
        <Row label="SwaPad"><span>7 coloured pads with ♭/♯ toggles and register selector</span></Row>
      </div>
    </>
  )
}

function SectionRaga() {
  return (
    <>
      <Heading>What is a raga?</Heading>
      <Para>
        A raga is a melodic framework in Indian classical music — a specific set of notes, rules about
        how to ascend (Aroha) and descend (Avaroha), characteristic phrases (Pakads), and emotional
        colour (Rasa). Saptaswara gives you a library of ragas from both Carnatic and Hindustani traditions.
      </Para>

      <Heading>Selecting a raga</Heading>
      <Para>
        Use the left sidebar. Type in the search box to filter by name, or use <Kbd>↑</Kbd> <Kbd>↓</Kbd>
        to navigate the list. Press <Kbd>Enter</Kbd> to confirm. The active raga highlights in the sidebar
        and the Piano keys update their colour coding immediately.
      </Para>

      <Heading>Tradition filter</Heading>
      <Para>
        The <strong>Hindustani / Carnatic</strong> toggle above the raga list filters the list to only show
        ragas from the selected tradition. It also changes the default instrument grouping shown in the
        instrument dropdown.
      </Para>

      <Heading>Piano colour coding</Heading>
      <div className="rounded-2xl border border-outline-variant/10 overflow-hidden mb-4">
        <Row label="Amber glow bar"><span>Vadi — the most important swara</span></Row>
        <Row label="Sky-blue glow bar"><span>Samvadi — the consonant partner</span></Row>
        <Row label="Small amber dot"><span>Nyasa — valid resting note</span></Row>
        <Row label="Dimmed / no dot"><span>Varjya — forbidden in this raga</span></Row>
        <Row label="Small primary dot"><span>In raga but not special</span></Row>
      </div>

      <Heading>Raga constraint</Heading>
      <Para>
        The <strong>Lock / Free</strong> toggle (next to the raga search) constrains recording: when locked,
        only notes inside the raga's Aroha + Avaroha can be recorded into the sequencer.
        Notes played on the keyboard still sound, but won't write to a step if they fall outside the raga.
      </Para>

      <Heading>Melodic Guide (Pakads)</Heading>
      <Para>
        Below the keyboard you'll find the Melodic Guide showing characteristic phrases of the selected raga.
        Click <strong>Play Blueprint</strong> to hear the Aroha and Avaroha played in sequence. This is useful
        for learning the raga's shape before composing.
      </Para>
    </>
  )
}

function SectionPlayback() {
  return (
    <>
      <Heading>Playback rail</Heading>
      <Para>
        The dark bar at the bottom of the studio contains all transport and mixing controls.
      </Para>

      <Heading>Transport</Heading>
      <div className="rounded-2xl border border-outline-variant/10 overflow-hidden mb-4">
        <Row label="▶ / ■ (Play/Stop)">Press <Kbd>Space</Kbd> or click to toggle playback.</Row>
        <Row label="Drone (≋)">Toggles a continuous Sa-Pa (or Sa-Ma) drone underneath your loop. Good for setting the tonic mood.</Row>
      </div>

      <Heading>Sliders</Heading>
      <div className="rounded-2xl border border-outline-variant/10 overflow-hidden mb-4">
        <Row label="Volume">Master volume from −40 dB (silent) to 0 dB (full).</Row>
        <Row label="Tempo">Loop speed from 60 to 180 BPM.</Row>
        <Row label="Swing">Adds rhythmic groove by delaying off-beats. 0 % = straight, 50 % = heavy swing.</Row>
      </div>

      <Heading>Recording</Heading>
      <Para>
        Click <strong>Rec</strong> to start audio recording. The button pulses. Click <strong>Stop Rec</strong>
        to finish — the browser prompts you to download a WAV file of everything the audio engine played.
      </Para>

      <Heading>Export MIDI</Heading>
      <Para>
        Click <strong>Export MIDI</strong> to download a <code>.mid</code> file of all melody track steps.
        The file uses the current BPM and velocity data. BPM must be at least 40 — if it is too low,
        the export is blocked with a warning.
      </Para>

      <Heading>Save</Heading>
      <Para>
        Click <strong>Save</strong> in the top bar to save your composition to your account. You will be
        prompted for a name. Projects can be re-opened from the Dashboard.
        You must be signed in — guest sessions cannot save.
      </Para>
    </>
  )
}

function SectionTracks() {
  return (
    <>
      <Heading>Track types</Heading>
      <div className="rounded-2xl border border-outline-variant/10 overflow-hidden mb-4">
        {[
          ['Melody',  'music_note', 'Records pitched notes from Piano, Harmonium, Swara, or SwaPad.'],
          ['Tabla',   'equalizer',  'Records tabla or mridangam strokes from the Percussion Hub.'],
          ['Vocal',   'mic',        'Placeholder track for planning vocal lines (no live recording yet).'],
          ['Bass',    'piano',      'Low-register melodic track, same input as Melody.'],
          ['Drone',   'waves',      'Sustained drone reference track.'],
          ['Pad',     'blur_on',    'Ambient texture layer.'],
        ].map(([name, , desc]) => (
          <Row key={name} label={name}><span className="text-on-surface-variant/60">{desc}</span></Row>
        ))}
      </div>

      <Heading>Adding tracks</Heading>
      <Para>
        Click <strong>+ Add Track</strong> at the bottom of the sidebar track list. Choose the track type
        from the dropdown. Each track gets its own row in the sequencer and its own volume slider.
      </Para>

      <Heading>Track controls</Heading>
      <div className="rounded-2xl border border-outline-variant/10 overflow-hidden mb-4">
        <Row label="M (Mute)">Silences the track during playback. The row dims to indicate muted state.</Row>
        <Row label="S (Solo)">Solos this track — all other tracks are silenced. Click S again to unsolo.</Row>
        <Row label="Volume slider">Shown for the active track only. Range −40 dB to 0 dB.</Row>
        <Row label="× (Remove)">Deletes the track and all its recorded steps. Only shown when {'>'} 1 track exists.</Row>
        <Row label="Double-click name">Renames the track inline. Press Enter or click away to confirm.</Row>
      </div>

      <Heading>Selecting the active track</Heading>
      <Para>
        Click a track name in the sidebar or in the sequencer label column. Pressing <Kbd>↑</Kbd> <Kbd>↓</Kbd>
        navigates between tracks when focus is on the main workspace (not in any input field).
        The active track controls which instrument layout is shown below the sequencer.
      </Para>

      <Heading>AI Assistant</Heading>
      <Para>
        The floating chat button (bottom-right) opens the AI assistant. Ask it anything about the
        current raga — theory, history, characteristic phrases, or compositional suggestions.
        It is aware of the selected raga and your current loop.
      </Para>
    </>
  )
}

const SECTION_CONTENT: Record<SectionId, React.ReactNode> = {
  start:       <SectionStart />,
  keys:        <SectionKeys />,
  sequencer:   <SectionSequencer />,
  instruments: <SectionInstruments />,
  raga:        <SectionRaga />,
  playback:    <SectionPlayback />,
  tracks:      <SectionTracks />,
}

// ── Main component ────────────────────────────────────────────────────────────
interface GuidebookProps {
  open: boolean
  onClose: () => void
}

export function Guidebook({ open, onClose }: GuidebookProps) {
  const [active, setActive] = useState<SectionId>('start')

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      // ? toggles guide — handled by parent. Esc closes it.
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-[301] w-full max-w-2xl bg-[#0d0d18] border-l border-outline-variant/15 shadow-2xl flex flex-col animate-slide-in-right">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-outline-variant/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined !text-base text-primary">auto_stories</span>
            </div>
            <div>
              <h2 className="font-display text-xl font-light text-on-surface tracking-wide">Studio Guide</h2>
              <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40">Saptaswara Reference</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-outline-variant/10 flex items-center justify-center text-on-surface-variant/40 hover:text-on-surface hover:border-outline-variant/30 transition-all"
            aria-label="Close guide"
          >
            <span className="material-symbols-outlined !text-base">close</span>
          </button>
        </div>

        {/* Body — sidebar + content */}
        <div className="flex flex-1 overflow-hidden">

          {/* Nav sidebar */}
          <nav className="w-48 flex-shrink-0 border-r border-outline-variant/10 py-4 overflow-y-auto">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`w-full flex items-center gap-2.5 px-5 py-2.5 text-left transition-all ${
                  active === s.id
                    ? 'text-primary bg-primary/8 border-r-2 border-primary'
                    : 'text-on-surface-variant/50 hover:text-on-surface hover:bg-white/3'
                }`}
              >
                <span className={`material-symbols-outlined !text-sm ${active === s.id ? 'text-primary' : 'text-on-surface-variant/30'}`}>
                  {s.icon}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest font-bold whitespace-nowrap">
                  {s.label}
                </span>
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6 scroll-thin">
            {SECTION_CONTENT[active]}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-3 border-t border-outline-variant/10 flex items-center justify-between flex-shrink-0">
          <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/30">
            Press <Kbd>?</Kbd> to toggle · <Kbd>Esc</Kbd> to close
          </span>
          <span className="font-mono text-[8px] uppercase tracking-widest text-primary/30">
            Saptaswara v1
          </span>
        </div>
      </div>
    </>
  )
}
