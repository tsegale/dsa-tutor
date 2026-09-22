import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Mirrors vite.config.ts's own resolve.alias - vitest does not read that
// file, so any test reaching a module with an '@/...' import (tileBuilder.ts,
// for one) failed to resolve at all until this matched it.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
