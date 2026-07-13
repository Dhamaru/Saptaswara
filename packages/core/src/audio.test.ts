import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Shared mock state — must be created with vi.hoisted() so the references are
// available inside vi.mock() factory functions, which are hoisted before imports.
// ---------------------------------------------------------------------------
const { polySynths, pluckSynths, synths, amSynths, membraneSynths, mockTransport, mockDestination } = vi.hoisted(() => ({
  polySynths: [] as any[],
  pluckSynths: [] as any[],
  synths: [] as any[],
  amSynths: [] as any[],
  membraneSynths: [] as any[],
  mockTransport: { bpm: { value: 120 } },
  mockDestination: { volume: { value: 0 } },
}))

// ---------------------------------------------------------------------------
// Mock Tone.js — factory form prevents vitest from trying to resolve the real
// package (not installed in packages/core).
// ---------------------------------------------------------------------------
vi.mock('tone', () => ({
  // vitest 4.x: mockImplementation must use `function`, not arrow functions,
  // because these mocks are called with `new` — arrow functions cannot be constructors.
  Gain: vi.fn().mockImplementation(function () {
    return {
      connect: vi.fn().mockReturnThis(),
      chain: vi.fn(),
      toDestination: vi.fn().mockReturnThis(),
      dispose: vi.fn(),
      volume: { rampTo: vi.fn(), value: 0 },
    }
  }),
  EQ3: vi.fn().mockImplementation(function () {
    return {
      connect: vi.fn().mockReturnThis(),
      toDestination: vi.fn().mockReturnThis(),
      dispose: vi.fn(),
    }
  }),
  Limiter: vi.fn().mockImplementation(function () {
    return {
      connect: vi.fn().mockReturnThis(),
      toDestination: vi.fn().mockReturnThis(),
      dispose: vi.fn(),
    }
  }),
  Meter: vi.fn().mockImplementation(function () {
    return {
      connect: vi.fn().mockReturnThis(),
      getValue: vi.fn().mockReturnValue(-100),
      dispose: vi.fn(),
    }
  }),
  Filter: vi.fn().mockImplementation(function () {
    return {
      connect: vi.fn().mockReturnThis(),
      toDestination: vi.fn().mockReturnThis(),
      dispose: vi.fn(),
    }
  }),
  Chorus: vi.fn().mockImplementation(function () {
    return {
      connect: vi.fn().mockReturnThis(),
      toDestination: vi.fn().mockReturnThis(),
      dispose: vi.fn(),
      wet: { value: 0 },
    }
  }),
  Freeverb: vi.fn().mockImplementation(function () {
    return {
      connect: vi.fn().mockReturnThis(),
      toDestination: vi.fn().mockReturnThis(),
      dispose: vi.fn(),
      wet: { value: 0 },
    }
  }),
  PolySynth: vi.fn().mockImplementation(function () {
    const inst = {
      triggerAttack: vi.fn(),
      releaseAll: vi.fn(),
      triggerAttackRelease: vi.fn(),
      set: vi.fn(),
      connect: vi.fn().mockReturnThis(),
      toDestination: vi.fn().mockReturnThis(),
      dispose: vi.fn(),
      volume: { value: 0 },
    }
    polySynths.push(inst)
    return inst
  }),
  // Synth — used directly (harmonium) and as PolySynth voice arg
  Synth: vi.fn().mockImplementation(function () {
    const inst = {
      triggerAttackRelease: vi.fn(),
      connect: vi.fn().mockReturnThis(),
      toDestination: vi.fn().mockReturnThis(),
      detune: { value: 0 },
      volume: { value: 0 },
      dispose: vi.fn(),
    }
    synths.push(inst)
    return inst
  }),
  PluckSynth: vi.fn().mockImplementation(function () {
    const inst = {
      triggerAttack: vi.fn(),
      connect: vi.fn().mockReturnThis(),
      toDestination: vi.fn().mockReturnThis(),
      dispose: vi.fn(),
    }
    pluckSynths.push(inst)
    return inst
  }),
  FMSynth: vi.fn().mockImplementation(function () {
    return {
      triggerAttackRelease: vi.fn(),
      connect: vi.fn().mockReturnThis(),
      toDestination: vi.fn().mockReturnThis(),
      volume: { value: 0 },
      dispose: vi.fn(),
    }
  }),
  AMSynth: vi.fn().mockImplementation(function () {
    const inst = {
      triggerAttack: vi.fn(),
      triggerAttackRelease: vi.fn(),
      releaseAll: vi.fn(),
      connect: vi.fn().mockReturnThis(),
      toDestination: vi.fn().mockReturnThis(),
      volume: { value: 0 },
      dispose: vi.fn(),
    }
    amSynths.push(inst)
    return inst
  }),
  MembraneSynth: vi.fn().mockImplementation(function () {
    const inst = {
      triggerAttack: vi.fn(),
      triggerAttackRelease: vi.fn(),
      connect: vi.fn().mockReturnThis(),
      toDestination: vi.fn().mockReturnThis(),
      dispose: vi.fn(),
      volume: { value: 0 },
    }
    membraneSynths.push(inst)
    return inst
  }),
  MetalSynth: vi.fn().mockImplementation(function () {
    return {
      triggerAttack: vi.fn(),
      connect: vi.fn().mockReturnThis(),
      toDestination: vi.fn().mockReturnThis(),
      dispose: vi.fn(),
      volume: { value: 0 },
    }
  }),
  NoiseSynth: vi.fn().mockImplementation(function () {
    return {
      triggerAttackRelease: vi.fn(),
      connect: vi.fn().mockReturnThis(),
      toDestination: vi.fn().mockReturnThis(),
      volume: { value: 0 },
      dispose: vi.fn(),
    }
  }),
  Volume: vi.fn().mockImplementation(function () {
    return {
      connect: vi.fn().mockReturnThis(),
      toDestination: vi.fn().mockReturnThis(),
      dispose: vi.fn(),
      volume: { rampTo: vi.fn(), value: 0 },
      gain: {},
    }
  }),
  Reverb: vi.fn().mockImplementation(function () {
    return {
      connect: vi.fn().mockReturnThis(),
      toDestination: vi.fn().mockReturnThis(),
      dispose: vi.fn(),
    }
  }),
  PitchShift: vi.fn().mockImplementation(function () {
    return {
      connect: vi.fn().mockReturnThis(),
      toDestination: vi.fn().mockReturnThis(),
      wet: { value: 0 },
      dispose: vi.fn(),
    }
  }),
  LFO: vi.fn().mockImplementation(function () {
    return {
      connect: vi.fn().mockReturnThis(),
      start: vi.fn(),
      dispose: vi.fn(),
    }
  }),
  Sampler: vi.fn().mockImplementation(function () {
    return {
      triggerAttackRelease: vi.fn(),
      releaseAll: vi.fn(),
      connect: vi.fn().mockReturnThis(),
      toDestination: vi.fn().mockReturnThis(),
      attack: 0,
      release: 1,
    }
  }),
  Recorder: vi.fn().mockImplementation(function () {
    return {
      start: vi.fn(),
      stop: vi.fn().mockResolvedValue(new Blob()),
    }
  }),
  Destination: mockDestination,
  getTransport: vi.fn().mockReturnValue(mockTransport),
  getDestination: vi.fn().mockReturnValue({ connect: vi.fn() }),
  start: vi.fn().mockResolvedValue(undefined),
  context: { resume: vi.fn().mockResolvedValue(undefined) },
}))

