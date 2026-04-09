'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-6 text-center p-12">
          <div className="w-16 h-16 rounded-full bg-error/10 border border-error/20 flex items-center justify-center">
            <span className="material-symbols-outlined !text-3xl text-error/60">error</span>
          </div>
          <div>
            <h2 className="font-display text-2xl font-light text-on-surface mb-2">Something broke.</h2>
            <p className="font-sans text-sm text-on-surface-variant/60 font-light max-w-sm">
              {this.state.error?.message || 'An unexpected error occurred in the studio.'}
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-6 py-3 bg-primary/10 border border-primary/20 rounded-xl font-mono text-[10px] uppercase tracking-widest text-primary hover:bg-primary/20 transition-all"
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
