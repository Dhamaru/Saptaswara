'use client'

import { AudioInputSelector } from '@/components/AudioInputSelector'

export type StudioTrackType = 'vocal' | 'melody' | 'rhythm'
export type TrackInputMode = 'mix' | 'external'

export interface TrackSummary {
  id: string
  type: StudioTrackType
  name: string
  muted: boolean
  soloed: boolean
  armed: boolean
  startTime: number
  endTime: number | null
  inputMode: TrackInputMode
  volume: number
  pan: number
}

interface TrackInsertPanelProps {
  tracks: TrackSummary[]
  activeTrackId: string
  onAddTrack: (type: StudioTrackType) => void
  onSelectTrack: (id: string) => void
  onMoveTrack: (id: string, direction: -1 | 1) => void
  onUpdateTrack: (id: string, patch: Partial<TrackSummary>) => void
  audioDeviceId: string
  onAudioDeviceChange: (deviceId: string) => void
}

const OPTIONS: Array<{ type: StudioTrackType; label: string; icon: string; description: string }> = [
  { type: 'vocal', label: 'Vocals', icon: 'mic', description: 'Record voice or an external mic/interface' },
  { type: 'melody', label: 'Piano', icon: 'piano', description: 'Play the on-screen instrument' },
  { type: 'rhythm', label: 'Tabla', icon: 'music_note', description: 'Build or play a rhythm layer' },
]

