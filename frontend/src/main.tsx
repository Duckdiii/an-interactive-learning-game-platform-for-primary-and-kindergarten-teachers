import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { warnMockMode } from './config/mockMode.ts'
import AppProviders from './providers/AppProviders.tsx'
import { installMockDevTools } from './services/mock/mockRuntime.ts'

warnMockMode()
installMockDevTools()

if (import.meta.env.DEV && !localStorage.getItem('auth_user')) {
  localStorage.setItem(
    'auth_user',
    JSON.stringify({
      teacherId: 'teacher-1',
      fullName: 'Cô Nguyễn Mai Hương',
      email: 'huong.nguyen@primary.edu.vn',
    }),
  )
  localStorage.setItem('accessToken', 'mock-access-token-dev')
  localStorage.setItem('refreshToken', 'mock-refresh-token-dev')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
