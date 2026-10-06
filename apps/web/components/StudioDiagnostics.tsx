'use client'

interface StudioDiagnosticsProps {
  isStarted: boolean
  isRecording: boolean
  recordingTime: number
}

export function StudioDiagnostics({ isStarted, isRecording, recordingTime }: StudioDiagnosticsProps) {
  return (
    <section data-testid="studio-diagnostics" className="p-5 rounded-3xl bg-surface-container-low/40 border border-outline-variant/10">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant/40 font-bold">Technician view · signal path</div>
          <h3 className="mt-1 text-lg font-display text-on-surface">Recording session</h3>
        </div>
        <span className={`px-2.5 py-1 rounded-full font-mono text-[8px] uppercase tracking-wider ${isRecording ? 'bg-red-500/15 text-red-300' : 'bg-on-surface/5 text-on-surface-variant/50'}`}>{isRecording ? 'capturing' : 'ready'}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="p-3 rounded-xl bg-on-surface/5"><div className="text-[8px] uppercase text-on-surface-variant/40">Engine</div><div className="mt-1 font-mono text-xs">{isStarted ? 'ready' : 'not started'}</div></div>
        <div className="p-3 rounded-xl bg-on-surface/5"><div className="text-[8px] uppercase text-on-surface-variant/40">Input</div><div className="mt-1 font-mono text-xs">mic / instrument</div></div>
        <div className="p-3 rounded-xl bg-on-surface/5"><div className="text-[8px] uppercase text-on-surface-variant/40">Monitor</div><div className="mt-1 font-mono text-xs">meter + recorder</div></div>
        <div className="p-3 rounded-xl bg-on-surface/5"><div className="text-[8px] uppercase text-on-surface-variant/40">Take time</div><div className="mt-1 font-mono text-xs">{recordingTime}s</div></div>
      </div>
      <p className="mt-3 text-xs text-on-surface-variant/50">External microphone or instrument input is recorded into the take and is not routed back to speakers.</p>
    </section>
  )
}
