/**
 * Standard Swara abbreviations
 */
export type Swara = 'S' | 'r' | 'R' | 'g' | 'G' | 'm' | 'M' | 'P' | 'd' | 'D' | 'n' | 'N' | "S'";

/**
 * Standard Raga Metadata interface
 */
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
  prahar: number;
  semitones: number[];
  hz_map: Record<Swara, number>;
  verified: boolean;
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
