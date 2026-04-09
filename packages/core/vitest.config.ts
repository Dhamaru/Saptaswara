import { defineConfig } from 'vitest/config'
import path from 'path'

// Resolves the @/ alias used in apps/web source files so that
// cross-package imports in tests (e.g. audio.ts → @/lib/musicalMath)
// are handled without needing a full Next.js build environment.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../apps/web'),
    },
  },
  test: {
    environment: 'node',
    transformMode: {
      web: [/\.tsx$/],
    },
  },
})
