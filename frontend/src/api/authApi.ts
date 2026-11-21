import axiosInstance from './axiosInstance'
import type { ApiSuccessResponse } from '../types/api'
import type { AuthUser } from '../types/auth'

export interface RegisterPayload {
  fullName: string
  email: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
  // Không gửi hoặc false: refresh token 24 giờ; true: 30 ngày.
  rememberMe?: boolean
}

// Refresh token không nằm trong body: Backend đặt vào cookie HttpOnly qua Set-Cookie.
export interface LoginResponse {
  teacher: AuthUser
  accessToken: string
  expiresIn: number
}

export async function registerTeacher(payload: RegisterPayload) {
  const response = await axiosInstance.post<ApiSuccessResponse<AuthUser>>(
    '/auth/register',
    payload,
  )

  return response.data.data
}

export async function loginTeacher(payload: LoginPayload) {
  const response = await axiosInstance.post<ApiSuccessResponse<LoginResponse>>(
    '/auth/login',
    payload,
  )

  return response.data.data
}

// Mạng treo (không lỗi hẳn) thì bỏ chờ, để AuthContext vẫn xóa phiên trên máy dùng chung.
export const LOGOUT_TIMEOUT_MS = 5_000

// Thu hồi refresh token của phiên hiện tại; Backend trả 204 kèm Set-Cookie xóa cookie.
export async function logoutTeacher() {
  await axiosInstance.post('/auth/logout', undefined, { timeout: LOGOUT_TIMEOUT_MS })
}

// Phản hồi luôn giống nhau dù email có tồn tại hay không (Backend chống dò tài khoản).
export async function requestPasswordReset(email: string) {
  const response = await axiosInstance.post<ApiSuccessResponse<{ message: string }>>(
    '/auth/forgot-password',
    { email },
  )

  return response.data.data.message
}

// Thành công: Backend trả 204 và đăng xuất mọi phiên cũ của tài khoản.
export async function resetPassword(token: string, newPassword: string) {
  await axiosInstance.post('/auth/reset-password', { token, newPassword })
}
