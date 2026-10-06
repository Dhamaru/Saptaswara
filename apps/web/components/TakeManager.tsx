'use client'

export interface TakeSummary { id: string; name: string; source: string; duration: number; createdAt: string }

interface TakeManagerProps { takes: TakeSummary[]; onRename: (id: string, name: string) => void; onDelete: (id: string) => void }

export function TakeManager({ takes, onRename, onDelete }: TakeManagerProps) {
  return (
    <section data-testid="take-manager" className="rounded-2xl border border-outline-variant/10 bg-surface-container-low/30 p-3 md:p-4">
      <div className="flex items-center justify-between mb-3">
        <div><div className="font-mono text-[8px] uppercase tracking-[0.2em] text-on-surface-variant/45 font-bold">Takes</div><p className="mt-1 text-xs text-on-surface-variant/55">Saved recording sessions for the selected track.</p></div>
        <span className="font-mono text-[8px] text-on-surface-variant/35">{takes.length} take{takes.length === 1 ? '' : 's'}</span>
      </div>
      {takes.length === 0 ? <p className="rounded-xl border border-dashed border-outline-variant/10 px-3 py-4 text-center text-xs text-on-surface-variant/40">Record a take to see it here.</p> : <div className="space-y-2">{takes.map(take => <div key={take.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-on-surface/[.03] px-3 py-2"><input value={take.name} onChange={e => onRename(take.id, e.target.value)} className="min-w-[140px] flex-1 bg-transparent font-mono text-[9px] text-on-surface outline-none" /><span className="font-mono text-[8px] text-on-surface-variant/40">{take.source} · {take.duration}s</span><button onClick={() => onDelete(take.id)} className="font-mono text-[8px] text-red-300/60 hover:text-red-300">Delete</button></div>)}</div>}
    </section>
  )
}
