import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { reloadOnceForStaleChunk } from './utils/chunkReload'

// Vite fires this when a code-split chunk (or its CSS) fails to load -
// typically a deploy landing mid-session. Reload once for the fresh index
// rather than leave a broken page; a repeat within the window surfaces.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForStaleChunk()) event.preventDefault()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
