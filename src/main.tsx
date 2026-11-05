import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initEngine } from './engine'
import { App } from './App'
import './styles/global.css'

// The engine boots outside React so it exists exactly once, before any component mounts.
initEngine()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
