export const NOTES_IN_OCTAVE = [
  { name: 'Sa',  offset: 0,  isBlack: false },
  { name: 're',  offset: 1,  isBlack: true,  label: 'rk' },
  { name: 'Re',  offset: 2,  isBlack: false },
  { name: 'ga',  offset: 3,  isBlack: true,  label: 'gk' },
  { name: 'Ga',  offset: 4,  isBlack: false },
  { name: 'Ma',  offset: 5,  isBlack: false },
  { name: 'ma',  offset: 6,  isBlack: true,  label: 'M#' },
  { name: 'Pa',  offset: 7,  isBlack: false },
  { name: 'dha', offset: 8,  isBlack: true,  label: 'dk' },
  { name: 'Dha', offset: 9,  isBlack: false },
  { name: 'ni',  offset: 10, isBlack: true,  label: 'nk' },
  { name: 'Ni',  offset: 11, isBlack: false },
];

/**
 * Normalizes any raw swara notation (including shorthands like 'r', 'R') 
 * to a canonical name matching NOTES_IN_OCTAVE.
 */
export function normalizeSwara(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();

  // 1. Direct hit on canonical names (Case Sensitive) — 're' vs 'Re'
  if (NOTES_IN_OCTAVE.some(n => n.name === trimmed)) return trimmed;

  // 2. Hindustani shorthand/notation mapping (Case Sensitive)
  // S = Sa, r = re, R = Re, g = ga, G = Ga, m = Ma, M = ma (tivra), P = Pa, d = dha, D = Dha, n = ni, N = Ni
  switch (trimmed) {
    case 's':
    case 'S': return 'Sa';
    case 'r': return 're';
    case 'R': return 'Re';
    case 'g': return 'ga';
    case 'G': return 'Ga';
    case 'm': return 'Ma';
    case 'M': return 'ma'; // Tivra
    case 'p':
    case 'P': return 'Pa';
    case 'd': return 'dha';
    case 'D': return 'Dha';
    case 'n': return 'ni';
    case 'N': return 'Ni';
  }

  // 3. Fallback to common aliases (Case Insensitive)
  const lower = trimmed.toLowerCase();
  
  // Specific alias list for messy data
  const ALIAS_MAP: Record<string, string> = {
    'sa': 'Sa',
    'rek': 're', 'r(k)': 're', 're1': 're', 'r1': 're',
    're': 'Re', 're2': 'Re', 'r2': 'Re',
    'gak': 'ga', 'g(k)': 'ga', 'ga1': 'ga', 'g1': 'ga',
    'ga': 'Ga', 'ga2': 'Ga', 'g2': 'Ga',
    'ma': 'Ma', 'ma1': 'Ma', 'm1': 'Ma',
    'ma#': 'ma', 'mat': 'ma', 'm#': 'ma', 'm2': 'ma',
    'pa': 'Pa',
    'dhak': 'dha', 'd(k)': 'dha', 'dha1': 'dha', 'd1': 'dha',
    'dha': 'Dha', 'dha2': 'Dha', 'd2': 'Dha',
    'nik': 'ni', 'n(k)': 'ni', 'ni1': 'ni', 'n1': 'ni',
    'ni': 'Ni', 'ni2': 'Ni', 'n2': 'Ni',
  };

  // Strip punctuation like brackets or single quotes before lookup
  const cleaned = lower.replace(/[\[\]()']/g, '');
  
  if (ALIAS_MAP[cleaned]) return ALIAS_MAP[cleaned];

  return trimmed; // Last resort: return as-is
}

/**
 * Converts any Hindustani / Carnatic Swara notation into a frequency in Hz.
 */
export function swaraToFrequency(
  swara: string,
  rootFreq: number = 261.63,
  baseOctave: number = 4
): number {
  if (!swara) return 0;

  let targetOctave = baseOctave;
  let rawStr = swara.trim();

  // Detect and strip octave markers
  if (rawStr.endsWith('^') || rawStr.endsWith("'")) {
    targetOctave += 1;
    rawStr = rawStr.replace(/[\^']+$/, '');
  }
  if (rawStr.startsWith('.') || rawStr.startsWith(',')) {
    targetOctave -= 1;
    rawStr = rawStr.replace(/^[.,]+/, '');
  }

  const canonical = normalizeSwara(rawStr);
  const note = NOTES_IN_OCTAVE.find(n => n.name === canonical);

  if (!note) return 0;

  return rootFreq * Math.pow(2, targetOctave - 4) * Math.pow(2, note.offset / 12);
}
