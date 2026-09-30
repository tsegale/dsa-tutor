import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { isOwnChunkFailure, reloadOnceForStaleChunk } from './utils/chunkReload'

// Vite fires this when a code-split chunk (or its CSS) fails to load -
// typically a deploy landing mid-session. Reload once for the fresh index
// rather than leave a broken page; a repeat within the window surfaces.
// Only for our own chunks: Vite also wraps third-party dynamic imports
// (Pyodide fetches its runtime from a CDN this way), and a CDN failure is
// not a stale deploy - reloading hid that error instead of surfacing it.
window.addEventListener('vite:preloadError', (event) => {
  if (!isOwnChunkFailure(String(event.payload?.message ?? ''), window.location.origin)) return
  if (reloadOnceForStaleChunk()) event.preventDefault()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
