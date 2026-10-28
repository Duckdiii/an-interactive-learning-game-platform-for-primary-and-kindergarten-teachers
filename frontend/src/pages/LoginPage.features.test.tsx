import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loginTeacher } from '../api/authApi'
import { AuthProvider } from '../context/AuthContext'
import LoginPage from './LoginPage'

vi.mock('../api/authApi', () => ({ loginTeacher: vi.fn() }))

const features = vi.hoisted(() => ({
  forgotPassword: false,
  rememberMe: false,
  teachingLevel: false,
}))
vi.mock('../config/authFeatures', () => ({ AUTH_FEATURES: features }))

const mockedLogin = vi.mocked(loginTeacher)

const renderPage = () =>
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

describe('Đăng nhập: giao diện và cờ khả năng', () => {
  afterEach(() => {
    features.forgotPassword = false
    features.rememberMe = false
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('có đúng một h1 là lời chào', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Chào cô quay lại!')
  })

  it('cờ tắt: không có "Quên mật khẩu?" và "Giữ đăng nhập"', () => {
    renderPage()
    expect(screen.queryByText('Quên mật khẩu?')).toBeNull()
    expect(screen.queryByLabelText(/Giữ đăng nhập/)).toBeNull()
  })

  it('cờ bật: hiện cả hai, nhưng API vẫn chỉ nhận email và mật khẩu', async () => {
    features.forgotPassword = true
    features.rememberMe = true
    mockedLogin.mockResolvedValue({
      teacher: { id: 't1', email: 'giaovien@example.com' },
      accessToken: 'a',
      refreshToken: 'r',
    })
    const user = userEvent.setup({ delay: null })
    renderPage()

    expect(screen.getByText('Quên mật khẩu?')).toBeInTheDocument()
    expect(screen.getByLabelText(/Giữ đăng nhập/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'giaovien@example.com' } })
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'mat-khau-thu' } })
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    expect(mockedLogin).toHaveBeenCalledWith({
      email: 'giaovien@example.com',
      password: 'mat-khau-thu',
    })
    expect(await screen.findByText('Đã vào trang chủ')).toBeInTheDocument()
  })
})
