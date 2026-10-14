import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PlayTestBoundary from './PlayTestBoundary'

function Broken(): never {
  throw new Error('không tải được gói đồ họa')
}

describe('PlayTestBoundary (UC-03 luồng 3b)', () => {
  it('nội dung lỗi khi vẽ: hiện đúng câu của SRS và cho quay lại chỉnh sửa, không để trang trắng', () => {
    const onExit = vi.fn()

    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <PlayTestBoundary onExit={onExit}>
        <Broken />
      </PlayTestBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Hệ thống gặp sự cố khi tải tài nguyên đồ họa của trò chơi. Vui lòng kiểm tra lại kết nối mạng hoặc cập nhật lại tài nguyên.',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Quay lại chỉnh sửa' }))
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('nội dung bình thường thì hiện nguyên vẹn', () => {
    render(
      <PlayTestBoundary onExit={() => {}}>
        <p>Màn chơi</p>
      </PlayTestBoundary>,
    )

    expect(screen.getByText('Màn chơi')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
