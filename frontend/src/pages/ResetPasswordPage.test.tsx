import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetPassword } from '../api/authApi'
import ResetPasswordPage from './ResetPasswordPage'

vi.mock('../api/authApi', () => ({ resetPassword: vi.fn() }))

const mockedReset = vi.mocked(resetPassword)
const INVALID_LINK =
  'Liên kết đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu gửi lại liên kết đặt lại mật khẩu.'

function httpError(status: number, data: unknown) {
  const config = { headers: {} } as InternalAxiosRequestConfig
  const response = { status, data, statusText: '', headers: {}, config } as AxiosResponse
  return new AxiosError('lỗi', 'ERR_BAD_RESPONSE', config, null, response)
}

function LoginProbe() {
  const state = useLocation().state as { successMessage?: string } | null
  return <p>Trang đăng nhập: {state?.successMessage}</p>
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/login" element={<LoginProbe />} />
        <Route path="/forgot-password" element={<p>Trang quên mật khẩu</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function submit(password: string, confirm = password) {
  const user = userEvent.setup({ delay: null })
  fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: password } })
  fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu'), { target: { value: confirm } })
  await user.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }))
}

describe('Đặt lại mật khẩu', () => {
  afterEach(() => vi.clearAllMocks())

  it('gửi token trong liên kết cùng mật khẩu mới, rồi về đăng nhập kèm lời báo thành công', async () => {
    mockedReset.mockResolvedValue(undefined)
    renderAt('/reset-password?token=abc_123-XYZ')

    await submit('MatKhauMoi1!')

    expect(mockedReset).toHaveBeenCalledWith('abc_123-XYZ', 'MatKhauMoi1!')
    expect(await screen.findByText(/Đã đặt lại mật khẩu, mời cô đăng nhập/)).toBeInTheDocument()
  })

  it('mở trang không có token: báo liên kết không hợp lệ, không hiện biểu mẫu, có lối xin liên kết mới', () => {
    renderAt('/reset-password')

    expect(screen.getByRole('alert')).toHaveTextContent(INVALID_LINK)
    expect(screen.queryByLabelText('Mật khẩu mới')).toBeNull()
    expect(screen.getByRole('link', { name: 'Gửi lại liên kết' })).toHaveAttribute('href', '/forgot-password')
  })

  it('mật khẩu xác nhận không khớp: báo ở ô, không gọi API', async () => {
    renderAt('/reset-password?token=abc')

    await submit('MatKhauMoi1!', 'KhacNhau1!')

    expect(screen.getByText('Mật khẩu xác nhận không khớp')).toBeInTheDocument()
    expect(mockedReset).not.toHaveBeenCalled()
  })

  it('liên kết hết hạn/đã dùng (400): hiện đúng câu của UC-15 và lối xin liên kết mới', async () => {
    mockedReset.mockRejectedValue(
      httpError(400, { success: false, error: { code: 'VALIDATION_ERROR', message: INVALID_LINK } }),
    )
    renderAt('/reset-password?token=het-han')

    await submit('MatKhauMoi1!')

    expect(await screen.findByRole('alert')).toHaveTextContent(INVALID_LINK)
    expect(screen.getByRole('link', { name: 'Gửi lại liên kết' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Mật khẩu mới')).toBeNull()
  })

  it('đọc xong thì xóa token khỏi địa chỉ trang nhưng vẫn gửi đúng token', async () => {
    mockedReset.mockResolvedValue(undefined)
    function SearchProbe() {
      return <output data-testid="search">{useLocation().search}</output>
    }
    render(
      <MemoryRouter initialEntries={['/reset-password?token=bi-mat']}>
        <Routes>
          <Route
            path="/reset-password"
            element={
              <>
                <ResetPasswordPage />
                <SearchProbe />
              </>
            }
          />
          <Route path="/login" element={<LoginProbe />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByTestId('search')).toBeEmptyDOMElement())
    await submit('MatKhauMoi1!')
    expect(mockedReset).toHaveBeenCalledWith('bi-mat', 'MatKhauMoi1!')
  })
})
