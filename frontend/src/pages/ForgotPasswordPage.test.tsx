import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestPasswordReset } from '../api/authApi'
import ForgotPasswordPage from './ForgotPasswordPage'

vi.mock('../api/authApi', () => ({ requestPasswordReset: vi.fn() }))

const mockedRequest = vi.mocked(requestPasswordReset)

function httpError(status: number, data: unknown) {
  const config = { headers: {} } as InternalAxiosRequestConfig
  const response = { status, data, statusText: '', headers: {}, config } as AxiosResponse
  return new AxiosError('lỗi', 'ERR_BAD_RESPONSE', config, null, response)
}

async function submitEmail(email: string) {
  const user = userEvent.setup({ delay: null })
  render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/login" element={<p>Trang đăng nhập</p>} />
      </Routes>
    </MemoryRouter>,
  )
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  await user.click(screen.getByRole('button', { name: 'Gửi liên kết' }))
}

describe('Quên mật khẩu', () => {
  afterEach(() => vi.clearAllMocks())

  it('gửi email đã bỏ khoảng trắng, rồi hiện nguyên văn thông điệp chung của Backend và ẩn biểu mẫu', async () => {
    mockedRequest.mockResolvedValue('Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.')

    await submitEmail('  lan@truong.edu.vn ')

    expect(mockedRequest).toHaveBeenCalledWith('lan@truong.edu.vn')
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.',
    )
    expect(screen.queryByRole('button', { name: 'Gửi liên kết' })).toBeNull()
  })

  it('email sai định dạng: báo lỗi ở ô, không gọi API', async () => {
    await submitEmail('khong-phai-email')

    expect(screen.getByText('Email không đúng định dạng')).toBeInTheDocument()
    expect(mockedRequest).not.toHaveBeenCalled()
  })

  it('vượt giới hạn 3 lần/giờ (429): báo lỗi thân thiện và vẫn cho thử lại sau', async () => {
    mockedRequest.mockRejectedValue(
      httpError(429, { success: false, error: { code: 'RATE_LIMITED', message: 'quá nhiều' } }),
    )

    await submitEmail('lan@truong.edu.vn')

    expect(await screen.findByRole('alert')).toHaveTextContent('Hãy chờ một lúc rồi thử lại')
    expect(screen.getByRole('button', { name: 'Gửi liên kết' })).toBeInTheDocument()
  })

  it('có lối quay lại đăng nhập', () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Quay lại đăng nhập' })).toHaveAttribute('href', '/login')
  })
})
