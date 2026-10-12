export interface AuthUser {
  id: string
  email: string
  role?: string
  [key: string]: unknown
}

export interface AuthSession {
  user: AuthUser | null
  token: string | null
  refreshToken: string | null
  isDemo: boolean
}

export interface AuthContextValue extends AuthSession {
  login: (user: AuthUser, token: string, refreshToken: string) => void
  loginDemo: () => void
  logout: () => void
}
