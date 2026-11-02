import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loginTeacher } from '../api/authApi'
import { AuthProvider } from '../context/AuthContext'
import LoginPage from './LoginPage'

vi.mock('../api/authApi', () => ({ loginTeacher: vi.fn() }))

const mockedLogin = vi.mocked(loginTeacher)

function httpError(status: number, data: unknown) {
  const config = { headers: {} } as InternalAxiosRequestConfig
  const response = { status, data, statusText: '', headers: {}, config } as AxiosResponse

  return new AxiosError('lỗi', 'ERR_BAD_RESPONSE', config, null, response)
}

async function submitLogin() {
  const user = userEvent.setup({ delay: null })
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<p>Đã vào trang chủ</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )

  // Nhập thẳng giá trị (không gõ từng ký tự) để test nhanh và không phụ thuộc tốc độ máy.
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'giaovien@example.com' },
  })
  fireEvent.change(screen.getByLabelText('Mật khẩu'), {
    target: { value: 'mat-khau-thu' },
  })
  await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
}

describe('Đăng nhập: thông báo lỗi', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('sai email hoặc mật khẩu (401) giữ câu riêng của trang, không dùng câu "phiên hết hạn"', async () => {
    mockedLogin.mockRejectedValue(
      httpError(401, {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
      }),
    )
    await submitLogin()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email hoặc mật khẩu không đúng',
    )
    expect(screen.queryByText(/Phiên đăng nhập đã hết hạn/)).toBeNull()
  })

  it('mất kết nối hiện câu hướng dẫn kiểm tra mạng', async () => {
    mockedLogin.mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
    await submitLogin()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.',
    )
  })

  it('máy chủ quá chậm hiện câu riêng', async () => {
    mockedLogin.mockRejectedValue(new AxiosError('timeout', 'ECONNABORTED'))
    await submitLogin()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Máy chủ phản hồi quá chậm',
    )
  })

  it('đăng nhập sai quá nhiều lần hiện câu khóa 15 phút', async () => {
    mockedLogin.mockRejectedValue(
      httpError(429, {
        success: false,
        error: { code: 'LOGIN_TEMPORARILY_LOCKED', message: 'Too many attempts' },
      }),
    )
    await submitLogin()

    expect(await screen.findByRole('alert')).toHaveTextContent('sau 15 phút')
  })

  it('đăng nhập thành công thì chuyển vào trang chủ và không có thông báo lỗi', async () => {
    mockedLogin.mockResolvedValue({
      teacher: { id: 't1', email: 'giaovien@example.com' },
      accessToken: 'a',
      refreshToken: 'r',
    })
    await submitLogin()

    expect(await screen.findByText('Đã vào trang chủ')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
