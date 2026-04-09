// Pure reducer + state types — no React, no JSX.
// Importable from node test environments without JSX transform.

export const STEPS = 16
export const DRAFT_STORAGE_KEY = 'saptaswara_draft'
const MAX_HISTORY = 50

export type LayerType     = 'melody' | 'rhythm' | 'drone'
export type TraditionType = 'carnatic' | 'hindustani'
export type InstrumentType =
  | 'piano'                                                    // Western
  | 'veena' | 'bansuri' | 'mridangam' | 'tambura'             // Carnatic
  | 'harmonium' | 'sarangi' | 'tabla' | 'sitar'               // Hindustani

export interface Layer {
  id: string
  type: LayerType
  name: string
  sequence: (any | null)[]
  visible: boolean
  muted: boolean
  soloed: boolean
}

const DEFAULT_LAYERS: Layer[] = [
  {
    id: '1', type: 'melody', name: 'Melody',
    sequence: new Array(STEPS).fill(null),
    visible: true, muted: false, soloed: false,
  },
  {
    id: '2', type: 'rhythm', name: 'Tabla',
    sequence: new Array(STEPS).fill(null),
    visible: true, muted: false, soloed: false,
  },
]

export interface CompositionState {
  layers: Layer[]
  bpm: number
  volume: number
  droneActive: boolean
  activeInstrument: InstrumentType
  activeTradition: TraditionType
  activeLayerId: string
  past: Layer[][]
  future: Layer[][]
}

export const INITIAL_STATE: CompositionState = {
  layers: DEFAULT_LAYERS,
  bpm: 120,
  volume: 0,
  droneActive: false,
  activeInstrument: 'harmonium',
  activeTradition: 'hindustani',
  activeLayerId: '1',
  past: [],
  future: [],
}

export type CompositionAction =
  | { type: 'TOGGLE_STEP'; layerId: string; stepIdx: number; value: any }
  | { type: 'SET_BPM'; value: number }
  | { type: 'SET_VOLUME'; value: number }
  | { type: 'SET_DRONE'; value: boolean }
  | { type: 'SET_INSTRUMENT'; value: InstrumentType }
  | { type: 'SET_TRADITION'; value: TraditionType }
  | { type: 'SET_ACTIVE_LAYER'; id: string }
  | { type: 'TOGGLE_MUTE'; layerId: string }
  | { type: 'TOGGLE_SOLO'; layerId: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | {
      type: 'LOAD_DRAFT'
      draft: Partial<Pick<
        CompositionState,
        'layers' | 'bpm' | 'volume' | 'droneActive' | 'activeInstrument' | 'activeTradition'
      >>
    }

export function compositionReducer(
  state: CompositionState,
  action: CompositionAction,
): CompositionState {
  switch (action.type) {
    case 'TOGGLE_STEP': {
      const newLayers = state.layers.map(l => {
        if (l.id !== action.layerId) return l
        const newSeq = [...l.sequence]
        newSeq[action.stepIdx] =
          newSeq[action.stepIdx]?.label === action.value.label ? null : action.value
        return { ...l, sequence: newSeq }
      })
      return {
        ...state,
        layers: newLayers,
        past: [...state.past.slice(-(MAX_HISTORY - 1)), state.layers],
        future: [],
      }
    }

    case 'SET_BPM':       return { ...state, bpm: action.value }
    case 'SET_VOLUME':    return { ...state, volume: action.value }
    case 'SET_DRONE':     return { ...state, droneActive: action.value }
    case 'SET_INSTRUMENT': return { ...state, activeInstrument: action.value }
    case 'SET_TRADITION':  return { ...state, activeTradition: action.value }
    case 'SET_ACTIVE_LAYER': return { ...state, activeLayerId: action.id }

    case 'TOGGLE_MUTE': {
      return {
        ...state,
        layers: state.layers.map(l =>
          l.id === action.layerId ? { ...l, muted: !l.muted } : l
        ),
      }
    }

    case 'TOGGLE_SOLO': {
      const wasSoloed = state.layers.find(l => l.id === action.layerId)?.soloed ?? false
      return {
        ...state,
        layers: state.layers.map(l => ({
          ...l,
          soloed: wasSoloed ? false : l.id === action.layerId,
        })),
      }
    }

    case 'UNDO': {
      if (state.past.length === 0) return state
      const previous = state.past[state.past.length - 1]
      return {
        ...state,
        layers: previous,
        past: state.past.slice(0, -1),
        future: [state.layers, ...state.future.slice(0, MAX_HISTORY - 1)],
      }
    }

    case 'REDO': {
      if (state.future.length === 0) return state
      const next = state.future[0]
      return {
        ...state,
        layers: next,
        past: [...state.past.slice(-(MAX_HISTORY - 1)), state.layers],
        future: state.future.slice(1),
      }
    }

    case 'LOAD_DRAFT':
      return { ...state, ...action.draft, past: [], future: [] }

    default:
      return state
  }
}
