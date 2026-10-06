'use client'

export interface TimelineTrack {
  id: string
  name: string
  color: string
  startTime: number
  endTime: number | null
  active: boolean
}

interface ArrangementTimelineProps {
  tracks: TimelineTrack[]
  playheadSeconds: number
  durationSeconds: number
  onSelectTrack: (id: string) => void
  onMoveTrack: (id: string, direction: -1 | 1) => void
}

export function ArrangementTimeline({ tracks, playheadSeconds, durationSeconds, onSelectTrack, onMoveTrack }: ArrangementTimelineProps) {
  const safeDuration = Math.max(durationSeconds, 1)
  return (
    <section data-testid="arrangement-timeline" className="rounded-2xl border border-outline-variant/10 bg-surface-container-low/30 p-3 md:p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-on-surface-variant/45 font-bold">Arrangement</div>
          <p className="mt-1 text-xs text-on-surface-variant/55">Tracks, takes, and placement on one time ruler.</p>
        </div>
        <span className="font-mono text-[8px] text-primary/60">{playheadSeconds.toFixed(1)}s / {safeDuration.toFixed(1)}s</span>
      </div>
      <div className="relative overflow-x-auto">
        <div className="min-w-[520px]">
          <div className="ml-28 h-5 flex items-end justify-between px-1 font-mono text-[7px] text-on-surface-variant/30">
            {Array.from({ length: 9 }, (_, index) => <span key={index}>{((safeDuration / 8) * index).toFixed(1)}s</span>)}
          </div>
          <div className="relative space-y-1">
            <div className="pointer-events-none absolute inset-y-0 z-10 w-px bg-primary/70" style={{ left: `calc(7rem + (100% - 7rem) * ${Math.min(1, Math.max(0, playheadSeconds / safeDuration))})` }} />
            {tracks.map((track, index) => {
              const start = Math.max(0, track.startTime)
              const end = Math.max(start + 0.1, track.endTime ?? safeDuration)
              return (
                <div key={track.id} className="flex items-center gap-2 h-8">
                  <button onClick={() => onSelectTrack(track.id)} className={`w-28 shrink-0 truncate text-left rounded-lg px-2 py-1 font-mono text-[8px] uppercase tracking-wider ${track.active ? 'bg-primary/12 text-primary' : 'text-on-surface-variant/50'}`}>{track.name}</button>
                  <div className="relative h-6 flex-1 rounded-md bg-on-surface/[.03]">
                    <div className="absolute top-0.5 bottom-0.5 rounded-md border border-primary/30 bg-primary/15" style={{ left: `${(start / safeDuration) * 100}%`, width: `${Math.max(1, ((end - start) / safeDuration) * 100)}%` }} />
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button disabled={index === 0} onClick={() => onMoveTrack(track.id, -1)} className="text-[10px] text-on-surface-variant/35 disabled:opacity-20">↑</button>
                    <button disabled={index === tracks.length - 1} onClick={() => onMoveTrack(track.id, 1)} className="text-[10px] text-on-surface-variant/35 disabled:opacity-20">↓</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
