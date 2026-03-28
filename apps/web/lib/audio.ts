import * as Tone from 'tone'

const SAMPLES_URL = 'https://tonejs.github.io/audio/salamander/'
const NOTES = ['A0', 'C1', 'Ds1', 'Fs1', 'A1', 'C2', 'Ds2', 'Fs2', 'A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4', 'C5', 'Ds5', 'Fs5', 'A5', 'C6', 'Ds6', 'Fs6', 'A7']

/**
 * AudioEngine - Manages the musical synthesis and playback
 */
export class AudioEngine {
  private sampler: Tone.Sampler
  private synth: Tone.PolySynth
  private tabla: Tone.Sampler | null = null
  private drone: Tone.PolySynth | null = null
  private isStarted = false
  private isLoading = true
  private droneStarted = false

  constructor() {
    // Initialize Fallback Synth immediately (always reliable)
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 }
    }).toDestination()

    const urls: Record<string, string> = {}
    NOTES.forEach(note => {
      const key = note.replace('s', '#')
      urls[key] = `${note}.mp3`
    })

    this.sampler = new Tone.Sampler({
      urls,
      baseUrl: SAMPLES_URL,
      onload: () => {
        this.isLoading = false
        console.log('AudioEngine: High-fidelity samples loaded')
      },
      onerror: (err) => {
        console.warn('AudioEngine: Failed to load external samples, using Synth fallback.', err)
        this.isLoading = false // Mark as 'not loading' so it doesn't block playback
      }
    }).toDestination()

    this.initTabla()
  }

  private initTabla() {
    this.tabla = new Tone.Sampler({
      urls: {
        "C2": "https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3",
        "G2": "https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3",
        "C3": "https://tonejs.github.io/audio/drum-samples/CR78/hihat.mp3",
      },
      onload: () => console.log('AudioEngine: Rhythm samples loaded')
    }).toDestination()
  }

  async start() {
    if (this.isStarted) return
    try {
      await Tone.start()
      Tone.Destination.volume.value = 0 // Ensure master is unmuted
      this.isStarted = true
      
      this.drone = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth4' },
        envelope: { attack: 2, release: 2 }
      }).toDestination()
      this.drone.set({ volume: -25 })

      // Play a very subtle startup chime to prove audio is active
      this.synth.triggerAttackRelease("C5", "8n", "+0.1", 0.1)
      
      console.log('AudioEngine: Context initialized successfully')
    } catch (err) {
      console.error('AudioEngine: Failed to start context:', err)
    }
  }

  // --- Melodic Methods ---
  playSwara(frequency: number, duration = '4n') {
    if (!this.isStarted || !frequency || frequency <= 0) return
    
    try {
      // If sampler is ready, use it. Otherwise fallback to Synth.
      if (!this.isLoading) {
        this.sampler.triggerAttackRelease(frequency, duration)
      } else {
        this.synth.triggerAttackRelease(frequency, duration)
      }
    } catch (err) {
      console.warn('AudioEngine: Playback error:', err)
    }
  }

  // --- Rhythm Methods ---
  playStroke(stroke: string) {
    if (!this.isStarted || !this.tabla) return
    const strokeMap: Record<string, string> = {
      'Dha': 'C2',
      'Na': 'G2',
      'Ti': 'C3',
      'Te': 'C3'
    }
    const note = strokeMap[stroke]
    if (note) {
      this.tabla.triggerAttackRelease(note, '8n')
    }
  }

  // --- Drone Methods ---
  toggleDrone(isActive: boolean, type: 'Sa-Pa' | 'Sa-Ma' = 'Sa-Pa', rootFreq: number = 440) {
    if (!this.isStarted || !this.drone) return

    if (!isActive) {
      if (this.droneStarted) {
        this.drone.releaseAll()
        this.droneStarted = false
      }
    } else {
      if (!this.droneStarted) {
        const frequencies = [rootFreq, rootFreq * 0.5, rootFreq * 2] 
        if (type === 'Sa-Pa') {
          frequencies.push(rootFreq * 1.5) 
        } else {
          frequencies.push(rootFreq * 1.334) 
        }
        this.drone.triggerAttack(frequencies)
        this.droneStarted = true
      }
    }
  }

  setInstrument(type: 'piano' | 'harmonium' | 'sitar') {
    const presets = {
      piano: { attack: 0.02, release: 1 },
      harmonium: { attack: 0.1, release: 1.5 },
      sitar: { attack: 0.01, release: 0.4 }
    }
    const preset = presets[type]
    if (preset) {
      this.synth.set({
        envelope: { attack: preset.attack, release: preset.release }
      })
      // If sampler is loaded, we could potentially switch sampler URLs here too
      // but for now, we'll just adjust the synth character
      this.sampler.attack = preset.attack
      this.sampler.release = preset.release
    }
    console.log(`AudioEngine: Instrument set to ${type}`)
  }

  stopAll() {
    this.sampler.releaseAll()
    this.synth.releaseAll()
    if (this.tabla) this.tabla.releaseAll()
    if (this.drone) {
      this.drone.releaseAll()
      this.droneStarted = false
    }
  }
}

export const audioEngine = typeof window !== 'undefined' ? new AudioEngine() : null
