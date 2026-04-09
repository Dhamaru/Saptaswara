import type { Tala } from '@saptaswara/core'

/**
 * Six common Hindustani talas with full structural metadata.
 * Laya BPM ranges are approximate — performers vary by gharana.
 */
export const TALAS: Tala[] = [
  {
    name: 'Teentaal',
    matras: 16,
    samBeat: 1,
    vibhags: [
      { size: 4, type: 'tali',  label: 'X' },   // beats 1–4   (sam)
      { size: 4, type: 'tali',  label: '2' },   // beats 5–8
      { size: 4, type: 'khali', label: '0' },   // beats 9–12  (khali)
      { size: 4, type: 'tali',  label: '3' },   // beats 13–16
    ],
    laya: { vilambit: [30, 60], madhya: [60, 120], drut: [120, 200] },
  },
  {
    name: 'Jhaptaal',
    matras: 10,
    samBeat: 1,
    vibhags: [
      { size: 2, type: 'tali',  label: 'X' },   // beats 1–2   (sam)
      { size: 3, type: 'tali',  label: '2' },   // beats 3–5
      { size: 2, type: 'khali', label: '0' },   // beats 6–7   (khali)
      { size: 3, type: 'tali',  label: '3' },   // beats 8–10
    ],
    laya: { vilambit: [40, 70], madhya: [70, 130], drut: [130, 200] },
  },
  {
    name: 'Rupak',
    matras: 7,
    samBeat: 1,
    vibhags: [
      { size: 3, type: 'khali', label: '0' },   // beats 1–3   (sam = khali — unique)
      { size: 2, type: 'tali',  label: '2' },   // beats 4–5
      { size: 2, type: 'tali',  label: '3' },   // beats 6–7
    ],
    laya: { vilambit: [40, 80], madhya: [80, 140], drut: [140, 220] },
  },
  {
    name: 'Ektaal',
    matras: 12,
    samBeat: 1,
    vibhags: [
      { size: 2, type: 'tali',  label: 'X' },   // beats 1–2   (sam)
      { size: 2, type: 'tali',  label: '2' },   // beats 3–4
      { size: 2, type: 'khali', label: '0' },   // beats 5–6   (khali)
      { size: 2, type: 'khali', label: '0' },   // beats 7–8   (khali)
      { size: 2, type: 'tali',  label: '3' },   // beats 9–10
      { size: 2, type: 'tali',  label: '4' },   // beats 11–12
    ],
    laya: { vilambit: [25, 50], madhya: [50, 100], drut: [100, 180] },
  },
  {
    name: 'Keherwa',
    matras: 8,
    samBeat: 1,
    vibhags: [
      { size: 4, type: 'tali',  label: 'X' },   // beats 1–4   (sam)
      { size: 4, type: 'khali', label: '0' },   // beats 5–8   (khali)
    ],
    laya: { vilambit: [60, 90], madhya: [90, 150], drut: [150, 240] },
  },
  {
    name: 'Dadra',
    matras: 6,
    samBeat: 1,
    vibhags: [
      { size: 3, type: 'tali',  label: 'X' },   // beats 1–3   (sam)
      { size: 3, type: 'khali', label: '0' },   // beats 4–6   (khali)
    ],
    laya: { vilambit: [60, 100], madhya: [100, 160], drut: [160, 240] },
  },
]

export const DEFAULT_TALA = TALAS[0] // Teentaal

/** Get a tala by name, falling back to Teentaal */
export function getTala(name: string): Tala {
  return TALAS.find(t => t.name === name) ?? DEFAULT_TALA
}

/**
 * For a given tala, return the vibhag index and local position of each matra.
 * Result[i] = { vibhagIdx, posInVibhag, isFirst, type, label }
 */
export function expandTala(tala: Tala) {
  const cells: {
    matraIdx: number
    vibhagIdx: number
    posInVibhag: number
    isFirstInVibhag: boolean
    isSam: boolean
    type: 'tali' | 'khali'
    label: string
  }[] = []

  let matra = 0
  tala.vibhags.forEach((v, vi) => {
    for (let p = 0; p < v.size; p++) {
      cells.push({
        matraIdx: matra,
        vibhagIdx: vi,
        posInVibhag: p,
        isFirstInVibhag: p === 0,
        isSam: matra === tala.samBeat - 1,
        type: v.type,
        label: v.label,
      })
      matra++
    }
  })

  return cells
}
