import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { warnMockMode } from './config/mockMode.ts'
import AppProviders from './providers/AppProviders.tsx'
import { installMockDevTools } from './services/mock/mockRuntime.ts'

warnMockMode()
installMockDevTools()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
