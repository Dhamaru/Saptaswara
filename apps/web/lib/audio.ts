import * as Tone from 'tone'
import { swaraToFrequency } from '@/lib/musicalMath'

// ── Public types ─────────────────────────────────────────────────────────────
export type TraditionType = 'carnatic' | 'hindustani'
export type InstrumentName =
  | 'piano'                                          // Western
  | 'veena' | 'bansuri' | 'mridangam' | 'tambura'  // Carnatic
  | 'harmonium' | 'sarangi' | 'tabla' | 'sitar'    // Hindustani

// ── Percussion stroke routing ────────────────────────────────────────────────
type DrumType = 'low' | 'high' | 'both'

const TABLA_STROKES: Record<string, DrumType> = {
  Na: 'high', Ti: 'high', Te: 'high',
  Ge: 'low', Ka: 'low',
  Dha: 'both', Dhin: 'both',
}
const MRIDANGAM_STROKES: Record<string, DrumType> = {
  Thom: 'low', Nam: 'low',
  Dhi: 'high', Tha: 'high',
}

// ── Sampler note list ────────────────────────────────────────────────────────
const SAMPLES_URL = 'https://tonejs.github.io/audio/salamander/'
const SAMPLE_NOTES = [
  'A0','C1','Ds1','Fs1','A1','C2','Ds2','Fs2',
  'A2','C3','Ds3','Fs3','A3','C4','Ds4','Fs4',
  'A4','C5','Ds5','Fs5','A5','C6','Ds6','Fs6','A7',
]

/**
 * AudioEngine — TimbreEngine wrapping Indian classical synthesis.
 *
 * BACKWARD-COMPAT CONTRACT (required by audio.test.ts):
 *   constructor → polySynths[0] (synth) + polySynths[1] (percussion PolySynth)
 *   start()     → polySynths[2] (drone)
 *   TimbreEngine fields are additive; they do not shift the above indexes.
 */
export class AudioEngine {
  // ── Legacy nodes (preserved so existing test indexes don't shift) ─────────
  private synth!: Tone.PolySynth
  private sampler!: Tone.Sampler
  private percussion!: Tone.PolySynth
  private percussionType: 'tabla' | 'mridangam' = 'tabla'
  private drone: Tone.PolySynth | Tone.AMSynth | null = null
  private droneType: 'poly' | 'am' = 'poly'
  private droneStarted = false
  private tamburaSeq: Tone.Sequence | null = null
  private isLoading = true
  private recorder = new Tone.Recorder()

  // ── TimbreEngine fields (new) ─────────────────────────────────────────────
  private timbreGain: Tone.Volume | null = null
  private timbreNode: Tone.ToneAudioNode | null = null
  private timbreAux: Tone.ToneAudioNode[] = []
  private playTimbreNote:
    | ((freq: number, dur: string, time?: number, vel?: number) => void)
    | null = null

  // New-style percussion — built in start(), coexists with legacy percussion
  private percLow: Tone.MembraneSynth | null = null
  private percHigh: Tone.MetalSynth | Tone.MembraneSynth | null = null
  private percHighType: 'metal' | 'membrane' = 'membrane'

  // ── State ─────────────────────────────────────────────────────────────────
  public isStarted = false
  public isSequencing = false
  private _instrument: InstrumentName = 'harmonium'
  private _tradition: TraditionType = 'hindustani'

  constructor() {
    // Only light metadata setup in constructor to avoid blocking main thread on script load
    this._instrument = 'harmonium'
    this._tradition = 'hindustani'
  }

