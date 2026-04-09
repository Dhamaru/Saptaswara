/**
 * Standard Swara abbreviations
 */
export type Swara = 'S' | 'r' | 'R' | 'g' | 'G' | 'm' | 'M' | 'P' | 'd' | 'D' | 'n' | 'N' | "S'";

// ── Ornament system ───────────────────────────────────────────────────────────

export type OrnamentType =
  | 'meend'     // continuous pitch glide between two swaras
  | 'andolan'   // slow asymmetric oscillation on a single swara
  | 'gamak'     // rapid forceful alternation between adjacent swaras
  | 'kan'       // brief grace touch of adjacent swara before arrival
  | 'murki'     // quick descending cluster landing on main swara
  | 'khatka'    // sharp percussive snap between adjacent pitches
  | 'sparsh'    // light ascending grace approach
  | 'pratyahat' // light descending grace approach

export interface OrnamentHint {
  type: OrnamentType
  from?: string        // source swara (for meend / kan)
  speed?: number       // 0–1  (slow → fast)
  depth?: number       // 0–1  (shallow → deep)
  direction?: 'up' | 'down'
}

// ── Raga grammar (Stage 1 — note metadata layer) ─────────────────────────────

export type SwaraWeight = 'vadi' | 'samvadi' | 'normal' | 'avoid'
export type SwaraDirection = 'aroha' | 'avaroha' | 'both'

export interface SwaraMetadata {
  name: string               // 'Ga', 'komal Ga', 'Ma tivra', etc.
  direction: SwaraDirection
  weight: SwaraWeight
  nyasa: boolean             // valid melodic resting point
  varjya: boolean            // forbidden in this raga (even if in scale)
  andolan?: {                // oscillation required on this swara
    rate: number             // Hz  (~1.5 for Darbari, ~2.5 for Bhairavi)
    depth: number            // semitones (0.3 – 0.8 typical)
  }
  ornamentMap?: {
    required?: OrnamentHint
    permitted?: OrnamentHint[]
    forbidden?: OrnamentType[]
  }
}

export interface RagaGrammar {
  swaras: SwaraMetadata[]
  pakad: Swara[]             // canonical characteristic phrase
  chalan: Swara[][]          // 2–3 characteristic movement phrases
  transitions?: Record<string, string[]>  // Stage 3 — swara → valid next swaras
}

// ── Tala system ───────────────────────────────────────────────────────────────

export type VibhagType = 'tali' | 'khali'  // clap or empty/wave

export interface Vibhag {
  size: number               // matras in this division
  type: VibhagType
  label: string              // traditional bol marker label
}

export interface Tala {
  name: string               // 'Teentaal', 'Jhaptaal', etc.
  matras: number             // total beat count per avartana
  vibhags: Vibhag[]
  samBeat: number            // 1-indexed position of sam
  laya: {
    vilambit: [number, number]  // [min, max] BPM range
    madhya: [number, number]
    drut: [number, number]
  }
}

// ── Swara event (unified composition model) ───────────────────────────────────

export type SwaraRegister = 'mandra' | 'madhya' | 'taar'

export interface SwaraEvent {
  swara: string              // 'Sa', 'komal Re', 'Ma tivra', etc.
  register: SwaraRegister
  duration: string           // Tone.js notation: '4n', '8n', '2n', etc.
  velocity: number           // 0–1
  ornament?: OrnamentHint
}

// ── Standard Raga Metadata interface ─────────────────────────────────────────

export interface Raga {
  id: string;
  name: string;
  thaat: string;
  aroha: Swara[];
  avaroha: Swara[];
  vadi: Swara;
  samvadi: Swara;
  pakad?: Swara[];
  time_of_day: string;
  mood: string;
  prahara: number;
  semitones: number[];
  hz_map: Record<Swara, number>;
  verified: boolean;
  phrases?: { label: string; sequence: Swara[] }[];
  raga_phrases?: { label: string; sequence: Swara[] }[];
  tradition?: 'Hindustani' | 'Carnatic';
  melakarta_number?: number;
  // Stage 1 grammar enrichment (optional — populated incrementally)
  grammar?: RagaGrammar;
}

/**
 * Project and Layer types
 */
export interface Project {
  id: string;
  user_id: string;
  title: string;
  raga_id: string;
  bpm: number;
  created_at: string;
}

export interface Layer {
  id: string;
  project_id: string;
  name: string;
  instrument: string;
  volume: number;
  muted: boolean;
  pan: number;
}