export function TrackInsertPanel({ tracks, activeTrackId, onAddTrack, onSelectTrack, onMoveTrack, onUpdateTrack, audioDeviceId, onAudioDeviceChange }: TrackInsertPanelProps) {
  const activeTrack = tracks.find(track => track.id === activeTrackId) ?? tracks[0]

  return (
    <section data-testid="track-insert-panel" className="mb-4 min-w-0 overflow-hidden rounded-2xl bg-surface-container-low/35 border border-outline-variant/10 p-3 md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-on-surface-variant/45 font-bold">Add a track</div>
          <p className="mt-1 text-xs text-on-surface-variant/55">Choose one or more layers for this composition.</p>
        </div>
        {activeTrack && (
          <div className="font-mono text-[8px] uppercase tracking-wider text-primary/60">Editing: {activeTrack.name}</div>
        )}
      </div>

      <div className="grid min-w-0 grid-cols-1 sm:grid-cols-3 gap-2">
        {OPTIONS.map(option => {
          const existing = tracks.find(track => track.type === option.type)
          const selected = existing?.id === activeTrackId
          return (
            <button
              key={option.type}
              data-testid={`add-track-${option.type}`}
              onClick={() => existing ? onSelectTrack(existing.id) : onAddTrack(option.type)}
              className={`flex min-w-0 overflow-hidden items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${selected ? 'bg-primary/12 border-primary/35' : 'border-outline-variant/10 hover:border-primary/25 hover:bg-primary/5'}`}
            >
              <span className={`material-symbols-outlined !text-lg ${selected ? 'text-primary' : 'text-on-surface-variant/45'}`}>{option.icon}</span>
              <span className="min-w-0">
                <span className="block font-mono text-[9px] uppercase tracking-wider font-bold text-on-surface">{option.label}</span>
                <span className="block mt-0.5 text-[10px] text-on-surface-variant/45 truncate">{existing ? 'Select this track' : option.description}</span>
              </span>
              {existing && <span className="ml-auto text-[9px] text-secondary">✓</span>}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {tracks.map((track, index) => (
          <div key={track.id} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 ${track.id === activeTrackId ? 'border-primary/30 bg-primary/8' : 'border-outline-variant/10 bg-on-surface/[.02]'}`}>
            <button onClick={() => onSelectTrack(track.id)} className="font-mono text-[8px] uppercase tracking-wider text-on-surface/75">{track.name}</button>
            <button title="Move track up" disabled={index === 0} onClick={() => onMoveTrack(track.id, -1)} className="text-on-surface-variant/35 hover:text-primary disabled:opacity-20">↑</button>
            <button title="Move track down" disabled={index === tracks.length - 1} onClick={() => onMoveTrack(track.id, 1)} className="text-on-surface-variant/35 hover:text-primary disabled:opacity-20">↓</button>
          </div>
        ))}
      </div>

      {activeTrack && (
        <div className="mt-3 pt-3 border-t border-outline-variant/8 flex flex-wrap items-end gap-3">
          <label className="font-mono text-[8px] uppercase tracking-wider text-on-surface-variant/45">Start (sec)
            <input type="number" min="0" step="0.1" value={activeTrack.startTime} onChange={e => onUpdateTrack(activeTrack.id, { startTime: Number(e.target.value) || 0 })} className="mt-1 block w-20 rounded-lg border border-outline-variant/15 bg-surface-container-low px-2 py-1.5 text-xs text-on-surface" />
          </label>
          <label className="font-mono text-[8px] uppercase tracking-wider text-on-surface-variant/45">End (sec)
            <input type="number" min="0" step="0.1" placeholder="loop" value={activeTrack.endTime ?? ''} onChange={e => onUpdateTrack(activeTrack.id, { endTime: e.target.value ? Number(e.target.value) : null })} className="mt-1 block w-20 rounded-lg border border-outline-variant/15 bg-surface-container-low px-2 py-1.5 text-xs text-on-surface" />
          </label>
          <button onClick={() => onUpdateTrack(activeTrack.id, { armed: !activeTrack.armed })} className={`rounded-lg border px-3 py-2 font-mono text-[8px] uppercase tracking-wider ${activeTrack.armed ? 'border-red-400/40 bg-red-500/15 text-red-300' : 'border-outline-variant/15 text-on-surface-variant/50'}`}>{activeTrack.armed ? 'Record armed' : 'Arm record'}</button>
          <button onClick={() => onUpdateTrack(activeTrack.id, { muted: !activeTrack.muted })} className={`rounded-lg border px-3 py-2 font-mono text-[8px] uppercase tracking-wider ${activeTrack.muted ? 'border-amber-400/35 text-amber-300' : 'border-outline-variant/15 text-on-surface-variant/50'}`}>{activeTrack.muted ? 'Muted' : 'Mute'}</button>
          <button onClick={() => onUpdateTrack(activeTrack.id, { soloed: !activeTrack.soloed })} className={`rounded-lg border px-3 py-2 font-mono text-[8px] uppercase tracking-wider ${activeTrack.soloed ? 'border-secondary/35 text-secondary' : 'border-outline-variant/15 text-on-surface-variant/50'}`}>{activeTrack.soloed ? 'Soloed' : 'Solo'}</button>
          <label className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-wider text-on-surface-variant/45">Vol
            <input aria-label="Track volume" type="range" min="-40" max="0" value={activeTrack.volume} onChange={e => onUpdateTrack(activeTrack.id, { volume: Number(e.target.value) })} className="w-20 accent-primary" />
          </label>
          <label className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-wider text-on-surface-variant/45">Pan
            <input aria-label="Track pan" type="range" min="-1" max="1" step="0.1" value={activeTrack.pan} onChange={e => onUpdateTrack(activeTrack.id, { pan: Number(e.target.value) })} className="w-16 accent-primary" />
          </label>
          <div className="ml-auto flex items-center gap-1 rounded-lg border border-outline-variant/10 p-1">
            <button onClick={() => onUpdateTrack(activeTrack.id, { inputMode: 'external' })} className={`rounded-md px-2 py-1.5 font-mono text-[8px] uppercase tracking-wider ${activeTrack.inputMode === 'external' ? 'bg-primary/15 text-primary' : 'text-on-surface-variant/40'}`}>External only</button>
            <button onClick={() => onUpdateTrack(activeTrack.id, { inputMode: 'mix' })} className={`rounded-md px-2 py-1.5 font-mono text-[8px] uppercase tracking-wider ${activeTrack.inputMode === 'mix' ? 'bg-primary/15 text-primary' : 'text-on-surface-variant/40'}`}>Full mix</button>
          </div>
          <AudioInputSelector value={audioDeviceId} onChange={onAudioDeviceChange} />
        </div>
      )}
    </section>
  )
}
