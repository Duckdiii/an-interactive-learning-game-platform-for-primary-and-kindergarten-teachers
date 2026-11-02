import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PreviewBoundary from './PreviewBoundary'

function Broken(): never {
  throw new Error('dữ liệu dở')
}

afterEach(() => vi.restoreAllMocks())

describe('PreviewBoundary', () => {
  it('renderer vỡ thì chỉ báo trong khung, không làm sập trang; đổi key (sửa câu) thì dựng lại', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rerender } = render(
      <div>
        <p>Trang soạn thảo</p>
        <PreviewBoundary key="v1">
          <Broken />
        </PreviewBoundary>
      </div>,
    )

    expect(screen.getByText('Chưa dựng được phần xem trước của câu này.')).toBeInTheDocument()
    expect(screen.getByText('Trang soạn thảo')).toBeInTheDocument()

    rerender(
      <div>
        <p>Trang soạn thảo</p>
        <PreviewBoundary key="v2">
          <p>Khung chơi</p>
        </PreviewBoundary>
      </div>,
    )
    expect(screen.getByText('Khung chơi')).toBeInTheDocument()
  })
})
