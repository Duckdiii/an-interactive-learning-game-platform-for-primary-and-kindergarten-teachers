import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'

const axiosInstance = axios.create({ baseURL })

// Attach the access token (if any) to every outgoing request.
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // TODO: attempt token refresh here before falling back to logging the user out.
    }
    return Promise.reject(error)
  },
)

export default axiosInstance
