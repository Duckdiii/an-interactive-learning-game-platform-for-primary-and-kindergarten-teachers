import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import AuthLayout from './AuthLayout'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<p>nội dung đăng nhập</p>} />
          <Route path="/register" element={<p>nội dung đăng ký</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AuthLayout', () => {
  it('lối cho học sinh dẫn tới /join', () => {
    renderAt('/login')
    expect(screen.getByRole('link', { name: /Vào chơi bằng mã/ })).toHaveAttribute('href', '/join')
  })

  it('tab đang chọn có aria-current, tab kia thì không', () => {
    renderAt('/register')
    const nav = screen.getByRole('navigation', { name: 'Đăng nhập hoặc đăng ký' })
    const [login, register] = Array.from(nav.querySelectorAll('a'))
    expect(register).toHaveAttribute('aria-current', 'page')
    expect(login).not.toHaveAttribute('aria-current')
    expect(login).toHaveAttribute('href', '/login')
  })

  it('cột trái ở đăng nhập là thông điệp, không có ba bước', () => {
    renderAt('/login')
    expect(screen.getByText(/Biến ý tưởng bài học/)).toBeInTheDocument()
    expect(screen.queryByText('Ba bước để có trò chơi đầu tiên')).toBeNull()
  })

  it('đăng ký hiện ba bước đánh số và ghi chú cho học sinh', () => {
    renderAt('/register')
    expect(screen.getByText('Ba bước để có trò chơi đầu tiên')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByText(/Học sinh không cần tài khoản/)).toBeInTheDocument()
  })
})
