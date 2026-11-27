import type { AuthUser } from '../types/auth'

// Refresh token nằm trong cookie HttpOnly do Backend đặt, JS không đọc được nên không lưu ở đây.
// `legacyRefreshToken`/`legacyAccessToken`: khóa của contract cũ, chỉ còn để dọn khỏi máy đã đăng nhập trước đó.
const STORAGE_KEYS = {
  user: 'auth_user',
  accessToken: 'accessToken',
  legacyRefreshToken: 'refreshToken',
  legacyAccessToken: 'auth_token',
} as const

interface StoredSession {
  user: AuthUser | null
  accessToken: string | null
}

export function readStoredSession(): StoredSession {
  localStorage.removeItem(STORAGE_KEYS.legacyRefreshToken)
  const storedUser = localStorage.getItem(STORAGE_KEYS.user)
  const accessToken = getStoredAccessToken()

  if (!storedUser || !accessToken) {
    return { user: null, accessToken: null }
  }

  try {
    return { user: JSON.parse(storedUser) as AuthUser, accessToken }
  } catch {
    clearStoredSession()
    return { user: null, accessToken: null }
  }
}

export function getStoredAccessToken() {
  return (
    localStorage.getItem(STORAGE_KEYS.accessToken) ??
    localStorage.getItem(STORAGE_KEYS.legacyAccessToken)
  )
}

export function storeSession(user: AuthUser, accessToken: string) {
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user))
  storeAccessToken(accessToken)
}

export function storeAccessToken(accessToken: string) {
  localStorage.setItem(STORAGE_KEYS.accessToken, accessToken)
  localStorage.removeItem(STORAGE_KEYS.legacyAccessToken)
  localStorage.removeItem(STORAGE_KEYS.legacyRefreshToken)
}

export function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEYS.user)
  localStorage.removeItem(STORAGE_KEYS.accessToken)
  localStorage.removeItem(STORAGE_KEYS.legacyRefreshToken)
  localStorage.removeItem(STORAGE_KEYS.legacyAccessToken)
}
