import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import type { GameSummary } from '../types/game-summary.types'
import { storeSession } from '../utils/authStorage'

// Dụng cụ dùng chung cho test trang giáo viên: bộ nhớ truy vấn riêng cho mỗi lần render (không chia sẻ cache giữa
// các test), phiên đăng nhập giả trong localStorage và bộ định tuyến bộ nhớ.
export function renderWithProviders(ui: ReactElement, initialPath = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

export function loginAsTeacher(fullName = 'Nguyễn Thị Lan') {
  localStorage.clear()
  storeSession(
    { teacherId: 't1', fullName, email: 'lan@truong.edu.vn' },
    'token',
    'refresh',
  )
}

export const makeGame = (
  index: number,
  overrides: Partial<GameSummary> = {},
): GameSummary => ({
  gameId: `g${index}`,
  title: `Trò chơi ${index}`,
  gameType: 'QUIZ',
  subject: 'MATH',
  gradeLevel: 'GRADE_1',
  status: 'DRAFT',
  shareCode: null,
  shareUrl: null,
  thumbnailUrl: null,
  updatedAt: new Date(Date.now() - index * 3_600_000).toISOString(),
  ...overrides,
})

// Giả lập clipboard của trình duyệt (jsdom không có).
export function mockClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined)

  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })

  return writeText
}
