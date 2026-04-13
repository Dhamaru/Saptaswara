'use client'

import React, { useState, useEffect } from 'react'

// ── Chapter definitions ───────────────────────────────────────────────────────
const CHAPTERS = [
  { id: 'welcome',  label: 'Welcome',        icon: 'waving_hand'     },
  { id: 'swaras',   label: 'The 7 Swaras',   icon: 'music_note'      },
  { id: 'scale',    label: 'Scale & Octave',  icon: 'straighten'      },
  { id: 'raga',     label: 'What is a Raga?', icon: 'menu_book'       },
  { id: 'vadi',     label: 'Vadi & Samvadi',  icon: 'stars'           },
  { id: 'practice', label: 'Your First Loop', icon: 'play_lesson'     },
  { id: 'tips',     label: 'Student Tips',    icon: 'lightbulb'       },
] as const

type ChapterId = typeof CHAPTERS[number]['id']

// ── Small helpers ─────────────────────────────────────────────────────────────
function H1({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-2xl font-light text-on-surface mb-1 leading-snug">{children}</h2>
}

function Sub({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[9px] uppercase tracking-widest text-primary/60 mb-5">{children}</p>
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="font-sans text-sm text-on-surface-variant/75 leading-relaxed mb-3">{children}</p>
}

function B({ children }: { children: React.ReactNode }) {
  return <strong className="text-on-surface/90 font-semibold">{children}</strong>
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-4 rounded-2xl bg-primary/8 border border-primary/15 mb-4">
      <span className="material-symbols-outlined !text-base text-primary flex-shrink-0 mt-0.5">tips_and_updates</span>
      <p className="font-sans text-sm text-on-surface-variant/80 leading-relaxed">{children}</p>
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-4 rounded-2xl bg-secondary/8 border border-secondary/15 mb-4">
      <span className="material-symbols-outlined !text-base text-secondary flex-shrink-0 mt-0.5">school</span>
      <p className="font-sans text-sm text-on-surface-variant/80 leading-relaxed">{children}</p>
    </div>
  )
}

function SwaraChip({
  swara, fullName, semitone, isBlack, isSpecial,
}: {
  swara: string; fullName: string; semitone: string; isBlack?: boolean; isSpecial?: boolean
}) {
  return (
    <div className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-2xl border text-center min-w-[64px] ${
      isSpecial
        ? 'bg-amber-400/10 border-amber-400/30'
        : isBlack
        ? 'bg-surface-container-high border-outline-variant/15'
        : 'bg-surface-container-low border-outline-variant/10'
    }`}>
      <span className={`font-display text-xl font-medium ${isSpecial ? 'text-amber-300' : 'text-on-surface/90'}`}>
        {swara}
      </span>
      <span className="font-sans text-[10px] text-on-surface-variant/55 leading-tight">{fullName}</span>
      <span className="font-mono text-[8px] text-primary/50">{semitone}</span>
    </div>
  )
}

function StepBox({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex gap-3 p-4 rounded-2xl bg-surface-container-low/50 border border-outline-variant/10 mb-3">
      <div className="w-7 h-7 rounded-full bg-primary/15 text-primary font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
        {num}
      </div>
      <div>
        <p className="font-sans text-sm font-semibold text-on-surface/85 mb-0.5">{title}</p>
        <p className="font-sans text-xs text-on-surface-variant/60 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

/** Safe parser for DoThis step strings — handles <strong> and <kbd> only */
function parseStep(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const re = /<(strong|kbd)>(.*?)<\/\1>/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const [, tag, inner] = match
    if (tag === 'strong') {
      nodes.push(<strong key={match.index} className="text-on-surface/90 font-semibold">{inner}</strong>)
    } else {
      nodes.push(
        <kbd key={match.index} className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-surface-container-high border border-outline-variant/20 font-mono text-[9px] font-bold text-primary mx-0.5">
          {inner}
        </kbd>
      )
    }
    last = match.index + match[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

/** "Try it now" callout — shows exactly where to click / what to press in the app */
function DoThis({ title = 'Try it now', steps }: { title?: string; steps: string[] }) {
  return (
    <div className="rounded-2xl bg-secondary/8 border border-secondary/25 p-4 mb-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined !text-sm text-secondary">touch_app</span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-secondary font-bold">{title}</span>
      </div>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="font-mono text-[9px] font-bold text-secondary/60 w-4 flex-shrink-0 mt-0.5">{i + 1}.</span>
            <p className="font-sans text-xs text-on-surface-variant/75 leading-relaxed">{parseStep(s)}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ── Chapter content ───────────────────────────────────────────────────────────
function ChWelcome() {
  return (
    <>
      <H1>Welcome, Learner</H1>
      <Sub>A gentle introduction to Indian classical music and Saptaswara Studio</Sub>

      <P>
        You've opened one of the most ancient and expressive musical traditions in the world.
        Indian classical music is built on <B>ragas</B> — melodic frameworks that carry emotion,
        season, and time of day into every note. This guide walks you through every part of the app step by step.
      </P>

      {/* App layout map */}
      <div className="rounded-3xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/15 p-5 mb-5">
        <h3 className="font-display text-base font-light text-on-surface mb-3">The studio has 4 zones</h3>
        <div className="space-y-2.5">
          {[
            { icon: 'view_sidebar',  label: 'Left Sidebar',    desc: 'Tracks list, Raga selector, and tradition filter. This is where you pick your raga and manage layers.' },
            { icon: 'grid_on',       label: 'Main Workspace',  desc: 'Step Sequencer grid at the top, instrument keyboard (Piano / SwaPad / DrumPad) below it.' },
            { icon: 'horizontal_rule', label: 'Playback Rail', desc: 'The dark bar at the bottom — Play, Stop, Drone, Volume, Tempo, Swing, Rec, and Export MIDI.' },
            { icon: 'auto_fix_high', label: 'AI Assistant',    desc: 'The glowing round button at the bottom-right. Opens a chat window for raga guidance.' },
          ].map(z => (
            <div key={z.label} className="flex gap-3">
              <span className="material-symbols-outlined !text-sm text-primary/60 flex-shrink-0 mt-0.5">{z.icon}</span>
              <div>
                <p className="font-sans text-xs font-semibold text-on-surface/80">{z.label}</p>
                <p className="font-sans text-xs text-on-surface-variant/60 leading-relaxed">{z.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <DoThis title="Orient yourself in the app" steps={[
        'Look at the <strong>top bar (HUD)</strong> — it shows the active raga name, tradition badge, instrument, and tempo.',
        'On the <strong>top-right</strong> you will find: <strong>Save</strong>, <strong>Learn</strong> (this guide), and <strong>?</strong> (Studio Reference).',
        'The <strong>glowing FAB button</strong> at the bottom-right is the AI Raga Assistant — click it now to open the chat.',
        'On the <strong>left sidebar</strong> find the raga search box and the Hindustani / Carnatic toggle. Try switching traditions.',
        'At the <strong>bottom</strong> of the screen is the Playback Rail. Press the large <strong>▶ play button</strong> or hit <kbd>Space</kbd> on your keyboard.',
      ]} />

      <div className="rounded-2xl bg-gradient-to-br from-primary/8 to-transparent border border-primary/15 p-5 mb-4">
        <h3 className="font-display text-base font-light text-on-surface mb-3">What you will learn</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            ['music_note',  'The names of the 7 basic notes (Swaras)'],
            ['straighten',  'How octaves and semitones work'],
            ['menu_book',   'What makes a raga different from a scale'],
            ['stars',       'Why some notes are more important than others'],
            ['piano',       'How to play your first loop in the studio'],
            ['lightbulb',   'Daily practice habits that actually work'],
          ].map(([icon, text]) => (
            <div key={text} className="flex items-center gap-2">
              <span className="material-symbols-outlined !text-sm text-primary/60">{icon}</span>
              <span className="font-sans text-xs text-on-surface-variant/70">{text}</span>
            </div>
          ))}
        </div>
      </div>

      <Tip>
        Use the chapters on the left to move at your own pace. The <strong>AI Assistant</strong> (bottom-right glowing button)
        can answer any question along the way — switch it to <strong>Learn mode</strong> (the school icon in the chat header)
        for beginner-friendly explanations.
      </Tip>

      <Note>
        Indian classical music has two main traditions: <strong>Hindustani</strong> (North India) and
        <strong> Carnatic</strong> (South India). They share the same note system but different ragas and styles.
        Switch between them with the <strong>Hindustani / Carnatic</strong> toggle in the left sidebar.
      </Note>
    </>
  )
}

function ChSwaras() {
  const swaras = [
    { s: 'Sa',  full: 'Shadja',     semi: 'C',   black: false, special: true  },
    { s: 're',  full: 'Komal Re',   semi: 'C♯',  black: true,  special: false },
    { s: 'Re',  full: 'Shuddha Re', semi: 'D',   black: false, special: false },
    { s: 'ga',  full: 'Komal Ga',   semi: 'D♯',  black: true,  special: false },
    { s: 'Ga',  full: 'Shuddha Ga', semi: 'E',   black: false, special: false },
    { s: 'Ma',  full: 'Shuddha Ma', semi: 'F',   black: false, special: false },
    { s: 'ma',  full: 'Tivra Ma',   semi: 'F♯',  black: true,  special: false },
    { s: 'Pa',  full: 'Panchama',   semi: 'G',   black: false, special: true  },
    { s: 'dha', full: 'Komal Dha',  semi: 'G♯',  black: true,  special: false },
    { s: 'Dha', full: 'Shuddha Dha',semi: 'A',   black: false, special: false },
    { s: 'ni',  full: 'Komal Ni',   semi: 'A♯',  black: true,  special: false },
    { s: 'Ni',  full: 'Shuddha Ni', semi: 'B',   black: false, special: false },
  ]

  return (
    <>
      <H1>The 7 Swaras (Notes)</H1>
      <Sub>Sa Re Ga Ma Pa Dha Ni — the foundation of all Indian music</Sub>

      <P>
        Indian music uses <B>7 base notes</B> called <B>Swaras</B>. You've probably heard "Do Re Mi" from
        Western music — Swaras are the Indian equivalent, but older and more nuanced.
      </P>

      <div className="grid grid-cols-7 gap-1.5 mb-5">
        {['Sa','Re','Ga','Ma','Pa','Dha','Ni'].map((s, i) => (
          <div key={s} className={`h-16 rounded-2xl flex items-center justify-center border ${
            i === 0 || i === 4
              ? 'bg-amber-400/15 border-amber-400/30'
              : 'bg-surface-container-low border-outline-variant/10'
          }`}>
            <span className={`font-display text-xl font-medium ${i === 0 || i === 4 ? 'text-amber-300' : 'text-on-surface/80'}`}>
              {s}
            </span>
          </div>
        ))}
      </div>

      <Tip>
        <strong>Sa</strong> and <strong>Pa</strong> (highlighted in gold) are called <strong>Achala Swaras</strong> — the
        "fixed" or "immovable" notes. Every other swara has flat (komal) and sometimes sharp (tivra) variants.
        That's how 7 base notes become 12 distinct pitches.
      </Tip>

      <P>All 12 pitches — the 7 base notes plus their variants:</P>
      <div className="flex flex-wrap gap-2 mb-5">
        {swaras.map(s => (
          <SwaraChip key={s.s} swara={s.s} fullName={s.full} semitone={s.semi} isBlack={s.black} isSpecial={s.special} />
        ))}
      </div>

      <div className="rounded-2xl border border-outline-variant/10 overflow-hidden mb-4">
        <div className="px-5 py-2 bg-surface-container-low/40 border-b border-outline-variant/10">
          <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/40">Notation rules</span>
        </div>
        {[
          ['Uppercase',  'Shuddha (natural) note — e.g., Re, Ga, Dha, Ni, Ma'],
          ['Lowercase',  'Komal (flat) note — e.g., re, ga, dha, ni'],
          ['Lowercase ma','Tivra Ma — the only sharp (raised) note'],
          ["Sa' or Sa^", 'Higher octave — add a tick or caret after the name'],
          ['.Sa or ,Sa',  'Lower octave — add a dot or comma before the name'],
        ].map(([sym, desc]) => (
          <div key={sym} className="flex items-start gap-3 px-5 py-2.5 border-b border-outline-variant/5 last:border-0">
            <span className="font-mono text-xs font-bold text-primary/80 w-28 flex-shrink-0">{sym}</span>
            <span className="font-sans text-xs text-on-surface-variant/65">{desc}</span>
          </div>
        ))}
      </div>

      <DoThis title="Hear every swara on the Piano" steps={[
        'Scroll down past the Step Sequencer until you see the <strong>Piano keyboard</strong>.',
        'Make sure the <strong>Melody track</strong> is selected in the sidebar (it should be highlighted).',
        'Press <kbd>A</kbd> on your keyboard — this is <strong>Sa</strong>, the root note. Hold it and listen.',
        'Press <kbd>S</kbd> for Re, <kbd>D</kbd> for Ga, <kbd>F</kbd> for Ma, <kbd>G</kbd> for Pa, <kbd>H</kbd> for Dha, <kbd>J</kbd> for Ni.',
        'Press <kbd>K</kbd> — this is Sa one octave higher. Notice how it sounds "the same but brighter".',
        'For komal (flat) notes, use the top row: <kbd>W</kbd>=re, <kbd>E</kbd>=ga, <kbd>T</kbd>=ma, <kbd>Y</kbd>=dha, <kbd>U</kbd>=ni.',
        'Each key letter is shown at the bottom of the corresponding piano key for reference.',
      ]} />

      <Note>
        In Saptaswara, you will see these note names on the Piano keys and in the SwaPad. The AI assistant
        will always use this notation when suggesting melodic patterns. Get familiar with it — it is the
        language of Indian music notation.
      </Note>
    </>
  )
}

function ChScale() {
  return (
    <>
      <H1>Scales & Octaves</H1>
      <Sub>How notes are organised in space and pitch</Sub>

      <P>
        An <B>octave</B> is a doubling of frequency. If Sa is at 261 Hz, the next Sa up is at 522 Hz —
        exactly twice as fast, but it feels like the "same" note in a higher voice. This is why the swara
        cycle repeats — Sa Re Ga Ma Pa Dha Ni, then back to Sa.
      </P>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { name: 'Mandra', label: 'Low', desc: 'The deep register — the chest voice range. Played in octave 3 in Saptaswara.', color: 'bg-violet-500/10 border-violet-500/20 text-violet-400' },
          { name: 'Madhya', label: 'Middle', desc: 'The natural singing range — where you will spend most of your time. Octave 4.', color: 'bg-primary/10 border-primary/20 text-primary' },
          { name: 'Taar',   label: 'High', desc: 'The upper register — bright and intense. Octave 5 and above.', color: 'bg-amber-400/10 border-amber-400/20 text-amber-300' },
        ].map(r => (
          <div key={r.name} className={`rounded-2xl border p-4 ${r.color.split(' ').slice(0,2).join(' ')}`}>
            <p className={`font-mono text-[9px] uppercase tracking-widest font-bold mb-1 ${r.color.split(' ')[2]}`}>{r.label}</p>
            <p className="font-display text-xl font-light text-on-surface mb-2">{r.name}</p>
            <p className="font-sans text-xs text-on-surface-variant/60 leading-relaxed">{r.desc}</p>
          </div>
        ))}
      </div>

      <Tip>
        In Saptaswara's SwaPad, use the <strong>Mandra / Madhya / Taar</strong> buttons to change register.
        Beginners should start in Madhya — it is the most natural and is default.
      </Tip>

      <P>
        Within a single octave, there are <B>12 pitches</B> (7 natural + 5 altered). Not every raga uses
        all 12 — most use only 5 to 7 specific ones. That selection is what makes each raga unique.
      </P>

      <DoThis title="Explore registers with SwaPad" steps={[
        'In the sidebar, click <strong>+ Add Track</strong> if you only have Melody — or simply use the Melody track.',
        'Scroll down to the instrument section. If you see a Piano keyboard, look for the layout buttons above it.',
        'Switch to the <strong>SwaPad</strong> layout — you will see 7 large coloured pads labelled Sa Re Ga Ma Pa Dha Ni.',
        'In the top-right of the SwaPad, find the <strong>Mandra / Madhya / Taar</strong> buttons. Click <strong>Mandra</strong>.',
        'Press <kbd>A</kbd> (Sa) and listen — it is a deep, low note.',
        'Click <strong>Madhya</strong> and press <kbd>A</kbd> again — same Sa, but in the natural singing range.',
        'Click <strong>Taar</strong> and press <kbd>A</kbd> — now it sounds high and bright. Same note, three different octaves.',
        'Switch back to <strong>Madhya</strong> — this is the register you will use most often.',
      ]} />

      <Note>
        Western music calls these 12 pitches a "chromatic scale." Indian music does not use that term —
        instead, the full set of 12 is called the <strong>Saptak</strong> (from "sapta" = seven, because
        the 7 base swaras define the skeleton).
      </Note>
    </>
  )
}

function ChRaga() {
  return (
    <>
      <H1>What is a Raga?</H1>
      <Sub>A melodic framework — not just a scale, but a living entity</Sub>

      <P>
        A <B>raga</B> is far more than a scale. It is a precise set of rules about which notes to use,
        how to move between them, which notes to emphasise, what emotion it should evoke, what time of
        day it belongs to, and even what season it suits.
      </P>
      <P>
        Think of a raga as a personality. Two ragas can share the same notes but sound completely
        different because of how those notes are approached, ornated, and lingered upon.
      </P>

      <div className="rounded-3xl bg-gradient-to-br from-secondary/8 to-primary/8 border border-secondary/15 p-6 mb-5">
        <h3 className="font-display text-base font-light text-on-surface mb-4">Elements of a Raga</h3>
        <div className="space-y-3">
          {[
            ['Aroha',    'The ascending pattern — how you go up from low Sa to high Sa. Not always in strict order.'],
            ['Avaroha',  'The descending pattern — how you come back down. Often different from Aroha.'],
            ['Vadi',     'The most important swara — the "king" note. Always return to it; it defines the raga\'s character.'],
            ['Samvadi',  'The second most important swara — the "minister." Works as a counterpoint to Vadi.'],
            ['Pakad',    'A signature phrase — a short melodic fingerprint that identifies this raga immediately.'],
            ['Rasa',     'The emotional colour — devotion, romance, courage, peace, longing. Each raga has its own.'],
            ['Time',     'Traditional time of day — dawn, midday, evening, night. Playing a raga at its prescribed time deepens its effect.'],
          ].map(([term, desc]) => (
            <div key={term} className="flex gap-3">
              <span className="font-mono text-xs font-bold text-primary/80 w-20 flex-shrink-0 pt-0.5">{term}</span>
              <p className="font-sans text-xs text-on-surface-variant/70 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <Tip>
        Select any raga in the left sidebar and look at the Piano keys — they will glow with colour coding
        showing the Vadi (amber) and Samvadi (blue). The Melodic Guide section below the keyboard shows
        the actual Pakads (signature phrases) for that raga.
      </Tip>

      <DoThis title="Select a raga and explore its structure" steps={[
        'In the <strong>left sidebar</strong>, find the Raga section. Use the <strong>search box</strong> to type "Yaman".',
        'Click <strong>Yaman</strong> — the Piano keys will immediately update their colour coding.',
        'Scroll down and look at the Piano. Notice the <strong>amber glow bar</strong> on one key — that is the Vadi.',
        'A <strong>blue glow bar</strong> on another key marks the Samvadi.',
        'Scroll further down past the keyboard to find the <strong>Melodic Guide</strong> section.',
        'Click <strong>Play Blueprint</strong> — listen to the raga\'s Aroha (ascending) and Avaroha (descending) played automatically.',
        'Now try typing "Bhairav" in the search — notice how the colour coding on the Piano completely changes. A different personality.',
        'Use <kbd>↑</kbd> <kbd>↓</kbd> arrow keys while the search box is focused to navigate the raga list quickly.',
      ]} />

      <Note>
        There are hundreds of ragas — over 300 in common use across both traditions. You do not need to learn
        them all. Start with one raga, practise it deeply, and let it reveal itself over time. Classical musicians
        often spend months on a single raga.
      </Note>
    </>
  )
}

function ChVadi() {
  return (
    <>
      <H1>Vadi & Samvadi</H1>
      <Sub>The hierarchy of notes — why some notes matter more than others</Sub>

      <P>
        Every note in a raga does not have equal importance. Indian classical theory describes a <B>hierarchy</B>:
        some notes are the pillars of a raga, others are passing tones, and some are forbidden entirely.
      </P>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          {
            title: 'Vadi',
            subtitle: 'The King',
            desc: 'The most important, frequently used note. A raga begins, rests on, and returns to its Vadi constantly. If you emphasise any single note, emphasise this one.',
            color: 'bg-amber-400/10 border-amber-400/25',
            text: 'text-amber-300',
            icon: 'grade',
          },
          {
            title: 'Samvadi',
            subtitle: 'The Minister',
            desc: 'The second most important note. It is usually a fourth or fifth away from the Vadi, creating a natural harmonic tension and resolution with it.',
            color: 'bg-sky-400/10 border-sky-400/25',
            text: 'text-sky-300',
            icon: 'supervised_user_circle',
          },
          {
            title: 'Anuvadi',
            subtitle: 'Supporting Notes',
            desc: 'All other allowed notes of the raga. They are used freely but without the special emphasis given to Vadi and Samvadi.',
            color: 'bg-primary/10 border-primary/20',
            text: 'text-primary/80',
            icon: 'people',
          },
          {
            title: 'Varjya',
            subtitle: 'Forbidden Notes',
            desc: 'Notes explicitly excluded from this raga. Playing them breaks the raga\'s grammar. In Saptaswara, these are shown dimmed on the Piano keyboard.',
            color: 'bg-error/10 border-error/20',
            text: 'text-error/70',
            icon: 'block',
          },
        ].map(c => (
          <div key={c.title} className={`rounded-2xl border p-4 ${c.color}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`material-symbols-outlined !text-base ${c.text}`}>{c.icon}</span>
              <div>
                <p className={`font-mono text-[9px] uppercase tracking-widest font-bold ${c.text}`}>{c.title}</p>
                <p className="font-sans text-[10px] text-on-surface-variant/50">{c.subtitle}</p>
              </div>
            </div>
            <p className="font-sans text-xs text-on-surface-variant/65 leading-relaxed">{c.desc}</p>
          </div>
        ))}
      </div>

      <Tip>
        When composing, start your phrase on or near the Vadi, move through the anuvadis, and resolve
        back to the Vadi or Sa. This simple structure already sounds like authentic raga improvisation.
        The AI Assistant can suggest specific Vadi-centred phrases for any raga you select.
      </Tip>

      <P>
        <B>Nyasa swaras</B> are valid resting points — notes where a phrase feels natural to pause or hold.
        They are shown with a small dot on the Piano. Use them as landing points in your melodies.
      </P>

      <DoThis title="Read Vadi & Samvadi on the Piano" steps={[
        'Select <strong>Yaman</strong> from the raga list (search in the left sidebar).',
        'Look at the Piano keyboard — find the key with an <strong>amber (gold) bar</strong> at the top. That is Ga — the Vadi of Yaman.',
        'Find the key with a <strong>blue bar</strong> — that is Ni, the Samvadi.',
        'Press the Vadi key (<kbd>D</kbd> for Ga in octave 4). Hold it for 2 seconds. Notice how it feels like the most "settled" note.',
        'Now in the Piano HUD (above the keyboard), click <strong>"Scale Locked"</strong>. The forbidden keys (Varjya) turn grey and become unclickable.',
        'Try pressing a grey key — nothing happens. Scale Lock protects you from playing outside the raga.',
        'Open the <strong>AI Assistant</strong> (bottom-right FAB). Click <strong>Learn mode</strong> (school icon in chat header).',
        'Ask: "How do I use the Vadi in Yaman?" — the assistant will give you a specific practice phrase.',
      ]} />

      <Tip>
        The AI Assistant's <strong>book icon</strong> (in the chat header) shows a Raga Summary panel with Vadi, Samvadi,
        Aroha, Avaroha, and Pakad — all without leaving the conversation.
      </Tip>

      <Note>
        In Raga Bhairav, Sa is Vadi and Pa is Samvadi. In Raga Yaman, Ga is Vadi and Ni is Samvadi.
        Ask the AI assistant "What is the Vadi of [raga name] and how should I use it?" for specific
        practice guidance on any raga.
      </Note>
    </>
  )
}

