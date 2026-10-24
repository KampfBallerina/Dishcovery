import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque'
import './styles.css'
import { App } from './ui/App'
import { finishLogin } from './sync/dropbox'
import { startAutoSync } from './sync/sync'

// iOS may evict storage of rarely used web apps; ask to keep it.
navigator.storage?.persist?.()

finishLogin()
  .catch((e) => console.error('Dropbox login failed', e))
  .finally(startAutoSync)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
