import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

interface AuthUser {
  id: string
  email: string
  role?: string
  [key: string]: unknown
}

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  login: (user: AuthUser, token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const STORAGE_USER_KEY = 'auth_user'
const STORAGE_TOKEN_KEY = 'auth_token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)

  // Restore session from localStorage on first mount so a page refresh doesn't log the user out.
  useEffect(() => {
    const storedUser = localStorage.getItem(STORAGE_USER_KEY)
    const storedToken = localStorage.getItem(STORAGE_TOKEN_KEY)
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser))
      setToken(storedToken)
    }
  }, [])

  const login = (user: AuthUser, token: string) => {
    setUser(user)
    setToken(token)
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user))
    localStorage.setItem(STORAGE_TOKEN_KEY, token)
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem(STORAGE_USER_KEY)
    localStorage.removeItem(STORAGE_TOKEN_KEY)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