function ChPractice() {
  return (
    <>
      <H1>Your First Loop</H1>
      <Sub>A step-by-step walkthrough for your first composition</Sub>

      <P>
        Follow these steps to create your first piece of music in Saptaswara. Don't worry about making
        it perfect — the goal is to feel how the studio works and hear a raga in action.
      </P>

      <StepBox num={1} title="Unlock audio"
        desc="Click anywhere on the screen or press the ▶ Play button in the bottom rail. The browser needs one user gesture before it can play sound." />
      <StepBox num={2} title="Select Yaman from the raga list"
        desc='In the left sidebar, type "Yaman" in the search box and click it. The tradition toggle should be set to Hindustani. The Piano keys immediately update with colour coding.' />
      <StepBox num={3} title='Turn on Scale Lock'
        desc='Find the Piano keyboard below the Step Sequencer. In the black HUD bar above it, click the "Scale Locked" button. Forbidden notes dim — you cannot play a wrong note.' />
      <StepBox num={4} title="Click Melody in the Step Sequencer"
        desc='Look at the Step Sequencer grid. On the left side you see track labels — click "Melody". It highlights, showing it is the active recording track.' />
      <StepBox num={5} title="Select Step 1"
        desc="Click the very first cell in the Melody row. It glows with a ring — this step is now selected and ready to record." />
      <StepBox num={6} title="Press keyboard keys to record notes"
        desc="Press A on your keyboard to record Sa. The note name appears in the cell. Click Step 2, press D (Ga). Click Step 3, press G (Pa). Build a short melody." />
      <StepBox num={7} title="Press Space to hear your loop"
        desc="Press Space or click the ▶ Play button. Your loop plays on repeat. To erase a note, click its filled cell. To add more, click an empty cell then press a key." />
      <StepBox num={8} title="Add a drone"
        desc='In the Playback Rail (bottom bar), click the ≋ Drone button (next to Play). It holds Sa and Pa continuously — this grounds your melody and makes it sound fuller.' />
      <StepBox num={9} title="Add tabla rhythm"
        desc='In the left sidebar, click the "Tabla" track. Select Step 1, press A (Dha). Select Step 5, press A again. Press Space — you now have melody + rhythm playing together.' />
      <StepBox num={10} title="Adjust tempo"
        desc='In the Playback Rail, drag the Tempo slider left to slow down (try 80 BPM) or right to speed up. Slower lets you hear each note more clearly while learning.' />

      <DoThis title="Control all the knobs" steps={[
        '<strong>Volume slider</strong> (Playback Rail, left): drag left to reduce master volume, right to increase.',
        '<strong>Swing slider</strong> (Playback Rail, right of Tempo): adds rhythmic groove — try 20–30% for a natural feel.',
        '<strong>Shift+click</strong> a filled step cell to cycle its velocity (loudness): 25% → 50% → 75% → 100%.',
        '<strong>M button</strong> on a track (in sidebar) mutes that track. <strong>S button</strong> solos it (silences all others).',
        '<strong>Volume slider per track</strong>: click a track to activate it, then drag its small volume slider below.',
        'Press <kbd>Delete</kbd> or <kbd>Backspace</kbd> to clear the currently selected step.',
        'Press <kbd>←</kbd> <kbd>→</kbd> arrows to move between steps. Press <kbd>↑</kbd> <kbd>↓</kbd> to switch tracks.',
      ]} />

      <Tip>
        Click <strong>Play Blueprint</strong> (below the keyboard) to hear the raga's Aroha and Avaroha automatically.
        Then recreate those notes in your loop — you will already be playing raga-correct music.
      </Tip>

      <Note>
        Click <strong>Save</strong> in the top bar to save your composition to your account (sign-in required).
        Click <strong>Export MIDI</strong> in the Playback Rail to download a .mid file you can open in any DAW.
      </Note>
    </>
  )
}

