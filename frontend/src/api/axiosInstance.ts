import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { ROUTES } from '../routes/paths'
import {
  clearStoredSession,
  getStoredAccessToken,
  storeAccessToken,
} from '../utils/authStorage'

const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || (import.meta.env.DEV ? 'http://localhost:8080/api' : '/api')

// withCredentials: Backend khác origin, phải bật thì trình duyệt mới nhận Set-Cookie refresh_token khi đăng nhập
// và gửi lại cookie đó (Path=/api/auth) khi làm mới/đăng xuất.
const axiosInstance = axios.create({ baseURL, withCredentials: true })

// Refresh treo thì mọi request đang chờ nó (kể cả đăng xuất) treo theo; hết giờ thì các request đó bị từ chối.
export const REFRESH_TIMEOUT_MS = 10_000

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

// Refresh token mới không nằm trong body: Backend xoay vòng nó qua Set-Cookie.
interface RefreshResponse {
  data: {
    accessToken: string
  }
}

interface PendingRequest {
  resolve: (accessToken: string) => void
  reject: (error: unknown) => void
}

let isRefreshing = false
let pendingQueue: PendingRequest[] = []

const publicAuthEndpoints = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password']

function isPublicAuthRequest(config: InternalAxiosRequestConfig) {
  return publicAuthEndpoints.some((endpoint) => config.url?.endsWith(endpoint))
}

function setAuthorizationHeader(
  config: InternalAxiosRequestConfig,
  accessToken: string,
) {
  config.headers.Authorization = `Bearer ${accessToken}`
}

function waitForRefresh() {
  return new Promise<string>((resolve, reject) => {
    pendingQueue.push({ resolve, reject })
  })
}

function resolvePendingRequests(accessToken: string) {
  pendingQueue.forEach(({ resolve }) => resolve(accessToken))
  pendingQueue = []
}

function rejectPendingRequests(error: unknown) {
  pendingQueue.forEach(({ reject }) => reject(error))
  pendingQueue = []
}

function expireSession() {
  clearStoredSession()

  if (window.location.pathname !== ROUTES.login) {
    window.location.assign(ROUTES.login)
  }
}

axiosInstance.interceptors.request.use((config) => {
  const accessToken = getStoredAccessToken()

  if (accessToken && !isPublicAuthRequest(config)) {
    setAuthorizationHeader(config, accessToken)
  }

  return config
})

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      isPublicAuthRequest(originalRequest) ||
      originalRequest._retry
    ) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    if (isRefreshing) {
      try {
        const accessToken = await waitForRefresh()
        setAuthorizationHeader(originalRequest, accessToken)
        return axiosInstance(originalRequest)
      } catch (refreshError) {
        return Promise.reject(refreshError)
      }
    }

    isRefreshing = true

    try {
      // Không có body và không gửi Authorization: Backend chỉ đọc cookie refresh_token.
      const response = await axios.post<RefreshResponse>(
        `${baseURL}/auth/refresh`,
        undefined,
        { withCredentials: true, timeout: REFRESH_TIMEOUT_MS },
      )
      const { accessToken } = response.data.data

      if (!accessToken) {
        throw new Error('Refresh response did not include an access token')
      }
      // Giáo viên đã đăng xuất trong lúc chờ refresh: không ghi lại token vào máy dùng chung và không gửi lại request.
      if (!getStoredAccessToken()) {
        throw new Error('Session ended while refreshing')
      }

      storeAccessToken(accessToken)
      resolvePendingRequests(accessToken)
      setAuthorizationHeader(originalRequest, accessToken)

      return axiosInstance(originalRequest)
    } catch (refreshError) {
      rejectPendingRequests(refreshError)
      const status = axios.isAxiosError(refreshError)
        ? refreshError.response?.status
        : undefined
      const isCredentialFailure =
        !axios.isAxiosError(refreshError) ||
        status === 400 ||
        status === 401 ||
        status === 403
      if (isCredentialFailure) {
        expireSession()
      }
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export default axiosInstance
