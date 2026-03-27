import * as Tone from 'tone'

const SAMPLES_URL = 'https://tonejs.github.io/audio/salamander/'
const NOTES = ['A0', 'C1', 'Ds1', 'Fs1', 'A1', 'C2', 'Ds2', 'Fs2', 'A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4', 'C5', 'Ds5', 'Fs5', 'A5', 'C6', 'Ds6', 'Fs6', 'A7']

const INSTRUMENT_PRESETS = {
  piano: { attack: 0.01, release: 0.8 },
  harmonium: { attack: 0.05, release: 1.2 },
  sitar: { attack: 0.01, release: 0.4 }
}

/**
 * AudioEngine - Manages the musical synthesis and playback
 */
export class AudioEngine {
  private sampler: Tone.Sampler
  private isStarted = false
  private isLoading = true

  constructor() {
    const urls: Record<string, string> = {}
    NOTES.forEach(note => {
      // Map note to its filename, e.g., 'Ds1' -> 'Ds1.mp3'
      // For Tone.Sampler keys, we use D# instead of Ds
      const key = note.replace('s', '#')
      urls[key] = `${note}.mp3`
    })

    this.sampler = new Tone.Sampler({
      urls,
      baseUrl: SAMPLES_URL,
      onload: () => {
        this.isLoading = false
        console.log('Instrument samples loaded')
      },
      attack: 0.01,
      release: 0.5
    }).toDestination()
  }

  async start() {
    if (this.isStarted) return
    await Tone.start()
    this.isStarted = true
    console.log('Audio engine started')
    if (this.isLoading) {
      console.log('Loading instrument...')
    }
  }

  setInstrument(type: keyof typeof INSTRUMENT_PRESETS) {
    const preset = INSTRUMENT_PRESETS[type]
    if (preset) {
      this.sampler.attack = preset.attack
      this.sampler.release = preset.release
      console.log(`Instrument set to: ${type}`)
    }
  }

  getLoadingStatus() {
    return this.isLoading ? 'Loading instrument...' : 'Ready'
  }

  getInstrument() {
    return this.sampler
  }

  playSwara(frequency: number, duration = '4n') {
    if (!this.isStarted || this.isLoading || !frequency || frequency <= 0) return
    try {
      this.sampler.triggerAttackRelease(frequency, duration)
    } catch (err) {
      console.warn('Playback error:', err)
    }
  }

  stopAll() {
    this.sampler.releaseAll()
  }
}

// Singleton instance for the app
export const audioEngine = typeof window !== 'undefined' ? new AudioEngine() : null

// Direct export as requested
export const getInstrument = () => audioEngine?.getInstrument() || null
