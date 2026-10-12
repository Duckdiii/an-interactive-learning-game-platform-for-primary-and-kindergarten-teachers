import type { AuthUser } from '../types/auth'

const STORAGE_KEYS = {
  user: 'auth_user',
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  legacyAccessToken: 'auth_token',
  demo: 'auth_demo',
} as const

interface StoredSession {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isDemo: boolean
}

export function readStoredSession(): StoredSession {
  const storedUser = localStorage.getItem(STORAGE_KEYS.user)
  const accessToken =
    localStorage.getItem(STORAGE_KEYS.accessToken) ??
    localStorage.getItem(STORAGE_KEYS.legacyAccessToken)
  const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken)
  const isDemo =
    import.meta.env.DEV && localStorage.getItem(STORAGE_KEYS.demo) === 'true'

  if (!storedUser || (!accessToken && !isDemo)) {
    return { user: null, accessToken: null, refreshToken: null, isDemo: false }
  }

  try {
    return {
      user: JSON.parse(storedUser) as AuthUser,
      accessToken: isDemo ? null : accessToken,
      refreshToken: isDemo ? null : refreshToken,
      isDemo,
    }
  } catch {
    clearStoredSession()
    return { user: null, accessToken: null, refreshToken: null, isDemo: false }
  }
}

export function getStoredAccessToken() {
  return (
    localStorage.getItem(STORAGE_KEYS.accessToken) ??
    localStorage.getItem(STORAGE_KEYS.legacyAccessToken)
  )
}

export function getStoredRefreshToken() {
  return localStorage.getItem(STORAGE_KEYS.refreshToken)
}

export function storeSession(
  user: AuthUser,
  accessToken: string,
  refreshToken: string,
) {
  clearStoredSession()
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user))
  storeTokens(accessToken, refreshToken)
}

export function storeDemoSession(user: AuthUser) {
  if (!import.meta.env.DEV) return

  clearStoredSession()
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user))
  localStorage.setItem(STORAGE_KEYS.demo, 'true')
}

export function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(STORAGE_KEYS.accessToken, accessToken)
  localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken)
  localStorage.removeItem(STORAGE_KEYS.legacyAccessToken)
  localStorage.removeItem(STORAGE_KEYS.demo)
}

export function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEYS.user)
  localStorage.removeItem(STORAGE_KEYS.accessToken)
  localStorage.removeItem(STORAGE_KEYS.refreshToken)
  localStorage.removeItem(STORAGE_KEYS.legacyAccessToken)
  localStorage.removeItem(STORAGE_KEYS.demo)
}
