import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ROUTES } from '../routes/paths'

export default function AdminProtectedRoute({ children }: { children: ReactNode }) {
  const { user, token } = useAuth()
  const location = useLocation()

  if (!user || !token) {
    return (
      <Navigate
        to={ROUTES.login}
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  if (user.role !== 'ROLE_ADMIN') {
    return <Navigate to={ROUTES.dashboard} replace />
  }

  return <>{children}</>
}
