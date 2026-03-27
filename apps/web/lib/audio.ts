import * as Tone from 'tone'

/**
 * AudioEngine - Manages the musical synthesis and playback
 */
export class AudioEngine {
  private synth: Tone.PolySynth
  private isStarted = false

  constructor() {
    this.synth = new Tone.PolySynth(Tone.Synth).toDestination()
    this.synth.set({
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.5,
        release: 0.8
      }
    })
  }

  async start() {
    if (this.isStarted) return
    await Tone.start()
    this.isStarted = true
    console.log('Audio engine started')
  }

  playSwara(frequency: number, duration = '4n') {
    if (!this.isStarted) return
    this.synth.triggerAttackRelease(frequency, duration)
  }

  stopAll() {
    this.synth.releaseAll()
  }
}

// Singleton instance for the app
export const audioEngine = typeof window !== 'undefined' ? new AudioEngine() : null