function ChTips() {
  return (
    <>
      <H1>Student Tips</H1>
      <Sub>Habits and insights that will accelerate your learning</Sub>

      <P>Learning Indian classical music is a long journey — but these practices will make every session count.</P>

      <div className="space-y-3 mb-5">
        {[
          {
            icon: 'repeat',
            title: 'One raga at a time',
            desc: 'Resist the urge to jump between ragas. Spend at least a week with one raga. Explore its Aroha, Avaroha, Pakads, and different registers. Depth beats breadth in Indian music.',
          },
          {
            icon: 'hearing',
            title: 'Listen before you play',
            desc: 'Before composing in a raga, search for a recording of a master performing it. Even 5 minutes of listening gives your ear a template that no amount of theory can replace.',
          },
          {
            icon: 'graphic_eq',
            title: 'Always use the drone',
            desc: 'Turn on the Drone button in the playback rail while practising. The drone holds Sa and Pa continuously, training your ear to hear every other note in relation to the root.',
          },
          {
            icon: 'speed',
            title: 'Slow down the tempo',
            desc: 'Set BPM to 60 or lower when first exploring a raga. Speed hides mistakes; slowness reveals the character of each note. Once a phrase feels comfortable, gradually increase tempo.',
          },
          {
            icon: 'stars',
            title: 'Return to Vadi constantly',
            desc: 'Whatever phrase you play, end it on or near the Vadi swara. This is the single most important habit in raga-based improvisation. It gives your phrases a sense of home and purpose.',
          },
          {
            icon: 'auto_fix_high',
            title: 'Use the AI assistant',
            desc: 'Ask the Raga Assistant for a beginner exercise in the raga you\'re studying. Ask it to explain why a phrase sounds good, or to give you a Pakad to memorise. It knows the grammar of every raga.',
          },
          {
            icon: 'psychology',
            title: 'Sing what you play',
            desc: 'Indian classical tradition is built on the human voice. Even if you can\'t sing well, hum along as you press keys. This connects your ear to the notes far faster than playing silently.',
          },
          {
            icon: 'calendar_month',
            title: 'Short daily sessions beat long occasional ones',
            desc: '15 minutes every day builds muscle memory and ear training faster than 2 hours on weekends. Even just playing the Aroha of one raga daily will solidify it in a week.',
          },
        ].map(t => (
          <div key={t.title} className="flex gap-3 p-4 rounded-2xl bg-surface-container-low/40 border border-outline-variant/10">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined !text-base text-primary">{t.icon}</span>
            </div>
            <div>
              <p className="font-sans text-sm font-semibold text-on-surface/85 mb-0.5">{t.title}</p>
              <p className="font-sans text-xs text-on-surface-variant/60 leading-relaxed">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <DoThis title="Use all your tools effectively" steps={[
        '<strong>AI Assistant</strong>: click the glowing FAB (bottom-right). Enable <strong>Learn mode</strong> (school icon in chat header) for simple explanations. Click the <strong>book icon</strong> to see the Raga Summary (Vadi, Samvadi, Aroha, Pakad) without typing anything.',
        '<strong>Instrument switching</strong>: in the Piano HUD, click the instrument name dropdown. Try Veena or Bansuri to hear the same notes with a different timbre.',
        '<strong>Layout switching</strong>: try the SwaPad layout — 7 large coloured pads are easier to hit than piano keys. Use A–J keyboard shortcuts, and toggle ♭/♯ below each pad for komal/tivra variants.',
        '<strong>Percussion</strong>: click the Tabla track, then scroll down — the DrumPad appears. Keys A–J trigger Tabla strokes. Switch to Mridangam with the toggle in the DrumPad header.',
        '<strong>Raga constraint</strong>: the Lock/Free toggle (next to the raga search in sidebar) prevents recording notes outside the raga. Turn it on while composing to stay raga-correct.',
        '<strong>Melodic Guide</strong>: scroll below the keyboard to find signature phrases (Pakads). Click Play Blueprint to hear the raga\'s shape, then copy those phrases into your loop.',
        '<strong>Studio Guide</strong>: click <strong>?</strong> in the top-right for a full technical reference of every button and shortcut.',
        '<strong>Keyboard shortcut summary</strong>: <kbd>Space</kbd>=Play/Stop · <kbd>→←</kbd>=Next/Prev step · <kbd>↑↓</kbd>=Switch track · <kbd>Del</kbd>=Clear step · <kbd>Esc</kbd>=Deselect.',
      ]} />

      <div className="rounded-3xl bg-gradient-to-br from-primary/10 to-secondary/8 border border-primary/15 p-6">
        <h3 className="font-display text-lg font-light text-on-surface mb-2">Ragas for beginners</h3>
        <p className="font-sans text-xs text-on-surface-variant/60 mb-4 leading-relaxed">
          Start your journey with one of these — they have simple note sets and clear emotional identities.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'Yaman',    trad: 'Hindustani', note: 'Peaceful, evening — uses all 7 notes but with tivra Ma' },
            { name: 'Bhupali',  trad: 'Hindustani', note: 'Serene, pentatonic — only 5 notes, no black keys' },
            { name: 'Mohanam',  trad: 'Carnatic',   note: 'Joyful, pentatonic — equivalent to Bhupali' },
            { name: 'Bilawal',  trad: 'Hindustani', note: 'Morning raga — uses the natural scale, closest to major' },
          ].map(r => (
            <div key={r.name} className="p-3 rounded-2xl bg-surface-container-low/50 border border-outline-variant/10">
              <p className="font-mono text-xs font-bold text-on-surface/80">{r.name}</p>
              <p className="font-mono text-[8px] text-secondary/70 uppercase tracking-widest mb-1">{r.trad}</p>
              <p className="font-sans text-[10px] text-on-surface-variant/55 leading-relaxed">{r.note}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

const CHAPTER_CONTENT: Record<ChapterId, React.ReactNode> = {
  welcome:  <ChWelcome />,
  swaras:   <ChSwaras />,
  scale:    <ChScale />,
  raga:     <ChRaga />,
  vadi:     <ChVadi />,
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

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const currentIdx = CHAPTERS.findIndex(c => c.id === active)
  const prev = currentIdx > 0 ? CHAPTERS[currentIdx - 1] : null
  const next = currentIdx < CHAPTERS.length - 1 ? CHAPTERS[currentIdx + 1] : null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-[301] w-full max-w-2xl bg-[#0b0b16] border-l border-outline-variant/15 shadow-2xl flex flex-col animate-slide-in-right">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-outline-variant/10 flex-shrink-0 bg-gradient-to-r from-secondary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-secondary/15 flex items-center justify-center">
              <span className="material-symbols-outlined !text-base text-secondary">school</span>
            </div>
            <div>
              <h2 className="font-display text-xl font-light text-on-surface tracking-wide">Learner's Guide</h2>
              <p className="font-mono text-[8px] uppercase tracking-widest text-secondary/50">Indian Classical Music · Beginner</p>
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

        {/* Progress bar */}
        <div className="h-0.5 bg-surface-container-high flex-shrink-0">
          <div
            className="h-full bg-gradient-to-r from-secondary to-primary transition-all duration-500"
            style={{ width: `${((currentIdx + 1) / CHAPTERS.length) * 100}%` }}
          />
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Nav */}
          <nav className="w-48 flex-shrink-0 border-r border-outline-variant/10 py-4 overflow-y-auto">
            {CHAPTERS.map((c, i) => {
              const done = i < currentIdx
              return (
                <button
                  key={c.id}
                  onClick={() => setActive(c.id)}
                  className={`w-full flex items-center gap-2.5 px-5 py-2.5 text-left transition-all ${
                    active === c.id
                      ? 'text-secondary bg-secondary/8 border-r-2 border-secondary'
                      : done
                      ? 'text-on-surface-variant/40 hover:text-on-surface hover:bg-white/3'
                      : 'text-on-surface-variant/40 hover:text-on-surface hover:bg-white/3'
                  }`}
                >
                  <span className={`material-symbols-outlined !text-sm ${
                    active === c.id ? 'text-secondary' : done ? 'text-primary/50' : 'text-on-surface-variant/25'
                  }`}>
                    {done && active !== c.id ? 'check_circle' : c.icon}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-widest font-bold whitespace-nowrap">
                    {c.label}
                  </span>
                </button>
              )
            })}
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6 scroll-thin">
            {CHAPTER_CONTENT[active]}
          </div>
        </div>

        {/* Footer nav */}
        <div className="px-8 py-4 border-t border-outline-variant/10 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => prev && setActive(prev.id)}
            disabled={!prev}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/50 hover:text-on-surface border border-outline-variant/10 hover:border-outline-variant/25 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined !text-sm">arrow_back</span>
            {prev?.label ?? ''}
          </button>
          <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/25">
            {currentIdx + 1} / {CHAPTERS.length}
          </span>
          <button
            onClick={() => next && setActive(next.id)}
            disabled={!next}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-[9px] uppercase tracking-widest text-secondary/70 hover:text-secondary border border-secondary/20 hover:border-secondary/40 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          >
            {next?.label ?? ''}
            <span className="material-symbols-outlined !text-sm">arrow_forward</span>
          </button>
        </div>
      </div>
    </>
  )
}
