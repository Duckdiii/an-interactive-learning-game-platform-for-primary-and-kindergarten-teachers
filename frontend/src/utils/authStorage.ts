import type { AuthUser } from '../types/auth'

const STORAGE_KEYS = {
  user: 'auth_user',
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  legacyAccessToken: 'auth_token',
} as const

interface StoredSession {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
}

export function readStoredSession(): StoredSession {
  const storedUser = localStorage.getItem(STORAGE_KEYS.user)
  const accessToken =
    localStorage.getItem(STORAGE_KEYS.accessToken) ??
    localStorage.getItem(STORAGE_KEYS.legacyAccessToken)
  const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken)

  if (!storedUser || !accessToken) {
    return { user: null, accessToken: null, refreshToken: null }
  }

  try {
    return {
      user: JSON.parse(storedUser) as AuthUser,
      accessToken,
      refreshToken,
    }
  } catch {
    clearStoredSession()
    return { user: null, accessToken: null, refreshToken: null }
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
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user))
  storeTokens(accessToken, refreshToken)
}

export function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(STORAGE_KEYS.accessToken, accessToken)
  localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken)
  localStorage.removeItem(STORAGE_KEYS.legacyAccessToken)
}

export function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEYS.user)
  localStorage.removeItem(STORAGE_KEYS.accessToken)
  localStorage.removeItem(STORAGE_KEYS.refreshToken)
  localStorage.removeItem(STORAGE_KEYS.legacyAccessToken)
}