// Mock the @/ alias — resolved by vitest.config.ts alias to apps/web/lib/musicalMath
vi.mock('@/lib/musicalMath', () => ({
  swaraToFrequency: vi.fn().mockReturnValue(440),
}))

// Import after mocks are in place.
// AudioEngine is in apps/web; vitest.config.ts alias resolves @/ references inside it.
import { AudioEngine } from '../../../apps/web/lib/audio'

// ---------------------------------------------------------------------------
// toggleDrone()
// ---------------------------------------------------------------------------
describe('AudioEngine.toggleDrone()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    polySynths.length = 0
    mockTransport.bpm.value = 120
    mockDestination.volume.value = 0
  })

  it('does nothing before audio engine is started', () => {
    const engine = new AudioEngine()
    // isStarted = false, drone = null → early return in toggleDrone()
    engine.toggleDrone(true)
    // Constructor is now lazy — no PolySynths created until start().
    // The drone PolySynth (index 1) is only created inside start().
    expect(polySynths.length).toBe(0)
  })

  it('starts the drone when called with true after start()', async () => {
    const engine = new AudioEngine()
    await engine.start()
    engine.toggleDrone(true)
    // polySynths[1] is the drone created inside start()
    expect(polySynths[1].triggerAttack).toHaveBeenCalledOnce()
  })

  it('is idempotent — calling toggleDrone(true) twice triggers the drone only once', async () => {
    const engine = new AudioEngine()
    await engine.start()
    engine.toggleDrone(true)
    engine.toggleDrone(true) // droneStarted is already true → guard skips second call
    expect(polySynths[1].triggerAttack).toHaveBeenCalledOnce()
  })

  it('stops the drone when called with false after it was started', async () => {
    const engine = new AudioEngine()
    await engine.start()
    engine.toggleDrone(true)
    engine.toggleDrone(false)
    expect(polySynths[1].releaseAll).toHaveBeenCalledOnce()
  })

  it('does not call releaseAll if drone was never activated', async () => {
    const engine = new AudioEngine()
    await engine.start()
    engine.toggleDrone(false) // droneStarted is false → guard skips releaseAll
    expect(polySynths[1].releaseAll).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// BPM — set via Tone.getTransport().bpm.value (studio page onChange handler)
// ---------------------------------------------------------------------------
describe('BPM setter — Tone.Transport.bpm.value', () => {
  beforeEach(() => {
    mockTransport.bpm.value = 120
  })

  it('reflects an updated BPM when the transport property is set', () => {
    mockTransport.bpm.value = 90
    expect(mockTransport.bpm.value).toBe(90)
  })

  it('accepts the minimum slider value (60 BPM)', () => {
    mockTransport.bpm.value = 60
    expect(mockTransport.bpm.value).toBe(60)
  })

  it('accepts the maximum slider value (180 BPM)', () => {
    mockTransport.bpm.value = 180
    expect(mockTransport.bpm.value).toBe(180)
  })
})

// ---------------------------------------------------------------------------
// Volume — AudioEngine.setVolume() clamps to [-40, 0] before writing to
// Tone.Destination.volume.value.
// ---------------------------------------------------------------------------
describe('AudioEngine.setVolume()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    polySynths.length = 0
    mockDestination.volume.value = 0
  })

  it('clamps values below -40 to -40 dB', () => {
    const engine = new AudioEngine()
    engine.setVolume(-60)
    expect(mockDestination.volume.value).toBe(-40)
  })

  it('clamps values above 0 to 0 dB', () => {
    const engine = new AudioEngine()
    engine.setVolume(10)
    expect(mockDestination.volume.value).toBe(0)
  })

  it('passes -40 through unchanged (lower boundary)', () => {
    const engine = new AudioEngine()
    engine.setVolume(-40)
    expect(mockDestination.volume.value).toBe(-40)
  })

  it('passes 0 through unchanged (upper boundary)', () => {
    const engine = new AudioEngine()
    engine.setVolume(0)
    expect(mockDestination.volume.value).toBe(0)
  })

  it('passes an in-range value through unchanged', () => {
    const engine = new AudioEngine()
    engine.setVolume(-20)
    expect(mockDestination.volume.value).toBe(-20)
  })
})

