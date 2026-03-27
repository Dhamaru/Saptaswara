import Link from 'next/link'
import { Sparkles, Music, Brain, Wand2, ArrowRight, Play } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 dot-pattern opacity-30" />
      <div className="absolute top-20 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px]" />
      
      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center pt-32 pb-20 px-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 glass-gold rounded-full text-primary-light text-xs font-semibold tracking-wider uppercase mb-8 animate-fade-in">
          <div className="w-2 h-2 bg-primary rounded-full animate-glow-pulse" />
          120 Ragas • AI-Powered • Open Source
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black text-center leading-[0.9] tracking-tight max-w-5xl mb-8 animate-slide-up">
          <span className="text-gradient-hero">Raga-Guided</span>
          <br />
          <span className="text-white">Music Creation</span>
        </h1>
        
        <p className="text-lg md:text-xl text-white/40 max-w-2xl text-center leading-relaxed mb-12 animate-fade-in font-light">
          Saptaswara transforms Indian Classical Music theory into an interactive playground. 
          Explore ragas, compose with precision, and let AI enhance your creative journey.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 animate-slide-up">
          <Link href="/studio" className="btn-primary flex items-center gap-2 text-lg">
            <Play className="w-5 h-5" />
            Open Studio
          </Link>
          <Link href="/explore" className="btn-ghost flex items-center gap-2 text-lg">
            Explore Ragas
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Music,
              title: '120 Verified Ragas',
              desc: 'Structured metadata with Hz frequencies, swaras, aroha-avaroha, mood categorization, and time-of-day mappings.',
              gradient: 'from-primary/20 to-primary/5',
              iconBg: 'bg-primary/10 text-primary-light',
            },
            {
              icon: Brain,
              title: 'RAG AI Assistant',
              desc: 'Ask questions in natural language. Our vector search finds relevant raga context and Gemini crafts expert answers.',
              gradient: 'from-accent/20 to-accent/5',
              iconBg: 'bg-accent/10 text-accent-light',
            },
            {
              icon: Wand2,
              title: 'Digital Studio',
              desc: 'A 16-step sequencer locked to your selected raga\'s scale. Real-time Tone.js synthesis with save & load.',
              gradient: 'from-emerald-500/20 to-emerald-500/5',
              iconBg: 'bg-emerald-500/10 text-emerald-400',
            },
          ].map((feature, i) => (
            <div key={i} className="group card relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-2xl ${feature.iconBg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-white/40 leading-relaxed text-sm">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Strip */}
      <section className="relative z-10 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '120', label: 'Ragas' },
              { value: '768', label: 'Vector Dimensions' },
              { value: '10', label: 'Thaats' },
              { value: '∞', label: 'Compositions' },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-4xl font-black text-gradient-gold mb-1">{stat.value}</div>
                <div className="text-sm text-white/30 uppercase tracking-widest font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
