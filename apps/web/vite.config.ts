import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        // rolldown-vite's manualChunks only accepts the function form, not
        // the record-of-arrays shorthand rollup itself supports.
        //
        // radix-ui and framer-motion are deliberately NOT grouped into their
        // own vendor chunks. Both are used only inside lazy route subtrees
        // (radix beyond the root Tooltip, framer-motion everywhere it
        // appears), and forcing a manual chunk name for either pulled in
        // more than intended: a 'vendor-radix' bucket would merge every
        // route's radix primitives behind the one Tooltip that IS eager at
        // the app root, and a 'vendor-motion' bucket ended up bundling a
        // duplicate CJS-interop copy of React alongside it and got
        // eagerly modulepreloaded on every page, including /auth, which
        // never renders anything animated. Left to the default splitter,
        // each lands only in the chunk(s) of the routes that actually
        // import it - verified live via Network timing on /auth.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (/[\\/]d3[\\/]/.test(id)) return 'vendor-d3'
          if (/[\\/]@tanstack[\\/]/.test(id)) return 'vendor-query'
          if (/[\\/](react|react-dom|react-router-dom|scheduler)[\\/]/.test(id)) return 'vendor-react'
          return undefined
        },
      },
    },
  },
})
