import './globals.css'
import type { Metadata } from 'next'
import { Manrope, DM_Sans, DM_Mono, Space_Grotesk } from 'next/font/google'
import Navbar from '@/components/Navbar'
import AuthListener from '@/components/AuthListener'
import { PlaybackProvider } from '@/context/PlaybackContext'
import { ToastProvider } from '@/components/Toast'
import { GlobalAssistantProvider } from '@/context/GlobalAssistantContext'
import { GlobalAssistant } from '@/components/GlobalAssistant'

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
  icons: {
    icon: '/icon.png',
    shortcut: '/favicon.png',
    apple: '/icon.png',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      </head>
      <body className={`${manrope.variable} ${dmSans.variable} ${dmMono.variable} ${spaceGrotesk.variable} font-sans bg-background text-on-surface min-h-screen selection:bg-primary/30 antialiased`}>
        <PlaybackProvider>
          <GlobalAssistantProvider>
          <AuthListener />
          <ToastProvider>
          {/* Ambient Background Elements */}
          <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-mesh opacity-60"></div>
            <div className="absolute inset-0 noise-texture"></div>
            <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-primary-container/10 blur-[120px] rounded-full"></div>
            <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-900/10 blur-[120px] rounded-full"></div>
          </div>

          <Navbar />
          <main className="relative z-10 pt-16 md:pt-20">
            {children}
          </main>
          <GlobalAssistant />
          </ToastProvider>
          </GlobalAssistantProvider>
        </PlaybackProvider>
      </body>
    </html>
  )
}