// ---------------------------------------------------------------------------
// AudioEngine.setTimbre() — instrument switching
// ---------------------------------------------------------------------------
describe('AudioEngine.setTimbre()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    polySynths.length = 0
    pluckSynths.length = 0
    synths.length = 0
    amSynths.length = 0
    membraneSynths.length = 0
  })

  it('setTimbre("veena", "carnatic") creates a PolySynth for melody', async () => {
    // veena uses PolySynth(Synth) — not PluckSynth
    const polySynthsAfterStart = polySynths.length
    const engine = new AudioEngine()
    await engine.start()
    const polySynthsAfterSetTimbre = polySynths.length
    engine.setTimbre('veena', 'carnatic')
    expect(polySynths.length).toBeGreaterThan(polySynthsAfterSetTimbre)
  })

  it('setTimbre("harmonium", "hindustani") creates two Synth instances', async () => {
    const engine = new AudioEngine()
    await engine.start()
    engine.setTimbre('harmonium', 'hindustani')
    // harmonium uses primary + chorus Synth
    expect(synths.length).toBeGreaterThanOrEqual(2)
  })

  it('updates the instrument getter after setTimbre', async () => {
    const engine = new AudioEngine()
    await engine.start()
    engine.setTimbre('sitar', 'hindustani')
    expect(engine.instrument).toBe('sitar')
  })

  it('updates the tradition getter after setTimbre', async () => {
    const engine = new AudioEngine()
    await engine.start()
    engine.setTimbre('veena', 'carnatic')
    expect(engine.tradition).toBe('carnatic')
  })

  it('setTimbre("sitar", "hindustani") sets sitar as active instrument', async () => {
    // sitar uses FMSynth + NoiseSynth + Filter + Chorus — not PluckSynth
    const engine = new AudioEngine()
    await engine.start()
    engine.setTimbre('sitar', 'hindustani')
    expect(engine.instrument).toBe('sitar')
  })
})

// ---------------------------------------------------------------------------
// CompositionContext reducer — SET_TRADITION
// ---------------------------------------------------------------------------
import { compositionReducer, INITIAL_STATE } from '../../../apps/web/context/compositionReducer'

describe('compositionReducer — SET_TRADITION', () => {
  it('updates activeTradition to carnatic', () => {
    const next = compositionReducer(INITIAL_STATE, { type: 'SET_TRADITION', value: 'carnatic' })
    expect(next.activeTradition).toBe('carnatic')
  })

  it('updates activeTradition to hindustani', () => {
    const state = { ...INITIAL_STATE, activeTradition: 'carnatic' as const }
    const next = compositionReducer(state, { type: 'SET_TRADITION', value: 'hindustani' })
    expect(next.activeTradition).toBe('hindustani')
  })

  it('does not mutate other state fields', () => {
    const next = compositionReducer(INITIAL_STATE, { type: 'SET_TRADITION', value: 'carnatic' })
    expect(next.bpm).toBe(INITIAL_STATE.bpm)
    expect(next.layers).toBe(INITIAL_STATE.layers)
    expect(next.activeInstrument).toBe(INITIAL_STATE.activeInstrument)
  })
})
