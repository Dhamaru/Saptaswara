'use client'

import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="relative min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-6 overflow-hidden bg-background">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary/20 to-primary-container/20 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}></div>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 text-center max-w-5xl mx-auto mt-20 mb-32 animate-fade-in">
        <div className="inline-block px-4 py-1.5 mb-8 rounded-full bg-surface-container-high/40 border border-outline-variant/10 backdrop-blur-md">
          <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-primary/80">Aroha & Avaroha</span>
        </div>
        
        <h1 className="font-display text-7x1 md:text-9xl font-light text-on-surface tracking-tighter leading-[0.9] mb-10 text-glow">
          Create music <br />
          <span className="italic font-light opacity-90 text-primary-container brightness-150">guided by ragas.</span>
        </h1>
        
        <p className="font-sans text-lg md:text-xl text-on-surface-variant/70 max-w-2xl mx-auto font-light leading-relaxed mb-16 text-balance">
          Step into the Resonant Void. A high-fidelity studio environment where the mathematical precision of Indian classical scales meets modern synthesis.
        </p>

        <div className="flex flex-col sm:row items-center justify-center gap-6">
          <Link 
            href="/studio" 
            className="group relative px-12 py-5 bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] rounded-2xl font-medium text-white shadow-glow hover:scale-105 active:scale-95 transition-all overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative flex items-center gap-3">
              Start Creating
              <span className="material-symbols-outlined !text-2xl">arrow_forward</span>
            </span>
          </Link>
          <Link 
            href="/explore" 
            className="px-12 py-5 bg-surface-container-high/40 border border-outline-variant/20 rounded-2xl font-medium text-on-surface hover:bg-surface-container-high transition-all"
          >
            Explore Library
          </Link>
        </div>
      </section>

      {/* Simplified Bento Grid Refinement */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto w-full mb-32">
        <div className="lg:col-span-2 group relative h-80 bg-surface-lowest rounded-[40px] border border-outline-variant/5 hover:border-outline-variant/20 transition-all p-12 overflow-hidden shadow-2xl">
           <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,_#3B82F6_0%,_transparent_70%)]" />
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-200" />
           </div>
           
           <div className="relative z-20 h-full flex flex-col justify-between">
             <div>
               <span className="font-mono text-[10px] uppercase tracking-widest text-primary mb-6 block font-semibold opacity-60">Intelligent Engine</span>
               <h3 className="font-display text-5xl font-light text-on-surface mb-4 leading-tight">Harmonic <br/> constraints.</h3>
             </div>
             <p className="text-on-surface-variant font-light max-w-sm text-lg leading-relaxed opacity-80">
               Every note you play is dynamically mapped to the underlying raga structure in real-time.
             </p>
           </div>
        </div>
        
        <div className="group relative h-80 bg-surface-lowest rounded-[40px] border border-outline-variant/5 hover:border-outline-variant/20 transition-all p-12 flex flex-col justify-between overflow-hidden shadow-2xl">
           <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-primary/30 to-transparent" />
           </div>
           
           <div className="relative z-20">
             <span className="material-symbols-outlined text-primary mb-6 !text-4xl opacity-80">piano</span>
             <h3 className="font-display text-3xl font-light text-on-surface mb-2">Microtonal Tuning.</h3>
           </div>
           
           <div className="relative z-20 flex flex-col items-end mt-auto">
              <div className="flex items-end gap-1">
                <span className="font-mono text-5xl font-light text-on-surface tracking-tighter">108.0</span>
                <span className="font-mono text-[12px] uppercase text-primary/60 mb-2 font-bold tracking-widest">BPM</span>
              </div>
              <div className="flex gap-[2px] mt-4 w-24 h-6 items-center">
                 {[0.4, 0.7, 1.0, 0.8, 0.5, 0.9, 0.3, 0.6].map((h, i) => (
                    <div key={i} className="flex-1 bg-primary/30 rounded-full h-full" style={{ height: `${h * 100}%` }} />
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* Performance Statistics Row */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-8 mb-32 opacity-80 scale-95 origin-center">
         <div className="flex-1 flex flex-col gap-1 p-8 rounded-3xl bg-surface-container-lowest/20 border border-outline-variant/5">
            <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/60">Sample Rate</span>
            <span className="font-display text-3xl font-light text-on-surface">96.0 khz</span>
         </div>
         <div className="flex-1 flex flex-col gap-1 p-8 rounded-3xl bg-surface-container-lowest/20 border border-outline-variant/5">
            <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/60">Logic Engine</span>
            <span className="font-display text-3xl font-light text-on-surface">L-S1.0</span>
         </div>
         <div className="flex-1 flex flex-col gap-1 p-8 rounded-3xl bg-surface-container-lowest/20 border border-outline-variant/5">
            <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/60">Latency</span>
            <span className="font-display text-3xl font-light text-on-surface">24 ms</span>
         </div>
      </div>
    </div>
  )
}
