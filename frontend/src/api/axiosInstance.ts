import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { ROUTES } from '../routes/paths'
import {
  clearStoredSession,
  getStoredAccessToken,
  getStoredRefreshToken,
  storeTokens,
} from '../utils/authStorage'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'

const axiosInstance = axios.create({ baseURL })

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

interface RefreshResponse {
  data: {
    accessToken: string
    refreshToken: string
  }
}

interface PendingRequest {
  resolve: (accessToken: string) => void
  reject: (error: unknown) => void
}

let isRefreshing = false
let pendingQueue: PendingRequest[] = []

const publicAuthEndpoints = ['/auth/login', '/auth/register']

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

    const refreshToken = getStoredRefreshToken()

    if (!refreshToken) {
      expireSession()
      return Promise.reject(error)
    }

    isRefreshing = true

    try {
      const response = await axios.post<RefreshResponse>(
        `${baseURL}/auth/refresh`,
        { refreshToken },
      )
      const {
        accessToken,
        refreshToken: rotatedRefreshToken,
      } = response.data.data

      if (!accessToken || !rotatedRefreshToken) {
        throw new Error('Refresh response did not include both tokens')
      }

      storeTokens(accessToken, rotatedRefreshToken)
      resolvePendingRequests(accessToken)
      setAuthorizationHeader(originalRequest, accessToken)

      return axiosInstance(originalRequest)
    } catch (refreshError) {
      rejectPendingRequests(refreshError)
      expireSession()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export default axiosInstance
