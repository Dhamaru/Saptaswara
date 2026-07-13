export default function Loading() {
  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="flex items-center gap-2">
          {['सा', 'रे', 'ग', 'म', 'प', 'ध', 'नी'].map((s, i) => (
            <span
              key={i}
              className="font-display text-2xl text-primary/40 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {s}
            </span>
          ))}
        </div>
        <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-on-surface-variant/30 animate-pulse">
          Loading…
        </p>
      </div>
    </div>
  )
}
