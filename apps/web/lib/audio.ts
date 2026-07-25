import * as Tone from 'tone'
import { swaraToFrequency } from '@/lib/musicalMath'

// ── WAV encoder ──────────────────────────────────────────────────────────────
function encodeWav(buffer: AudioBuffer): ArrayBuffer {
  const numCh = buffer.numberOfChannels
  const sr = buffer.sampleRate
  const dataLen = buffer.length * numCh * 2  // 16-bit samples
  const ab = new ArrayBuffer(44 + dataLen)
  const v = new DataView(ab)
  const write = (off: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)) }
  write(0, 'RIFF'); v.setUint32(4, 36 + dataLen, true); write(8, 'WAVE')
  write(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true)
  v.setUint16(22, numCh, true); v.setUint32(24, sr, true)
  v.setUint32(28, sr * numCh * 2, true); v.setUint16(32, numCh * 2, true)
  v.setUint16(34, 16, true); write(36, 'data'); v.setUint32(40, dataLen, true)
  let off = 44
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]))
      v.setInt16(off, s < 0 ? s * 32768 : s * 32767, true)
      off += 2
    }
  }
  return ab
}

// ── Public types ─────────────────────────────────────────────────────────────
export type TraditionType = 'carnatic' | 'hindustani'
export type MasteringPreset = 'neutral' | 'clear' | 'warm' | 'punchy' | 'raga' | 'concert' | 'vocal' | 'deep' | 'bright'
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
  private percussion!: Tone.PolySynth | Tone.Sampler
  private percussionType: 'tabla' | 'mridangam' = 'tabla'
  private drone: Tone.PolySynth | Tone.AMSynth | null = null
  private droneType: 'poly' | 'am' = 'poly'
  private droneStarted = false
  private tamburaSeq: Tone.Sequence | null = null
  private isLoading = true
  private recorder = new Tone.Recorder()
  private meter = new Tone.Meter()
  
  // ── Metronome state ───────────────────────────────────────────────────────
  private clickSynth: Tone.MembraneSynth | null = null
  private metronomeEventId: number | null = null
  private _metronomeActive = false

  // ── Mastering Chain members ───────────────────────────────────────────────
  private limiter: Tone.Limiter | null = null
  private masterEQ: Tone.EQ3 | null = null

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
  private masterOutput!: Tone.Gain

  // ── Ornament node caps (prevents node accumulation during rapid play) ─────
  private _sympNode: { synth: Tone.PolySynth; fverb: Tone.Freeverb } | null = null
  private _andolanDispose: (() => void) | null = null
  private _meendDispose: (() => void) | null = null
  private _seqToken = 0

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

    // ── Master Output ───────────────────────────────────────────────────────
    this.masterOutput = new Tone.Gain(1)

    // Metering + recording tap pre-EQ (raw signal level)
    this.masterOutput.connect(this.recorder)
    this.masterOutput.connect(this.meter)

    // Mastering chain: masterOutput → EQ → limiter → destination
    // All instruments connect to masterOutput, signal flows through EQ before output
    this.masterEQ = new Tone.EQ3(0, 0, 0)
    this.limiter = new Tone.Limiter(-1)
    this.masterOutput.chain(this.masterEQ, this.limiter, Tone.getDestination())

    // Metronome synth
    this.clickSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 2,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
    }).connect(this.masterOutput)
    this.clickSynth.volume.value = -12

    // polySynths[0] — melody fallback
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.1, decay: 0.2, sustain: 0.8, release: 1.5 },
    }).connect(this.masterOutput)

    const urls: Record<string, string> = {}
    SAMPLE_NOTES.forEach(n => { urls[n.replace('s', '#')] = `${n}.mp3` })
    this.sampler = new Tone.Sampler({
      urls,
      baseUrl: SAMPLES_URL,
      onload: () => { this.isLoading = false },
      onerror: () => { this.isLoading = false },
    }).connect(this.masterOutput)

    // polySynths[1] — legacy percussion fallback
    this.initPercussion()
  }

  private initPercussion() {
    this.percussion = new Tone.Sampler({
      urls: { C4: 'drum.mp3' },
      baseUrl: 'https://tonejs.github.io/audio/drum-samples/handclap/',
    }).connect(this.masterOutput)
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
      }).connect(this.masterOutput)
      this.drone.set({ volume: -25 })

      // TimbreEngine gain bus — build default timbre immediately so sound is audible
      this.timbreGain = new Tone.Volume(0)
      this.timbreGain.connect(this.masterOutput)

      const built = this.buildTimbreNode(this._instrument, this.timbreGain)
      this.timbreNode    = built.node
      this.timbreAux     = built.aux
      this.playTimbreNote = built.playFn

      // Build default tabla/mridangam percussion nodes
      this.buildPercussion('hindustani')

      console.log('AudioEngine: TimbreEngine ready.')
    } catch (err) {
      this.isStarted = false   // allow retry; callers must handle the throw
      console.error('AudioEngine: Failed to start context:', err)
      throw err
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
    newGain.connect(this.masterOutput)

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
      }).connect(this.masterOutput)
      this.drone.set({ volume: -25 })
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
        // Salamander Grand Piano samples — real recordings, vastly better than synthesis
        const sampler = new Tone.Sampler({
          urls: {
            A0: 'A0.mp3',  C1: 'C1.mp3',  'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3',
            A1: 'A1.mp3',  C2: 'C2.mp3',  'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3',
            A2: 'A2.mp3',  C3: 'C3.mp3',  'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
            A3: 'A3.mp3',  C4: 'C4.mp3',  'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
            A4: 'A4.mp3',  C5: 'C5.mp3',  'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
            A5: 'A5.mp3',  C6: 'C6.mp3',  'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3',
            A7: 'A7.mp3',
          },
          baseUrl: SAMPLES_URL,
          release: 1,
        })
        sampler.volume.value = -6
        sampler.connect(gain)
        return {
          node: sampler,
          aux: [],
          playFn: (f, d, t, v) => {
            if (sampler.loaded) sampler.triggerAttackRelease(f, d, t, v)
          },
        }
      }

      // ── Carnatic ──────────────────────────────────────────────────────────

      case 'veena': {
        // PolySynth with pluck-like envelope + Freeverb (synchronous) for resonance
        const veenaSynth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle4' },
          envelope: { attack: 0.010, decay: 0.20, sustain: 0.35, release: 0.90 },
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
        // Four slightly-detuned sawtooth oscillators simulate the harmonium reed bank
        // Each physical reed has its own tuning variance — this models that naturally
        const makePipe = (detuneCents: number, vol: number) => {
          const s = new Tone.Synth({
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.08, decay: 0.20, sustain: 0.90, release: 0.6 },
          } as any)
          s.detune.value = detuneCents
          s.volume.value = vol
          return s
        }
        const p1 = makePipe(0,   -4)
        const p2 = makePipe(7,   -8)   // +7 cents — natural reed spread
        const p3 = makePipe(-5,  -9)   // -5 cents — opposing reed
        const p4 = makePipe(12,  -14)  // soft octave presence

        // Warm low-pass filter — harmoniums are naturally warm, not bright
        const lpf = new Tone.Filter({ frequency: 3200, type: 'lowpass', rolloff: -12 })
        // Light chorus for the air-bellows movement texture
        const air = new Tone.Chorus({ frequency: 1.4, delayTime: 1.8, depth: 0.2, wet: 0.15 })

        ;[p1, p2, p3, p4].forEach(p => p.connect(lpf))
        lpf.connect(air)
        air.connect(gain)

        return {
          node: p1,
          aux: [p2, p3, p4, lpf, air],
          playFn: (f, d, t, v) => {
            p1.triggerAttackRelease(f, d, t, v)
            p2.triggerAttackRelease(f, d, t, v)
            p3.triggerAttackRelease(f, d, t, v)
            p4.triggerAttackRelease(f, d, t, v)
          },
        }
      }

      case 'sarangi': {
        // FMSynth with high modulation + Freeverb for sympathetic resonance
        const fm    = new Tone.FMSynth({
          harmonicity: 3, modulationIndex: 15,
          envelope: { attack: 0.06, decay: 0.15, sustain: 0.75, release: 0.50 },
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
        // Main string: FMSynth captures the characteristic buzz (jawari) of the sitar bridge
        const string = new Tone.FMSynth({
          harmonicity: 1,
          modulationIndex: 6,
          oscillator: { type: 'sawtooth' } as any,
          envelope: { attack: 0.005, decay: 0.35, sustain: 0.20, release: 0.90 },
          modulation: { type: 'square' } as any,
          modulationEnvelope: { attack: 0.002, decay: 0.3, sustain: 0, release: 0.5 },
        })
        string.volume.value = 2

        // Sympathetic strings: very soft high-passed noise burst on attack
        const sympNoise = new Tone.NoiseSynth({
          noise: { type: 'brown' },
          envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 },
        })
        sympNoise.volume.value = -28
        const hpf = new Tone.Filter({ frequency: 1800, type: 'highpass' })
        sympNoise.connect(hpf)

        // Reverb simulates instrument body + resonance chamber
        const body = new Tone.Freeverb({ roomSize: 0.35, dampening: 5500, wet: 0.2 })
        // Chorus for the shimmer of the taraf (resonant) strings
        const shimmer = new Tone.Chorus({ frequency: 3, delayTime: 2.5, depth: 0.35, wet: 0.25 })

        string.connect(shimmer)
        shimmer.connect(body)
        hpf.connect(body)
        body.connect(gain)

        return {
          node: string,
          aux: [sympNoise, hpf, shimmer, body],
          playFn: (f, d, t, v) => {
            string.triggerAttackRelease(f, d ?? '4n', t, v)
            sympNoise.triggerAttackRelease(d ?? '4n', t, v)
          },
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
        pitchDecay: 0.12, octaves: 5,
        envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.15 },
      }).connect(this.masterOutput)
      this.percLow.volume.value = 6   // loud bayan thump

      this.percHigh = new Tone.MembraneSynth({
        pitchDecay: 0.06, octaves: 3,
        envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.08 },
      }).connect(this.masterOutput)
      this.percHigh.volume.value = 4  // crisp dayan snap
      this.percHighType     = 'membrane'
      this.percussionType   = 'tabla'
    } else {
      // Mridangam: low (MembraneSynth) + high (MetalSynth)
      this.percLow = new Tone.MembraneSynth({
        pitchDecay: 0.14, octaves: 6,
        envelope: { attack: 0.001, decay: 0.6, sustain: 0, release: 0.2 },
      }).connect(this.masterOutput)
      this.percLow.volume.value = 6   // deep thom

      this.percHigh = new Tone.MetalSynth({
        harmonicity: 5.1,
        modulationIndex: 16, resonance: 3200, octaves: 1.5,
        envelope: { attack: 0.001, decay: 0.18, release: 0.08 },
      }).connect(this.masterOutput)
      this.percHigh.volume.value = 4  // bright dhi/tha ring
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
    }).connect(this.masterOutput)
    
    amb.set({ volume: -24 })
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
      // Dispose previous meend so rapid drag doesn't accumulate nodes
      this._meendDispose?.()
      this._meendDispose = null

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
      const dispose = () => { try { meend.dispose() } catch { /* ignore */ } }
      this._meendDispose = dispose
      setTimeout(() => {
        if (this._meendDispose === dispose) this._meendDispose = null
        dispose()
      }, (durationSeconds + 0.5) * 1000)
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
      // Dispose previous andolan so repeated calls don't stack nodes
      this._andolanDispose?.()
      this._andolanDispose = null

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
      const dispose = () => {
        try { lfo.dispose(); lfoScaled.dispose(); synth.dispose() } catch { /* ignore */ }
      }
      this._andolanDispose = dispose
      setTimeout(() => {
        if (this._andolanDispose === dispose) this._andolanDispose = null
        dispose()
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
  playKan(mainFreq: number, kanFreq: number, _direction: 'up' | 'down' = 'up') {
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
      // BUGFIX: Use this.percussionType explicitly instead of global _tradition
      // This allows Tabla to work even if the Melody is in a Carnatic Raga.
      const isTabla   = this.percussionType === 'tabla'
      const strokeMap = isTabla ? TABLA_STROKES : MRIDANGAM_STROKES
      const drumType  = strokeMap[stroke]
      
      if (!drumType) return

      if (drumType === 'low' || drumType === 'both') {
        const freq = isTabla ? 100 : 120 // Tuned: slightly higher so laptop speakers can reproduce
        this.percLow?.triggerAttackRelease(freq, '8n')
      }
      if (drumType === 'high' || drumType === 'both') {
        if (this.percHighType === 'metal') {
          // MetalSynth: pass a centre frequency so the pitched overtones are audible
          ;(this.percHigh as Tone.MetalSynth).triggerAttackRelease(800, '8n')
        } else {
          const freq = isTabla ? 320 : 440
          ;(this.percHigh as Tone.MembraneSynth).triggerAttackRelease(freq, '8n')
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
    if (!this.isStarted || this.recorder.state === 'started') return
    try {
      this.recorder.start()
    } catch (e) {
      console.error('Failed to start recording:', e)
    }
  }

  async stopRecording() {
    if (this.recorder.state !== 'started') return
    try {
      const recording = await this.recorder.stop()
      const url    = URL.createObjectURL(recording)
      const anchor = document.createElement('a')
      anchor.download = `Saptaswara_Composition_${Date.now()}.webm`
      anchor.href = url
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (e) {
      console.error('Failed to stop recording:', e)
    }
  }

  async stopRecordingAsWav() {
    if (this.recorder.state !== 'started') return
    try {
      const recording = await this.recorder.stop()
      const arrayBuffer = await recording.arrayBuffer()
      const audioCtx = new AudioContext()
      let decoded: AudioBuffer
      try {
        decoded = await audioCtx.decodeAudioData(arrayBuffer)
      } finally {
        audioCtx.close()
      }

      const wav = encodeWav(decoded!)
      const blob = new Blob([wav], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.download = `Saptaswara_Composition_${Date.now()}.wav`
      anchor.href = url
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (e) {
      console.error('Failed to export WAV, falling back to webm:', e)
      await this.stopRecording()
    }
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
    // Unique token per invocation — prevents ghost notes when called twice in rapid succession.
    // Without this, both invocations share the same isSequencing boolean and both play.
    const token = ++this._seqToken

    const gap          = 0.45
    const peakNote     = aroha[aroha.length - 1]
    const descentStart = avaroha[0]
    const actualDescent =
      peakNote && descentStart && peakNote === descentStart ? avaroha.slice(1) : avaroha
    const combined = [...aroha, ...actualDescent]

    combined.forEach((swara, idx) => {
      setTimeout(() => {
        if (!this.isSequencing || this._seqToken !== token) return
        const freq         = swaraToFrequency(swara)
        const displaySwara = swara.replace('^', '')
        const UI_OCTAVE    = swara.includes('^') ? '5' : '4'
        this.playSwara(freq, '8n', undefined, 0.8)
        onPlayNote?.(`${displaySwara}${UI_OCTAVE}`)
      }, idx * gap * 1000)
    })

    setTimeout(() => {
      if (this.isSequencing && this._seqToken === token) {
        this.isSequencing = false
        onPlayNote?.('')
      }
    }, combined.length * gap * 1000)
  }

  dispose() {
    this.stopAll()
    this._meendDispose?.(); this._meendDispose = null
    this._andolanDispose?.(); this._andolanDispose = null
    try { this._sympNode?.synth.dispose() } catch { /* ignore */ }
    try { this._sympNode?.fverb.dispose() } catch { /* ignore */ }
    this._sympNode = null
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
    try { this.clickSynth?.dispose() } catch { /* ignore */ }
    try { this.masterEQ?.dispose() } catch { /* ignore */ }
    try { this.limiter?.dispose() } catch { /* ignore */ }
    try { this.meter?.dispose() } catch { /* ignore */ }
    try { this.masterOutput?.dispose() } catch { /* ignore */ }
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

  // ── Premium Features: Metronome, Mastering, Metering ───────────────────

  toggleMetronome(active: boolean, matras: number = 4) {
    this._metronomeActive = active
    if (this.metronomeEventId !== null) {
      Tone.getTransport().clear(this.metronomeEventId)
      this.metronomeEventId = null
    }

    if (active) {
      this.metronomeEventId = Tone.getTransport().scheduleRepeat((time) => {
        const seconds = Tone.getTransport().seconds
        const bpm = Tone.getTransport().bpm.value
        // Use the passed matras for the click cycle
        const beat = Math.floor(seconds * (bpm / 60)) % matras
        this.clickSynth?.triggerAttackRelease(beat === 0 ? 'C5' : 'C4', '32n', time)
      }, '4n')
    }
  }

  setMasteringPreset(preset: MasteringPreset) {
    if (!this.masterEQ) return
    switch (preset) {
      // ── Existing ──
      case 'warm':
        this.masterEQ.low.value = 3;  this.masterEQ.mid.value = 1;  this.masterEQ.high.value = -4; break
      case 'punchy':
        this.masterEQ.low.value = 5;  this.masterEQ.mid.value = -2; this.masterEQ.high.value = 2;  break
      case 'clear':
        this.masterEQ.low.value = -2; this.masterEQ.mid.value = 0;  this.masterEQ.high.value = 4;  break
      // ── New ──
      case 'raga':
        // Baithak / sitting-circle feel — forward mids, rolled-off lows, airy highs
        this.masterEQ.low.value = -3; this.masterEQ.mid.value = 4;  this.masterEQ.high.value = 2;  break
      case 'concert':
        // Large hall presence — slight low bloom, strong upper-mid projection
        this.masterEQ.low.value = 2;  this.masterEQ.mid.value = 3;  this.masterEQ.high.value = 1;  break
      case 'vocal':
        // Brings melodic lines forward — cuts muddy lows, lifts presence band
        this.masterEQ.low.value = -4; this.masterEQ.mid.value = 5;  this.masterEQ.high.value = 0;  break
      case 'deep':
        // Tanpura / drone emphasis — heavy low-end, recessed highs
        this.masterEQ.low.value = 6;  this.masterEQ.mid.value = 0;  this.masterEQ.high.value = -5; break
      case 'bright':
        // Airy and open — lifts overtones, good for Carnatic high-register work
        this.masterEQ.low.value = -1; this.masterEQ.mid.value = -1; this.masterEQ.high.value = 6;  break
      default:
        this.masterEQ.low.value = 0;  this.masterEQ.mid.value = 0;  this.masterEQ.high.value = 0
    }
  }

  /**
   * KR-03 — Sympathetic resonance layer for sitar and veena.
   * Plays the 5th harmonic (3/2) and octave (2/1) very softly through heavy reverb,
   * simulating the taraf (resonant) strings that vibrate in sympathy.
   */
  playSympatheticResonance(frequency: number) {
    if (!this.isStarted || !this.timbreGain) return
    if (this._instrument !== 'sitar' && this._instrument !== 'veena') return
    try {
      // Dispose previous sympathetic node — 4s decay means fast playing accumulates many nodes
      try { this._sympNode?.synth.dispose() } catch { /* ignore */ }
      try { this._sympNode?.fverb.dispose() } catch { /* ignore */ }
      this._sympNode = null

      const symp = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.10, decay: 1.8, sustain: 0, release: 0.4 },
      })
      symp.volume.value = -22
      const fverb = new Tone.Freeverb({ roomSize: 0.88, dampening: 2800, wet: 0.75 })
      symp.connect(fverb)
      fverb.connect(this.timbreGain)
      symp.triggerAttackRelease([frequency * 1.5, frequency * 2], '2n', Tone.now(), 0.28)
      this._sympNode = { synth: symp, fverb }
      setTimeout(() => {
        if (this._sympNode?.synth === symp) this._sympNode = null
        try { symp.dispose(); fverb.dispose() } catch { /* ignore */ }
      }, 4000)
    } catch { /* ignore */ }
  }

  setDetune(cents: number) {
    if (!this.isStarted) return
    try { (this.timbreNode as any)?.set?.({ detune: cents }) } catch { /* ignore */ }
    try { this.synth?.set({ detune: cents }) } catch { /* ignore */ }
  }

  getMeterLevel(): number {
    const val = this.meter?.getValue()
    return Array.isArray(val) ? val[0] : (val ?? -Infinity)
  }

  get metronomeActive() { return this._metronomeActive }

  // ── Read-only state (consumed by UI + tests) ──────────────────────────────
  get instrument(): InstrumentName { return this._instrument }
  get tradition():  TraditionType  { return this._tradition  }
}

// Singleton guard — prevents accidental double-instantiation
let _instance: AudioEngine | null = null

export function getAudioEngine(): AudioEngine | null {
  if (typeof window === 'undefined') return null
  if (!_instance) _instance = new AudioEngine()
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
