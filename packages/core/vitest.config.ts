import { defineConfig } from 'vitest/config'
import path from 'path'

// Resolves the @/ alias used in apps/web source files so that
// cross-package imports in tests (e.g. audio.ts → @/lib/musicalMath)
// are handled without needing a full Next.js build environment.
export default defineConfig({
  resolve: {
    alias: [
      // Route tests import web API files that import the workspace package by
      // name. Point that at source so tests do not require a prior core build.
      { find: /^@saptaswara\/core$/, replacement: path.resolve(__dirname, 'src/index.ts') },
      { find: '@', replacement: path.resolve(__dirname, '../../apps/web') },
    ],
  },
  test: {
    environment: 'node',
    transformMode: {
      web: [/\.tsx$/],
    },
  },
})
