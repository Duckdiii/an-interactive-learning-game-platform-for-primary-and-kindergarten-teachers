import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerTeacher } from '../api/authApi'
import RegisterPage from './RegisterPage'

vi.mock('../api/authApi', () => ({ registerTeacher: vi.fn() }))

const mockedRegister = vi.mocked(registerTeacher)

function httpError(status: number, data: unknown) {
  const config = { headers: {} } as InternalAxiosRequestConfig
  const response = { status, data, statusText: '', headers: {}, config } as AxiosResponse

  return new AxiosError('lỗi', 'ERR_BAD_RESPONSE', config, null, response)
}

const fillField = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

async function submitRegister() {
  const user = userEvent.setup({ delay: null })
  render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<p>Trang đăng nhập</p>} />
      </Routes>
    </MemoryRouter>,
  )

  // Nhập thẳng giá trị (không gõ từng ký tự) để test nhanh và không phụ thuộc tốc độ máy.
  fillField('Họ và tên', 'Nguyễn Văn An')
  fillField('Email', 'giaovien@example.com')
  fillField('Mật khẩu', 'mat-khau-dai-du')
  fillField('Xác nhận mật khẩu', 'mat-khau-dai-du')
  await user.click(screen.getByRole('button', { name: 'Đăng ký' }))
}

describe('Đăng ký: thông báo lỗi', () => {
  afterEach(() => vi.clearAllMocks())

  it('email đã đăng ký (VALIDATION_ERROR không kèm tên ô) hiện đúng câu cụ thể của backend trong hộp thông báo', async () => {
    mockedRegister.mockRejectedValue(
      httpError(400, {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email đã được đăng ký' },
      }),
    )
    await submitRegister()

    expect(await screen.findByRole('alert')).toHaveTextContent('Email đã được đăng ký')
    expect(screen.queryByText(/Thông tin chưa hợp lệ/)).toBeNull()
  })

  it('lỗi theo từng ô hiện ngay dưới ô đó và không hiện hộp thông báo chung', async () => {
    mockedRegister.mockRejectedValue(
      httpError(400, {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dữ liệu không hợp lệ',
          field: 'email',
        },
      }),
    )
    await submitRegister()

    // Thông báo lỗi nằm trong chính thẻ label của ô nên tên ô có thêm câu lỗi phía sau.
    const emailInput = await screen.findByLabelText(/^Email/)
    expect(emailInput).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Dữ liệu không hợp lệ')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('mất kết nối hiện hộp thông báo kiểm tra mạng', async () => {
    mockedRegister.mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
    await submitRegister()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.',
    )
  })

  it('lỗi hệ thống (500) hiện câu chuẩn thay vì thông điệp tiếng Anh của backend', async () => {
    mockedRegister.mockRejectedValue(
      httpError(500, {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'NullPointerException at X' },
      }),
    )
    await submitRegister()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Hệ thống đang gặp sự cố')
    expect(alert).not.toHaveTextContent('NullPointerException')
  })

  it('đăng ký thành công chuyển sang trang đăng nhập', async () => {
    mockedRegister.mockResolvedValue({ id: 't1', email: 'giaovien@example.com' })
    await submitRegister()

    expect(await screen.findByText('Trang đăng nhập')).toBeInTheDocument()
  })
})
