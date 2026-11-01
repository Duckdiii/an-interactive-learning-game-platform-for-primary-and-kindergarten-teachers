import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerTeacher } from '../api/authApi'
import RegisterPage from './RegisterPage'

vi.mock('../api/authApi', () => ({ registerTeacher: vi.fn() }))

const features = vi.hoisted(() => ({
  forgotPassword: false,
  rememberMe: false,
  teachingLevel: false,
}))
vi.mock('../config/authFeatures', () => ({ AUTH_FEATURES: features }))

const mockedRegister = vi.mocked(registerTeacher)

const fillField = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<p>Trang đăng nhập</p>} />
      </Routes>
    </MemoryRouter>,
  )

describe('Đăng ký: giao diện, độ mạnh mật khẩu và cờ khả năng', () => {
  afterEach(() => {
    features.teachingLevel = false
    vi.clearAllMocks()
  })

  it('có đúng một h1', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tạo tài khoản giáo viên')
  })

  it('gửi API đúng payload cũ, kể cả khi bật cờ cấp dạy (chưa gửi trường đó)', async () => {
    mockedRegister.mockResolvedValue({ id: 't1', email: 'giaovien@example.com' })
    features.teachingLevel = true
    const user = userEvent.setup({ delay: null })
    renderPage()
    fillField('Họ và tên', ' Nguyễn Văn An ')
    fillField('Email', 'giaovien@example.com')
    fillField('Mật khẩu', 'mat-khau-dai-du')
    fillField('Nhập lại mật khẩu', 'mat-khau-dai-du')
    await user.click(screen.getByRole('radio', { name: 'Mầm non' }))
    await user.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))

    expect(mockedRegister).toHaveBeenCalledWith({
      fullName: 'Nguyễn Văn An',
      email: 'giaovien@example.com',
      password: 'mat-khau-dai-du',
    })
  })

  it('ô trống: có gợi ý luật mật khẩu, chưa có thanh độ mạnh; gõ thì nêu nhóm còn thiếu theo đúng luật Backend', () => {
    renderPage()
    expect(screen.getByText('8–72 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt')).toBeInTheDocument()
    expect(screen.queryByText('Quá ngắn · ít nhất 8 ký tự')).toBeNull()
    fillField('Mật khẩu', 'abc')
    expect(screen.getByText('Quá ngắn · ít nhất 8 ký tự')).toBeInTheDocument()
    fillField('Mật khẩu', 'Abcdefg1')
    expect(screen.getByText('Còn thiếu: ký tự đặc biệt')).toBeInTheDocument()
    fillField('Mật khẩu', 'Abcdef1!')
    expect(screen.getByText('Đạt yêu cầu')).toBeInTheDocument()
  })

  it('cờ tắt: không hỏi "Cô dạy cấp nào?"; cờ bật: hiện Mầm non / Tiểu học', () => {
    const { unmount } = renderPage()
    expect(screen.queryByText(/Cô dạy cấp nào/)).toBeNull()
    unmount()

    features.teachingLevel = true
    renderPage()
    expect(screen.getByText(/Cô dạy cấp nào/)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Mầm non' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Tiểu học' })).toBeInTheDocument()
  })
})
