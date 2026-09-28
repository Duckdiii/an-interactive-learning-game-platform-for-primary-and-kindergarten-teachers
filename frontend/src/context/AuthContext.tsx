import type { ReactNode } from 'react'
import { useState } from 'react'
import { AuthContextObject } from './authContextObject'
import type { AuthSession, AuthUser } from '../types/auth'
import {
  clearStoredSession,
  readStoredSession,
  storeSession,
} from '../utils/authStorage'

function createInitialSession(): AuthSession {
  const storedSession = readStoredSession()

  return {
    user: storedSession.user,
    token: storedSession.accessToken,
    refreshToken: storedSession.refreshToken,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession>(createInitialSession)

  const login = (user: AuthUser, token: string, refreshToken: string) => {
    setSession({ user, token, refreshToken })
    storeSession(user, token, refreshToken)
  }

  const logout = () => {
    setSession({ user: null, token: null, refreshToken: null })
    clearStoredSession()
  }

  return (
    <AuthContextObject.Provider
      value={{
        user: session.user,
        token: session.token,
        refreshToken: session.refreshToken,
        login,
        logout,
      }}
    >
      {children}
    </AuthContextObject.Provider>
  )
}
