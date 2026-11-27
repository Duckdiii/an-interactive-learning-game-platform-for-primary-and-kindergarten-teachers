import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WaitingRoomView } from './WaitingRoomView'

describe('WaitingRoomView', () => {
  it('hiển thị mã PIN cỡ lớn, mã QR và số lượng học sinh tham gia', () => {
    const participants = [
      { id: 'p1', name: 'Bé An' },
      { id: 'p2', name: 'Bé Bình' },
    ]

    render(
      <WaitingRoomView
        shareCode="123456"
        joinUrl="http://localhost:5173/join/123456"
        participants={participants}
      />
    )

    // Kiểm tra tiêu đề hướng dẫn
    expect(
      screen.getByText('Quét mã QR hoặc nhập mã để tham gia')
    ).toBeInTheDocument()

    // Kiểm tra mã PIN hiển thị rõ
    const pinDisplay = screen.getByTestId('pin-display')
    expect(pinDisplay).toHaveTextContent('123456')
    expect(pinDisplay.className).toContain('text-8xl')

    // Kiểm tra số lượng người tham gia
    expect(screen.getByText(/Đã tham gia:/)).toBeInTheDocument()
    expect(screen.getByText('Bé An')).toBeInTheDocument()
    expect(screen.getByText('Bé Bình')).toBeInTheDocument()
  })

  it('hiển thị thông báo chờ khi chưa có bạn nào vào phòng', () => {
    render(
      <WaitingRoomView
        shareCode="999888"
        joinUrl="http://localhost:5173/join/999888"
        participants={[]}
      />
    )

    expect(screen.getByText('Đang chờ các bạn vào phòng...')).toBeInTheDocument()
    expect(screen.getByTestId('pin-display')).toHaveTextContent('999888')
  })
})
