import './globals.css'
import type { Metadata } from 'next'
import Script from 'next/script'
import { Manrope, DM_Sans, DM_Mono, Space_Grotesk } from 'next/font/google'
import Navbar from '@/components/Navbar'
import AuthListener from '@/components/AuthListener'
import SupabaseWarmup from '@/components/SupabaseWarmup'
import { PlaybackProvider } from '@/context/PlaybackContext'
import { ToastProvider } from '@/components/Toast'
import { GlobalAssistantProvider } from '@/context/GlobalAssistantContext'
import { GlobalAssistant } from '@/components/GlobalAssistant'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ScriptProvider } from '@/context/ScriptContext'

const manrope = Manrope({ 
  subsets: ['latin'],
  variable: '--font-manrope'
})

const dmSans = DM_Sans({ 
  subsets: ['latin'],
  variable: '--font-dm-sans'
})

const dmMono = DM_Mono({ 
  weight: ['300', '400', '500'],
  subsets: ['latin'],
  variable: '--font-dm-mono'
})

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-space-grotesk'
})

export const metadata: Metadata = {
  title: 'Saptaswara | Raga-Guided Music Creation',
  description: 'Create and explore Indian Classical Music with AI-assisted Raga guidance.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Saptaswara',
  },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#7c3aed" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
        <Script id="theme-init" strategy="beforeInteractive">{`try{var t=localStorage.getItem('saptaswara-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}`}</Script>
      </head>
      <body className={`${manrope.variable} ${dmSans.variable} ${dmMono.variable} ${spaceGrotesk.variable} font-sans bg-background text-on-surface min-h-screen selection:bg-primary/30 antialiased transition-colors duration-300`}>
        <ThemeProvider>
        <ScriptProvider>
        <PlaybackProvider>
          <GlobalAssistantProvider>
          <AuthListener />
          <SupabaseWarmup />
          <ToastProvider>
          {/* Ambient Background Elements */}
          <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-mesh opacity-60"></div>
            <div className="absolute inset-0 noise-texture"></div>
            <div className="layout-orb-top absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-primary-container/10 blur-[120px] rounded-full"></div>
            <div className="layout-orb-bottom absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-900/10 blur-[120px] rounded-full"></div>
          </div>

          <Navbar />
          <main className="relative z-10 pt-16 md:pt-20">
            {children}
          </main>
          <GlobalAssistant />
          </ToastProvider>
          </GlobalAssistantProvider>
        </PlaybackProvider>
        </ScriptProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

