import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const toPosix = (id: string) => id.replace(/\\/g, '/')

// The workspace-kit chunk (see codeSplitting below), with the dependencies
// only these files use: left out, each lands in a tiny chunk of its own.
const WORKSPACE_KIT = [
  '/src/components/ui/tabs.tsx',
  '/src/components/ui/ModeToggle.tsx',
  '/src/components/canvas/useResolveColour.ts',
  '/src/components/layout/LargerScreenNotice.tsx',
  '/src/utils/studyCondition.ts',
  '/src/services/badgeService.ts',
  '/src/components/ui/BadgeIcon.tsx',
  '/src/data/badges.ts',
  '/@radix-ui/react-tabs/dist/index.mjs',
]

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
        // Measured on opening a topic from Home (3.1D): the route fetched
        // eight chunks, five of them under 6 KB. Now it fetches two:
        // - CodeMirror is lazy (CodeEditorInput), so only Code Mode loads it.
        // - d3 has no vendor chunk: only the canvas uses it, so the default
        //   splitter puts it in the canvas chunk instead of its own request.
        // - workspace-kit: small modules the workspace shares with one or two
        //   other routes, which the splitter would otherwise emit as one tiny
        //   chunk apiece. Home, /auth and those routes load it (about 7 KB
        //   gzipped) so the workspace does not need five extra requests.
        //   includeDependenciesRecursively is off so the group takes only
        //   these files: on, it drags in their shared dependencies (radix,
        //   the store) and every page that uses those then loads this chunk.
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
        codeSplitting: {
          groups: [
            { name: 'vendor-query', test: /[\\/]node_modules[\\/]@tanstack[\\/]/ },
            { name: 'vendor-react', test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom|scheduler)[\\/]/ },
            {
              name: 'workspace-kit',
              test: (id) => WORKSPACE_KIT.some((file) => toPosix(id).endsWith(file)) || /\/framer-motion\/dist\/es\/(components\/AnimatePresence|utils\/use-composed-ref)/.test(toPosix(id)),
              includeDependenciesRecursively: false,
            },
          ],
        },
      },
    },
  },
})
