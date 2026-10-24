import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque'
import './styles.css'
import { App } from './ui/App'
import { finishLogin } from './sync/dropbox'
import { startAutoSync } from './sync/sync'
import { checkHousehold } from './sync/household'

// iOS may evict storage of rarely used web apps; ask to keep it.
navigator.storage?.persist?.()

finishLogin()
  .then(checkHousehold)
  .catch((e) => console.error('Dropbox setup failed', e))
  .finally(startAutoSync)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
