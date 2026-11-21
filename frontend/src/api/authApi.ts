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

// Thu hồi refresh token của phiên hiện tại; Backend trả 204 kèm Set-Cookie xóa cookie.
export async function logoutTeacher() {
  await axiosInstance.post('/auth/logout')
}
