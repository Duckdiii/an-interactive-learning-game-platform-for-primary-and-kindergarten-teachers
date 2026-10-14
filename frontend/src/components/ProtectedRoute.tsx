import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTeacherIdentity } from '../hooks/useTeacherIdentity'
import { ROUTES } from '../routes/paths'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, token } = useAuth()
  const { cacheOwner } = useTeacherIdentity()
  const location = useLocation()

  // Phiên không có cả mã giáo viên lẫn email không biết là ai: coi như chưa đăng nhập.
  if (!user || !token || cacheOwner === null) {
    return (
      <Navigate
        to={ROUTES.login}
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  return children
}
