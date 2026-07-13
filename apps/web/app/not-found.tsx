'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="relative min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-6 overflow-hidden bg-background text-center">
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl" aria-hidden="true">
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary/20 to-primary-container/20 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}
        />
      </div>

      <div className="animate-fade-in space-y-8 max-w-lg">
        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-surface-container-high/40 border border-outline-variant/10 backdrop-blur-md">
          <span className="material-symbols-outlined !text-base text-primary/60">music_off</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.4em] text-primary/70 font-bold">Swara Not Found</span>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary/50 mb-3">404</p>
          <h1 className="font-display text-6xl md:text-8xl font-light text-on-surface tracking-tighter leading-tight mb-4">
            This note<br />
            <span className="italic text-primary/60">doesn't exist.</span>
          </h1>
          <p className="font-sans text-on-surface-variant/60 font-light leading-relaxed">
            The page you're looking for has drifted out of the raga. It may have moved or never existed.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="group px-8 py-4 rounded-2xl font-medium shadow-glow hover:scale-105 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: 'var(--on-primary)' }}
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined !text-xl">home</span>
              Return to Sa
            </span>
          </Link>
          <Link
            href="/library"
            className="px-8 py-4 bg-surface-container-high/40 border border-outline-variant/20 rounded-2xl font-medium text-on-surface hover:bg-surface-container-high transition-all"
          >
            Explore Ragas
          </Link>
        </div>

        <div className="flex items-center justify-center gap-3 pt-4 opacity-30">
          {['सा', 'रे', 'ग', 'म', 'प', 'ध', 'नी'].map((s, i) => (
            <span key={i} className="font-display text-lg text-primary">{s}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