  /** Initialize expensive Tone.js nodes on first start */
  private async ensureInitialized() {
    if (this.synth) return // Already initialized

    Tone.Destination.volume.value = 5

    // polySynths[0] — melody fallback
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.1, decay: 0.2, sustain: 0.8, release: 1.5 },
    }).toDestination()

    const urls: Record<string, string> = {}
    SAMPLE_NOTES.forEach(n => { urls[n.replace('s', '#')] = `${n}.mp3` })
    this.sampler = new Tone.Sampler({
      urls,
      baseUrl: SAMPLES_URL,
      onload: () => { this.isLoading = false },
      onerror: () => { this.isLoading = false },
    }).toDestination()

    // polySynths[1] — legacy percussion fallback
    this.initPercussion()
  }

  private initPercussion() {
    this.percussion = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 },
    }).toDestination()
    this.percussion.connect(this.recorder)
  }

  // ── Start ─────────────────────────────────────────────────────────────────
  async start() {
    if (this.isStarted) return
    try {
      await this.ensureInitialized() // Ensure nodes exist before starting transport
      await Tone.start()
      await Tone.context.resume()
      Tone.Destination.volume.value = 0
      this.isStarted = true

      // polySynths[2] — drone (PolySynth keeps backward-compat index)
      this.drone = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth4' },
        envelope: { attack: 2, release: 2 },
      }).toDestination()
      this.drone.set({ volume: -25 })
      this.drone.connect(this.recorder)

      // TimbreEngine gain bus — build default timbre immediately so sound is audible
      this.timbreGain = new Tone.Volume(0)
      this.timbreGain.toDestination()
      this.timbreGain.connect(this.recorder)

      const built = this.buildTimbreNode(this._instrument, this.timbreGain)
      this.timbreNode    = built.node
      this.timbreAux     = built.aux
      this.playTimbreNote = built.playFn

      // Build default tabla/mridangam percussion nodes
      this.buildPercussion('hindustani')

      console.log('AudioEngine: TimbreEngine ready.')
    } catch (err) {
      console.error('AudioEngine: Failed to start context:', err)
    }
  }

  // ── setTimbre ─────────────────────────────────────────────────────────────
  /**
   * Switch the active timbre with a 100 ms crossfade.
   * New synthesis node is created synchronously so callers (and tests)
   * can observe constructor calls without awaiting the crossfade.
   */
  setTimbre(instrument: InstrumentName, tradition: TraditionType): void {
    if (!this.isStarted || !this.timbreGain) return

    const prevInstrument = this._instrument
    const prevTradition  = this._tradition

    // Capture old rig for async cleanup
    const oldGain = this.timbreGain
    const oldNode = this.timbreNode
    const oldAux  = [...this.timbreAux]

    // New gain bus starts silent; becomes audible after crossfade
    const newGain = new Tone.Volume(-120)
    newGain.toDestination()
    newGain.connect(this.recorder)

    // Build new node synchronously — test assertions work immediately
    const built = this.buildTimbreNode(instrument, newGain)

    // Swap all references before any async work
    this.timbreGain      = newGain
    this.timbreNode      = built.node
    this.timbreAux       = built.aux
    this.playTimbreNote  = built.playFn
    this._instrument     = instrument
    this._tradition      = tradition

    // Fade old out, then fade new in
    oldGain.volume.rampTo(-120, 0.1)
    setTimeout(() => {
      newGain.volume.rampTo(0, 0.05)
      try { oldNode?.dispose() }  catch { /* dispose errors are non-fatal */ }
      oldAux.forEach(n => { try { n.dispose() } catch { /* ignore */ } })
      try { oldGain.dispose() }   catch { /* ignore */ }
    }, 110)

    // Rebuild percussion on tradition change
    if (tradition !== prevTradition) this.buildPercussion(tradition)

    // Tambura: replace drone with AMSynth and auto-start it
    if (instrument === 'tambura' && prevInstrument !== 'tambura') {
      this.buildTamburaDrone()
      this.toggleDrone(true)
    } else if (instrument !== 'tambura' && prevInstrument === 'tambura') {
      // Leaving tambura: restore standard PolySynth drone
      if (this.droneStarted) { (this.drone as any)?.releaseAll?.(); this.droneStarted = false }
      this.droneType = 'poly'
      this.drone = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth4' },
        envelope: { attack: 2, release: 2 },
      }).toDestination()
      this.drone.set({ volume: -25 })
      this.drone.connect(this.recorder)
    }
  }

  // ── buildTimbreNode ───────────────────────────────────────────────────────
  private buildTimbreNode(
    instrument: InstrumentName,
    gain: Tone.Volume,
  ): {
    node: Tone.ToneAudioNode
    aux:  Tone.ToneAudioNode[]
    playFn: (freq: number, dur: string, time?: number, vel?: number) => void
  } {
    switch (instrument) {

      // ── Western ───────────────────────────────────────────────────────────

      case 'piano': {
        const piano = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.005, decay: 0.25, sustain: 0.15, release: 0.7 },
        })
        piano.volume.value = -6
        piano.connect(gain)
        return {
          node: piano,
          aux: [],
          playFn: (f, d, t, v) => piano.triggerAttackRelease(f, d, t, v),
        }
      }

      // ── Carnatic ──────────────────────────────────────────────────────────

      case 'veena': {
        // PolySynth with pluck-like envelope + Freeverb (synchronous) for resonance
        const veenaSynth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle4' },
          envelope: { attack: 0.01, decay: 0.6, sustain: 0.15, release: 1.0 },
        })
        const chorus = new Tone.Chorus({ frequency: 5, delayTime: 2.5, depth: 0.35, wet: 0.4 })
        const fverb  = new Tone.Freeverb({ roomSize: 0.5, dampening: 4000, wet: 0.25 })
        veenaSynth.volume.value = 4
        veenaSynth.connect(chorus)
        chorus.connect(fverb)
        fverb.connect(gain)
        return {
          node: veenaSynth,
          aux: [chorus, fverb],
          playFn: (f, d, t, v) => veenaSynth.triggerAttackRelease(f, d ?? '4n', t, v),
        }
      }

      case 'bansuri': {
        // FMSynth + quiet NoiseSynth layer for breathiness
        const fm    = new Tone.FMSynth({
          modulationIndex: 8,
          envelope: { attack: 0.08, decay: 0.1, sustain: 0.7, release: 0.6 },
        })
        const noise = new Tone.NoiseSynth({
          envelope: { attack: 0.08, decay: 0.1, sustain: 0.02, release: 0.1 },
        })
        noise.volume.value = -30
        fm.connect(gain)
        noise.connect(gain)
        return {
          node: fm,
          aux: [noise],
          playFn: (f, d, t, v) => {
            fm.triggerAttackRelease(f, d, t, v)
            noise.triggerAttackRelease(d, t, v)
          },
        }
      }

      case 'mridangam': {
        // Percussion-only instrument; melody path is intentionally silent
        const silent = new Tone.PolySynth(Tone.Synth)
        silent.connect(gain)
        return { node: silent, aux: [], playFn: () => { /* percussion path only */ } }
      }

      case 'tambura': {
        // Rich overtone blend for tambura-like plucked drone sound
        const primary = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sawtooth4' },
          envelope: { attack: 0.05, decay: 1.5, sustain: 0.2, release: 1.5 },
        })
        const warm = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.05, decay: 0.8, sustain: 0.1, release: 1.0 },
        })
        warm.volume.value = -8
        primary.volume.value = -2
        const fverb = new Tone.Freeverb({ roomSize: 0.7, dampening: 3000, wet: 0.4 })
        primary.connect(fverb)
        warm.connect(fverb)
        fverb.connect(gain)
        return {
          node: primary,
          aux: [warm, fverb],
          playFn: (f, d, t, v) => {
            primary.triggerAttackRelease(f, d ?? '2n', t, v)
            warm.triggerAttackRelease(f, d ?? '2n', t, v)
          },
        }
      }

      // ── Hindustani ────────────────────────────────────────────────────────

      case 'harmonium': {
        // Two sawtooth Synths, second detuned +8 cents for reed chorus
        const primary = new Tone.Synth({
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.04, decay: 0.1, sustain: 0.8, release: 0.5 },
        } as any)
        const chorus = new Tone.Synth({
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.04, decay: 0.1, sustain: 0.8, release: 0.5 },
        } as any)
        chorus.detune.value = 8
        primary.connect(gain)
        chorus.connect(gain)
        return {
          node: primary,
          aux: [chorus],
          playFn: (f, d, t, v) => {
            primary.triggerAttackRelease(f, d, t, v)
            chorus.triggerAttackRelease(f, d, t, v)
          },
        }
      }

      case 'sarangi': {
        // FMSynth with high modulation + Freeverb for sympathetic resonance
        const fm    = new Tone.FMSynth({
          harmonicity: 3, modulationIndex: 15,
          envelope: { attack: 0.12, decay: 0.2, sustain: 0.6, release: 0.8 },
        })
        fm.volume.value = 4
        const fverb = new Tone.Freeverb({ roomSize: 0.4, dampening: 5000, wet: 0.25 })
        fm.connect(fverb)
        fverb.connect(gain)
        return {
          node: fm,
          aux: [fverb],
          playFn: (f, d, t, v) => fm.triggerAttackRelease(f, d, t, v),
        }
      }

      case 'tabla': {
        // Percussion-only instrument; melody path is intentionally silent
        const silent = new Tone.PolySynth(Tone.Synth)
        silent.connect(gain)
        return { node: silent, aux: [], playFn: () => { /* percussion path only */ } }
      }

      case 'sitar': {
        // PolySynth with sharp attack + Chorus shimmer for sympathetic string texture
        const sitarSynth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sawtooth2' },
          envelope: { attack: 0.005, decay: 0.5, sustain: 0.2, release: 0.7 },
        })
        const chorus = new Tone.Chorus({ frequency: 2.5, delayTime: 3.5, depth: 0.4, wet: 0.3 })
        sitarSynth.volume.value = 2
        sitarSynth.connect(chorus)
        chorus.connect(gain)
        return {
          node: sitarSynth,
          aux: [chorus],
          playFn: (f, d, t, v) => sitarSynth.triggerAttackRelease(f, d ?? '4n', t, v),
        }
      }

      default: {
        const synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine' },
          envelope: { attack: 0.05, decay: 0.2, sustain: 0.7, release: 0.8 },
        })
        synth.connect(gain)
        return {
          node: synth,
          aux: [],
          playFn: (f, d, t, v) => synth.triggerAttackRelease(f, d, t, v),
        }
      }
    }
  }

  // ── buildPercussion ───────────────────────────────────────────────────────
  private buildPercussion(tradition: TraditionType): void {
    try { this.percLow?.dispose()  } catch { /* ignore */ }
    try { this.percHigh?.dispose() } catch { /* ignore */ }

    if (tradition === 'hindustani') {
      // Tabla: bayan (bass) + dayan (treble) — both MembraneSynth
      this.percLow = new Tone.MembraneSynth({
        pitchDecay: 0.08, octaves: 4,
        envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
      }).toDestination()
      this.percLow.connect(this.recorder)

      this.percHigh = new Tone.MembraneSynth({
        pitchDecay: 0.05, octaves: 2,
        envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
      }).toDestination()
      this.percHigh.connect(this.recorder)
      this.percHighType     = 'membrane'
      this.percussionType   = 'tabla'
    } else {
      // Mridangam: low (MembraneSynth) + high (MetalSynth)
      this.percLow = new Tone.MembraneSynth({
        pitchDecay: 0.1, octaves: 5,
        envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.15 },
      }).toDestination()
      this.percLow.connect(this.recorder)

      this.percHigh = new Tone.MetalSynth({
        harmonicity: 5.1,
        modulationIndex: 32, resonance: 4000, octaves: 1.5,
        envelope: { attack: 0.001, decay: 0.1, release: 0.1 },
      }).toDestination()
      this.percHigh.connect(this.recorder)
      this.percHighType     = 'metal'
      this.percussionType   = 'mridangam'
    }
  }

  // ── buildTamburaDrone ─────────────────────────────────────────────────────
  private buildTamburaDrone(): void {
    if (this.droneStarted) { this.stopAll(); this.droneStarted = false }
    try { (this.drone as any)?.dispose?.() } catch { /* ignore */ }
    try { this.tamburaSeq?.dispose() } catch { /* ignore */ }

    // Tambura Synth: PolySynth of AMSynth for overlapping plucks with rich overtones
    const amb = new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 3.999,
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.02, decay: 4, sustain: 0.05, release: 2 },
      modulation: { type: 'sawtooth' },
      modulationEnvelope: { attack: 0.1, decay: 1, sustain: 1, release: 0.5 },
    }).toDestination()
    
    amb.set({ volume: -24 })
    amb.connect(this.recorder)
    this.drone     = amb
    this.droneType = 'am'
    
    // Create the cyclical sequence (Pa - Sa - Sa - Sa_low)
    // We update the 'substance' (frequencies) in toggleDrone
    this.tamburaSeq = new Tone.Sequence<number>((time, freq) => {
      if (this.droneType === 'am' && this.drone) {
        (this.drone as Tone.PolySynth).triggerAttackRelease(freq, '2n', time)
      }
    }, [], '2n')
    
    // Set a very slow meditative interval for the tambura cycle
    this.tamburaSeq.playbackRate = 0.4 
  }

  // ── playSwara ─────────────────────────────────────────────────────────────
  playSwara(frequency: number, duration = '4n', time?: number, velocity?: number) {
    if (!this.isStarted || !frequency || Number.isNaN(frequency) || frequency <= 0) return
    try {
      if (this.playTimbreNote) {
        this.playTimbreNote(frequency, duration, time, velocity)
        return
      }
      if (!this.isLoading) {
        this.sampler.triggerAttackRelease(frequency, duration, time, velocity)
      } else {
        this.synth.triggerAttackRelease(frequency, duration, time, velocity)
      }
    } catch {
      this.synth.triggerAttackRelease(frequency, duration, time, velocity)
    }
  }

  // ── attackSwara / releaseSwara (sustain-style, for piano key hold) ────────
  attackSwara(frequency: number, velocity = 0.8) {
    if (!this.isStarted || !frequency || Number.isNaN(frequency) || frequency <= 0) return
    try {
      const now = Tone.now()
      if (this.timbreNode && 'triggerAttack' in this.timbreNode) {
        ;(this.timbreNode as any).triggerAttack(frequency, now, velocity)
      } else if (!this.isLoading) {
        this.sampler.triggerAttack(frequency, now, velocity)
      } else {
        this.synth.triggerAttack(frequency, now, velocity)
      }
    } catch { /* ignore */ }
  }

  releaseSwara(frequency: number) {
    if (!this.isStarted) return
    try {
      const now = Tone.now()
      if (this.timbreNode && 'triggerRelease' in this.timbreNode) {
        ;(this.timbreNode as any).triggerRelease(frequency, now)
      } else if (!this.isLoading) {
        this.sampler.triggerRelease(frequency, now)
      } else {
        this.synth.triggerRelease(frequency, now)
      }
    } catch { /* ignore */ }
  }

  releaseAll() {
    try { (this.timbreNode as any)?.releaseAll?.() } catch { /* ignore */ }
    try { this.sampler.releaseAll() } catch { /* ignore */ }
  }

  // ── Ornament synthesis primitives ─────────────────────────────────────────

  /**
   * Meend — continuous exponential pitch glide from one frequency to another.
   * Uses a dedicated Synth so it doesn't interrupt the main timbre voice.
   * curve: 'exponential' (classical meend) | 'linear'
   */
  playMeend(
    fromFreq: number,
    toFreq: number,
    durationSeconds = 0.8,
    curve: 'exponential' | 'linear' = 'exponential',
  ) {
    if (!this.isStarted) return
    try {
      const meend = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.02, decay: 0, sustain: 1, release: 0.15 },
      })
      meend.volume.value = -8
      meend.connect(this.timbreGain ?? Tone.Destination)
      const now = Tone.now()
      meend.triggerAttack(fromFreq, now)
      if (curve === 'exponential') {
        meend.frequency.exponentialRampTo(toFreq, durationSeconds, now)
      } else {
        meend.frequency.linearRampTo(toFreq, durationSeconds, now)
      }
      meend.triggerRelease(now + durationSeconds)
      // clean up after release
      setTimeout(() => { try { meend.dispose() } catch { /* ignore */ } }, (durationSeconds + 0.5) * 1000)
    } catch { /* ignore */ }
  }

  /**
   * Andolan — slow asymmetric pitch oscillation on a single swara.
   * The oscillation dips below the target frequency (not equally above/below).
   * rate: Hz (1.5 = Darbari-style, 2.5 = lighter)
   * depth: semitones (0.3 – 0.8 typical)
   */
  playAndolan(
    frequency: number,
    durationSeconds = 2,
    rate = 1.8,
    depth = 0.5,
  ) {
    if (!this.isStarted) return
    try {
      const synth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.06, decay: 0, sustain: 1, release: 0.3 },
      })
      synth.volume.value = -10
      synth.connect(this.timbreGain ?? Tone.Destination)

      // Asymmetric LFO: negative offset so oscillation dips below center
      const lfo = new Tone.LFO({
        type: 'sine',
        frequency: rate,
        min: -depth,   // dips below
        max: depth * 0.3, // rises only slightly above
      })
      // Scale semitone offset → cents (×100) before connecting to detune
      const lfoScaled = new Tone.Multiply(100)
      lfo.connect(lfoScaled)
      lfoScaled.connect(synth.detune)

      const now = Tone.now()
      lfo.start(now)
      synth.triggerAttack(frequency, now)
      synth.triggerRelease(now + durationSeconds)
      setTimeout(() => {
        try { lfo.dispose(); lfoScaled.dispose(); synth.dispose() } catch { /* ignore */ }
      }, (durationSeconds + 0.5) * 1000)
    } catch { /* ignore */ }
  }

  /**
   * Gamak — rapid forceful alternation between two adjacent swaras.
   */
  playGamak(
    freq1: number,
    freq2: number,
    repetitions = 6,
    speed = 0.08, // seconds per alternation
  ) {
    if (!this.isStarted) return
    try {
      for (let i = 0; i < repetitions; i++) {
        const freq = i % 2 === 0 ? freq1 : freq2
        const t = Tone.now() + i * speed
        this.playSwara(freq, `${Math.round(speed * 1000)}i`, t, 0.9)
      }
    } catch { /* ignore */ }
  }

  /**
   * Kan — brief grace note touch before the main swara.
   * direction 'up': approach from below; 'down': approach from above.
   */
  playKan(mainFreq: number, kanFreq: number, direction: 'up' | 'down' = 'up') {
    if (!this.isStarted) return
    try {
      const now = Tone.now()
      // Kan is very short (32nd note) and soft
      this.playSwara(kanFreq, '32n', now, 0.3)
      this.playSwara(mainFreq, '8n', now + 0.04, 0.85)
    } catch { /* ignore */ }
  }

  // ── playStroke ────────────────────────────────────────────────────────────
  playStroke(stroke: string) {
    if (!this.isStarted) return

    // New-style percussion (MembraneSynth / MetalSynth)
    if (this.percLow || this.percHigh) {
      const strokeMap = this._tradition === 'hindustani' ? TABLA_STROKES : MRIDANGAM_STROKES
      const drumType  = strokeMap[stroke]
      if (!drumType) return

      if (drumType === 'low' || drumType === 'both') {
        const freq = this._tradition === 'hindustani' ? 80 : 100
        this.percLow?.triggerAttackRelease(freq, '16n')
      }
      if (drumType === 'high' || drumType === 'both') {
        if (this.percHighType === 'metal') {
          (this.percHigh as Tone.MetalSynth).triggerAttackRelease('16n', Tone.now())
        } else {
          const freq = this._tradition === 'hindustani' ? 300 : 400
          ;(this.percHigh as Tone.MembraneSynth).triggerAttackRelease(freq, '16n')
        }
      }
      return
    }

    // Legacy fallback (PolySynth percussion)
    const tablaMap: Record<string, number> = {
      Dha: 120, Na: 440, Dhin: 160, Ti: 880, Te: 700,
    }
    const mridangamMap: Record<string, number> = {
      Thom: 100, Nam: 500, Dhi: 350, Tha: 200,
    }
    const map  = this.percussionType === 'tabla' ? tablaMap : mridangamMap
    const freq = map[stroke]
    if (freq) {
      const isBass = stroke === 'Dha' || stroke === 'Thom' || stroke === 'Dhin'
      this.percussion.set({
        envelope: { attack: 0.005, decay: isBass ? 0.4 : 0.1, sustain: 0, release: 0.2 },
      })
      this.percussion.triggerAttackRelease(freq, '16n')
    }
  }

  // ── toggleDrone ───────────────────────────────────────────────────────────
  toggleDrone(isActive: boolean, type: 'Sa-Pa' | 'Sa-Ma' = 'Sa-Pa', rootFreq = 440) {
    if (!this.isStarted || !this.drone) return
    
    if (!isActive) {
      if (this.droneStarted) { 
        this.tamburaSeq?.stop()
        ;(this.drone as any)?.releaseAll?.()
        this.droneStarted = false 
      }
    } else {
      // Logic for Tambura (AM mode) vs Standard Drone (Poly mode)
      if (this.droneType === 'am' && this.tamburaSeq) {
        const paFreq = type === 'Sa-Pa' ? rootFreq * 0.75 : rootFreq * 0.667 // Mandra Pa or Mandra Ma
        const saFreq = rootFreq
        const saLowFreq = rootFreq * 0.5 // Mandra Sa
        
        // Sequence: Pa, Sa, Sa, Sa(low)
        this.tamburaSeq.events = [paFreq, saFreq, saFreq, saLowFreq]
        this.tamburaSeq.start(0)
        
        if (Tone.getTransport().state !== 'started') {
          Tone.getTransport().start()
        }
        this.droneStarted = true
      } else if (this.droneType === 'poly') {
        if (!this.droneStarted) {
          const frequencies = [rootFreq, rootFreq * 0.5, rootFreq * 2]
          frequencies.push(type === 'Sa-Pa' ? rootFreq * 1.5 : rootFreq * 1.334)
          ;(this.drone as Tone.PolySynth).triggerAttack(frequencies)
          this.droneStarted = true
        }
      }
    }
  }

  // ── Utility ───────────────────────────────────────────────────────────────
  setVolume(value: number) {
    Tone.Destination.volume.value = Math.max(-40, Math.min(0, value))
  }

  /** Backward-compat shim — maps old 3-name API onto setTimbre. */
  setInstrument(type: 'piano' | 'harmonium' | 'sitar') {
    const map: Record<string, { inst: InstrumentName; trad: TraditionType }> = {
      piano:     { inst: 'piano',     trad: 'hindustani' },
      harmonium: { inst: 'harmonium', trad: 'hindustani' },
      sitar:     { inst: 'sitar',     trad: 'hindustani' },
    }
    const { inst, trad } = map[type] ?? { inst: 'harmonium', trad: 'hindustani' }
    this.setTimbre(inst, trad)
  }

  setPercussionType(type: 'tabla' | 'mridangam') {
    this.percussionType = type
    if (this.isStarted) this.buildPercussion(type === 'tabla' ? 'hindustani' : 'carnatic')
  }

  // ── Recording ─────────────────────────────────────────────────────────────
  async startRecording() {
    if (!this.isStarted) return
    this.recorder.start()
  }

  async stopRecording() {
    const recording = await this.recorder.stop()
    const url    = URL.createObjectURL(recording)
    const anchor = document.createElement('a')
    anchor.download = `Saptaswara_Composition_${Date.now()}.webm`
    anchor.href = url
    anchor.click()
  }

  // ── Aroha / Avaroha sequence ──────────────────────────────────────────────
  async playArohaAvaroha(
    aroha: string[], avaroha: string[],
    onPlayNote?: (note: string) => void,
  ) {
    if (!this.isStarted || (!aroha.length && !avaroha.length)) return
    this.isSequencing = false
    await new Promise(res => setTimeout(res, 50))
    this.isSequencing = true

    const gap          = 0.45
    const peakNote     = aroha[aroha.length - 1]
    const descentStart = avaroha[0]
    const actualDescent =
      peakNote && descentStart && peakNote === descentStart ? avaroha.slice(1) : avaroha
    const combined = [...aroha, ...actualDescent]

    combined.forEach((swara, idx) => {
      setTimeout(() => {
        if (!this.isSequencing) return
        const freq         = swaraToFrequency(swara)
        const displaySwara = swara.replace('^', '')
        const UI_OCTAVE    = swara.includes('^') ? '5' : '4'
        this.playSwara(freq, '8n', undefined, 0.8)
        onPlayNote?.(`${displaySwara}${UI_OCTAVE}`)
      }, idx * gap * 1000)
    })

    setTimeout(() => {
      if (this.isSequencing) { this.isSequencing = false; onPlayNote?.('') }
    }, combined.length * gap * 1000)
  }

  dispose() {
    this.stopAll()
    try { Tone.getTransport().cancel() } catch { /* ignore */ }
    try { Tone.getTransport().stop() } catch { /* ignore */ }
    try { this.sampler?.dispose() } catch { /* ignore */ }
    try { this.synth?.dispose() } catch { /* ignore */ }
    try { this.percussion?.dispose() } catch { /* ignore */ }
    try { (this.timbreNode as any)?.dispose?.() } catch { /* ignore */ }
    this.timbreAux?.forEach(n => { try { n.dispose() } catch { /* ignore */ } })
    try { this.timbreGain?.dispose() } catch { /* ignore */ }
    try { this.percLow?.dispose() } catch { /* ignore */ }
    try { this.percHigh?.dispose() } catch { /* ignore */ }
    try { (this.drone as any)?.dispose?.() } catch { /* ignore */ }
    this.isStarted = false
    this.isSequencing = false
    // Reset singleton so getAudioEngine() creates a fresh instance next time
    _instance = null
  }

  stopAll() {
    try { this.sampler?.releaseAll() } catch { /* ignore */ }
    try { this.synth?.releaseAll() } catch { /* ignore */ }
    try { (this.timbreNode as any)?.releaseAll?.() } catch { /* ignore */ }
    try { (this.percLow as any)?.releaseAll?.() } catch { /* ignore */ }
    try { (this.percHigh as any)?.releaseAll?.() } catch { /* ignore */ }
    try { this.percussion?.releaseAll() } catch { /* ignore */ }
    if (this.drone) { 
      try { this.tamburaSeq?.stop() } catch { /* ignore */ }
      try { (this.drone as any)?.releaseAll?.() } catch { /* ignore */ }
      this.droneStarted = false 
    }
  }

  // ── Read-only state (consumed by UI + tests) ──────────────────────────────
  get instrument(): InstrumentName { return this._instrument }
  get tradition():  TraditionType  { return this._tradition  }
}

// Singleton guard — prevents accidental double-instantiation
let _instance: AudioEngine | null = null

export function getAudioEngine(): AudioEngine | null {
  if (typeof window === 'undefined') return null
  if (!_instance) {
    _instance = new AudioEngine()
  } else {
    console.warn('AudioEngine: getAudioEngine() called after instance exists — returning existing instance.')
  }
  return _instance
}

/** @deprecated Use getAudioEngine() instead */
export const audioEngine = typeof window !== 'undefined' ? (() => {
  if (!_instance) {
    try {
      _instance = new AudioEngine()
    } catch (e) {
      console.error('AudioEngine: Failed to create instance:', e)
      return null
    }
  }
  return _instance
})() : null
