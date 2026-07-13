'use client'

import { useMemo, useState, useRef, useEffect } from 'react'

interface Raga {
  id: string
  name: string
  thaat?: string | null
  tradition?: string | null
  time_of_day?: string | null
  modern_moods?: string[]
}

interface Props {
  ragas: Raga[]
  selectedId?: string | null
  onSelect: (raga: Raga) => void
}

const THAAT_COLORS: Record<string, string> = {
  Kalyan:    '#a78bfa',
  Bilawal:   '#34d399',
  Khamaj:    '#f59e0b',
  Bhairav:   '#60a5fa',
  Poorvi:    '#f97316',
  Marwa:     '#e879f9',
  Kafi:      '#2dd4bf',
  Asavari:   '#fb7185',
  Bhairavi:  '#a3e635',
  Todi:      '#facc15',
}

const DEFAULT_COLOR = '#94a3b8'

function getColor(thaat: string | null | undefined): string {
  if (!thaat) return DEFAULT_COLOR
  return THAAT_COLORS[thaat] ?? DEFAULT_COLOR
}

const TIME_ICONS: Record<string, string> = {
  MORNING:   '🌅',
  AFTERNOON: '☀️',
  EVENING:   '🌆',
  NIGHT:     '🌙',
}

export default function RagaGraph({ ragas, selectedId, onSelect }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; raga: Raga } | null>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 })

  const W = 900
  const H = 600
  const CX = W / 2
  const CY = H / 2

  const { nodes, edges, thaatCenters } = useMemo(() => {
    // Group by thaat
    const groups: Record<string, Raga[]> = {}
    for (const r of ragas) {
      const key = r.thaat || 'Unknown'
      if (!groups[key]) groups[key] = []
      groups[key].push(r)
    }

    const thaatKeys = Object.keys(groups).sort()
    const numThaats = thaatKeys.length
    const ORBIT_R = Math.min(CX, CY) * 0.62

    const thaatCenters: Record<string, { x: number; y: number; color: string }> = {}
    const nodes: { raga: Raga; x: number; y: number; color: string }[] = []
    const edges: { x1: number; y1: number; x2: number; y2: number; color: string }[] = []

    thaatKeys.forEach((thaat, ti) => {
      const angle = (ti / numThaats) * 2 * Math.PI - Math.PI / 2
      const tx = CX + ORBIT_R * Math.cos(angle)
      const ty = CY + ORBIT_R * Math.sin(angle)
      const color = getColor(thaat === 'Unknown' ? null : thaat)
      thaatCenters[thaat] = { x: tx, y: ty, color }

      const members = groups[thaat]
      const count = members.length
      const NODE_R = Math.min(60, 28 + count * 3)

      members.forEach((raga, ri) => {
        let nx: number, ny: number
        if (count === 1) {
          nx = tx; ny = ty
        } else {
          const a = (ri / count) * 2 * Math.PI
          nx = tx + NODE_R * Math.cos(a)
          ny = ty + NODE_R * Math.sin(a)
        }
        nodes.push({ raga, x: nx, y: ny, color })
        // Edge from thaat center to node
        edges.push({ x1: tx, y1: ty, x2: nx, y2: ny, color })
      })
    })

    return { nodes, edges, thaatCenters }
  }, [ragas, CX, CY])

  // Zoom on wheel
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setZoom(z => Math.max(0.4, Math.min(3, z - e.deltaY * 0.001)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  function onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return
    dragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return
    setPan({
      x: dragStart.current.px + (e.clientX - dragStart.current.x),
      y: dragStart.current.py + (e.clientY - dragStart.current.y),
    })
  }

  function onMouseUp() { dragging.current = false }

  const transform = `translate(${pan.x},${pan.y}) scale(${zoom})`

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-outline-variant/10 bg-surface-lowest/60 backdrop-blur-md">
      {/* Legend */}
      <div className="absolute top-3 left-4 z-10 flex flex-wrap gap-2 max-w-[60%]">
        {Object.entries(thaatCenters).slice(0, 10).map(([thaat, { color }]) => (
          <span key={thaat} className="inline-flex items-center gap-1 font-mono text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full border" style={{ borderColor: color + '40', color, backgroundColor: color + '15' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            {thaat}
          </span>
        ))}
      </div>

      {/* Zoom hint */}
      <div className="absolute bottom-3 right-4 z-10 font-mono text-[8px] uppercase tracking-widest text-on-surface-variant/20">
        Scroll to zoom · Drag to pan
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 480, cursor: dragging.current ? 'grabbing' : 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <g transform={transform}>
          {/* Subtle radial grid */}
          {[0.25, 0.5, 0.75, 1].map(r => (
            <circle
              key={r}
              cx={CX} cy={CY}
              r={Math.min(CX, CY) * 0.62 * r}
              fill="none"
              stroke="white"
              strokeOpacity={0.03}
              strokeWidth={1}
            />
          ))}

          {/* Edges */}
          {edges.map((e, i) => (
            <line
              key={i}
              x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke={e.color}
              strokeOpacity={0.15}
              strokeWidth={1}
            />
          ))}

          {/* Thaat cluster labels */}
          {Object.entries(thaatCenters).map(([thaat, { x, y, color }]) => (
            <text
              key={thaat}
              x={x} y={y - 18}
              textAnchor="middle"
              fill={color}
              fillOpacity={0.5}
              fontSize={8}
              fontFamily="monospace"
              style={{ textTransform: 'uppercase', letterSpacing: 2, pointerEvents: 'none', userSelect: 'none' }}
            >
              {thaat}
            </text>
          ))}

          {/* Raga nodes */}
          {nodes.map(({ raga, x, y, color }) => {
            const isSelected = raga.id === selectedId
            const timeIcon = TIME_ICONS[raga.time_of_day?.toUpperCase() ?? ''] ?? ''
            return (
              <g
                key={raga.id}
                transform={`translate(${x},${y})`}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelect(raga)}
                onMouseEnter={(e) => {
                  const svg = svgRef.current
                  if (!svg) return
                  const rect = svg.getBoundingClientRect()
                  const scaleX = rect.width / W
                  const scaleY = rect.height / H
                  setTooltip({
                    x: (x * zoom + pan.x) * scaleX,
                    y: (y * zoom + pan.y) * scaleY,
                    raga,
                  })
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                {/* Glow ring for selected */}
                {isSelected && (
                  <circle r={11} fill="none" stroke={color} strokeWidth={2} strokeOpacity={0.8} />
                )}
                {/* Node dot */}
                <circle
                  r={isSelected ? 8 : 5}
                  fill={color}
                  fillOpacity={isSelected ? 1 : 0.55}
                  stroke={color}
                  strokeWidth={isSelected ? 0 : 1}
                  strokeOpacity={0.4}
                />
                {/* Raga name label */}
                <text
                  y={18}
                  textAnchor="middle"
                  fill="white"
                  fillOpacity={isSelected ? 0.95 : 0.45}
                  fontSize={isSelected ? 9 : 7.5}
                  fontWeight={isSelected ? 700 : 400}
                  fontFamily="sans-serif"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {timeIcon} {raga.name}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none px-3 py-2 rounded-xl border border-outline-variant/20 bg-surface-container/90 backdrop-blur-md shadow-xl"
          style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
        >
          <div className="font-display text-sm font-semibold text-on-surface">{tooltip.raga.name}</div>
          {tooltip.raga.thaat && (
            <div className="font-mono text-[9px] uppercase tracking-widest mt-0.5" style={{ color: getColor(tooltip.raga.thaat) }}>
              {tooltip.raga.thaat} thaat
            </div>
          )}
          {tooltip.raga.modern_moods?.length ? (
            <div className="font-sans text-[10px] text-on-surface-variant/60 mt-1">
              {tooltip.raga.modern_moods.slice(0, 3).join(' · ')}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
