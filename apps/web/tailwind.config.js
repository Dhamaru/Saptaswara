/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#c3c0ff',
          container: '#4338ca',
        },
        secondary: {
          DEFAULT: '#84d6b9',
          container: '#026951',
        },
        tertiary: {
          DEFAULT: '#ffb59e',
          container: '#8e3416',
        },
        error: {
          DEFAULT: '#ffb4ab',
          container: '#93000a',
        },
        background: '#0e0e10',
        surface: '#131315',
        // Shorthand aliases used throughout components
        'surface-lowest':  '#0e0e10',
        'surface-highest': '#353437',
        // Full Material Design surface scale
        'surface-container-lowest':  '#0e0e10',
        'surface-container-low':     '#1b1b1d',
        'surface-container':         '#201f21',
        'surface-container-high':    '#2a2a2c',
        'surface-container-highest': '#353437',
        'surface-bright':   '#39393b',
        'surface-variant':  '#353437',
        'on-surface':         '#e5e1e4',
        'on-surface-variant': '#c7c4d7',
        'on-primary':         '#1a0070',
        outline:         '#918fa0',
        'outline-variant': '#464554',
      },
      fontFamily: {
        sans:     ['var(--font-manrope)', 'system-ui', 'sans-serif'],
        display:  ['var(--font-dm-sans)', 'sans-serif'],
        headline: ['var(--font-manrope)', 'sans-serif'],
        label:    ['var(--font-space-grotesk)', 'sans-serif'],
        mono:     ['var(--font-dm-mono)', 'monospace'],
      },
      // Let Tailwind defaults drive border-radius (rounded-lg=8px, rounded-xl=12px, etc.)
      // Do NOT override — components use Tailwind defaults + explicit arbitrary values
      boxShadow: {
        'glow':        '0 0 40px -8px rgba(195, 192, 255, 0.25)',
        'glow-sm':     '0 0 20px -6px rgba(195, 192, 255, 0.18)',
        'inner-glow':  'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        'step-active': '0 0 0 2px rgba(195, 192, 255, 0.6), 0 0 16px 2px rgba(195, 192, 255, 0.2)',
      },
      animation: {
        'float':          'float 6s ease-in-out infinite',
        'glow-pulse':     'glow-pulse 3s ease-in-out infinite',
        'slide-up':       'slide-up 0.5s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'fade-in':        'fade-in 0.6s ease-out',
        'shimmer':        'shimmer 2s linear infinite',
        'beat-ring':      'beat-ring 0.25s ease-out forwards',
        'beat-pulse':     'beat-pulse var(--beat-duration, 0.5s) ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%':      { opacity: '1' },
        },
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'slide-in-right': {
          '0%':   { opacity: '0', transform: 'translateX(40px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        // Expanding ring from the active sequencer step
        'beat-ring': {
          '0%':   { transform: 'scale(1)',    opacity: '0.8' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
        // Subtle scale pulse on BPM counter synced to playback
        'beat-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%':      { transform: 'scale(1.06)' },
        },
      },
    },
  },
  plugins: [],
}
