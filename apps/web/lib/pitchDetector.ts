'use client'

export type PitchResult = { hz: number; confidence: number } | null

/**
 * Autocorrelation-based pitch detector (Optimized).
 * BUG-033 fix: Only calculate correlations for the lags we actually care about (40Hz - 1000Hz).
 */
export function detectPitch(analyser: AnalyserNode, sampleRate: number): PitchResult {
  const bufferSize = analyser.fftSize
  const buffer = new Float32Array(bufferSize)
  analyser.getFloatTimeDomainData(buffer)

  // Energy calculation (correlations[0])
  let energy = 0
  for (let i = 0; i < bufferSize; i++) energy += buffer[i] * buffer[i]
  const rms = Math.sqrt(energy / bufferSize)
  if (rms < 0.01) return null

  // Find range of lags for 40Hz - 1000Hz
  const minLag = Math.floor(sampleRate / 1000)
  const maxLag = Math.floor(sampleRate / 40)

  let peakLag = -1
  let peakVal = -Infinity

  // Calculate correlations only in the needed range
  // We also need to find the first zero-crossing or trough to avoid the "lag 0" peak
  let foundTrough = false
  let prevCorr = energy

  for (let lag = 1; lag <= maxLag; lag++) {
    let sum = 0
    // Optimization: avoid out-of-bounds checks in inner loop
    const limit = bufferSize - lag
    for (let i = 0; i < limit; i++) sum += buffer[i] * buffer[i + lag]
    
    const corr = sum

    if (!foundTrough) {
      if (corr < prevCorr && corr < 0) foundTrough = true
      prevCorr = corr
    } else if (lag >= minLag) {
      if (corr > peakVal) {
        peakVal = corr
        peakLag = lag
      }
      // Simple early exit if signal starts dropping significantly
      if (peakLag !== -1 && corr < peakVal * 0.8) break
    }
  }

  if (peakLag === -1 || peakVal <= 0) return null

  const confidence = peakVal / energy
  if (confidence < 0.8) return null

  // Parabolic interpolation for sub-sample precision
  // We need the values before and after peakLag
  let prevVal = 0
  for (let i = 0; i < bufferSize - (peakLag - 1); i++) prevVal += buffer[i] * buffer[i + peakLag - 1]
  let nextVal = 0
  for (let i = 0; i < bufferSize - (peakLag + 1); i++) nextVal += buffer[i] * buffer[i + peakLag + 1]

  const delta = (nextVal - prevVal) / (2 * (2 * peakVal - prevVal - nextVal) || 1)
  const refinedLag = peakLag + delta

  return { hz: sampleRate / refinedLag, confidence }
}

/**
 * Manages a Web Audio pipeline for continuous pitch detection.
 */
export class PitchListener {
  private ctx: AudioContext | null = null
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private analyser: AnalyserNode | null = null
  private rafId: number | null = null

  async start(onPitch: (result: PitchResult) => void): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      this.ctx = new AudioContext()
      this.source = this.ctx.createMediaStreamSource(this.stream)
      this.analyser = this.ctx.createAnalyser()
      this.analyser.fftSize = 2048
      this.source.connect(this.analyser)

      const tick = () => {
        if (!this.analyser || !this.ctx || !this.stream) return
        onPitch(detectPitch(this.analyser, this.ctx.sampleRate))
        // BUG-034: re-check after onPitch — stop() may have been called during the callback
        if (this.analyser && this.ctx && this.stream) {
          this.rafId = requestAnimationFrame(tick)
        }
      }
      tick()
    } catch (err) {
      console.error('PitchListener failed to start:', err)
      this.stop()
      throw err
    }
  }

  // BUG-034 fix: Ensure all resources are closed and refs nulled
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    if (this.source) {
      this.source.disconnect()
      this.source = null
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop())
      this.stream = null
    }
    if (this.ctx) {
      if (this.ctx.state !== 'closed') {
        this.ctx.close().catch(() => {})
      }
      this.ctx = null
    }
    this.analyser = null
  }
}

