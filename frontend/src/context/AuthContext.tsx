import type { ReactNode } from 'react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AuthContextObject } from './authContextObject'
import type { AuthSession, AuthUser } from '../types/auth'
import {
  clearStoredSession,
  readStoredSession,
  storeSession,
  storeDemoSession,
} from '../utils/authStorage'
import { demoTeacher } from '../demo/demoData'

function createInitialSession(): AuthSession {
  const storedSession = readStoredSession()

  return {
    user: storedSession.user,
    token: storedSession.accessToken,
    refreshToken: storedSession.refreshToken,
    isDemo: storedSession.isDemo,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession>(createInitialSession)
  const queryClient = useQueryClient()

  const login = (user: AuthUser, token: string, refreshToken: string) => {
    queryClient.clear()
    setSession({ user, token, refreshToken, isDemo: false })
    storeSession(user, token, refreshToken)
  }

  const loginDemo = () => {
    if (!import.meta.env.DEV) return

    queryClient.clear()
    storeDemoSession(demoTeacher)
    setSession({ user: demoTeacher, token: null, refreshToken: null, isDemo: true })
  }

  const logout = () => {
    queryClient.clear()
    setSession({ user: null, token: null, refreshToken: null, isDemo: false })
    clearStoredSession()
  }

  return (
    <AuthContextObject.Provider
      value={{
        user: session.user,
        token: session.token,
        refreshToken: session.refreshToken,
        isDemo: session.isDemo,
        login,
        loginDemo,
        logout,
      }}
    >
      {children}
    </AuthContextObject.Provider>
  )
}
