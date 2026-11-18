import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import OrderingRenderer from './OrderingRenderer'
import {
  makeStudentOrderingFixture,
  mockOrderingTeethQuestion,
} from './OrderingRenderer.fixtures'

vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Group: ({
    children,
    onClick,
  }: {
    children?: React.ReactNode
    onClick?: () => void
  }) => <div onClick={onClick}>{children}</div>,
  Rect: () => null,
  Text: ({ text }: { text?: string }) => <span>{text}</span>,
  Image: () => null,
}))

vi.mock('use-image', () => ({
  default: () => [undefined],
}))

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}))

vi.mock('../common/measureText', () => ({
  measureWrappedTextHeight: () => 40,
}))

describe('OrderingRenderer Component', () => {
  it('hiển thị đầy đủ tiêu đề câu hỏi, các ô slot và nội dung các bước', () => {
    render(<OrderingRenderer mode="preview" question={mockOrderingTeethQuestion} />)

    expect(
      screen.getByText('Bé hãy sắp xếp các bước đánh răng theo đúng thứ tự nhé!'),
    ).toBeInTheDocument()

    // Hiển thị các nhãn slot 1, 2, 3
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()

    // Hiển thị nội dung các bước
    expect(screen.getByText('Lấy kem đánh răng')).toBeInTheDocument()
    expect(screen.getByText('Chải răng thật sạch')).toBeInTheDocument()
    expect(screen.getByText('Súc miệng với nước')).toBeInTheDocument()
    expect(screen.getByText('Xong rồi!')).toBeInTheDocument()
  })

  it('hoạt động chuẩn xác ở mode play với student question', () => {
    const studentQuestion = makeStudentOrderingFixture(mockOrderingTeethQuestion)
    const onAnswered = vi.fn().mockResolvedValue({ isCorrect: true })

    render(
      <OrderingRenderer
        mode="play"
        question={studentQuestion}
        onAnswered={onAnswered}
      />,
    )

    expect(screen.getByText('Lấy kem đánh răng')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('chạm (tap) vào bước ở khay tự động đặt vào ô trống đầu tiên', () => {
    const onAnswered = vi.fn()
    render(<OrderingRenderer mode="preview" question={mockOrderingTeethQuestion} onAnswered={onAnswered} />)

    // Chạm vào bước 1 -> đặt vào Slot 1
    fireEvent.click(screen.getByText('Lấy kem đánh răng'))
    // Chạm vào bước 2 -> đặt vào Slot 2
    fireEvent.click(screen.getByText('Chải răng thật sạch'))
    // Chạm vào bước 3 -> đặt vào Slot 3
    fireEvent.click(screen.getByText('Súc miệng với nước'))

    // Bấm Xong rồi!
    fireEvent.click(screen.getByText('Xong rồi!'))

    expect(onAnswered).toHaveBeenCalledWith({
      order: ['step-1', 'step-2', 'step-3'],
      orderedStepIds: ['step-1', 'step-2', 'step-3'],
    })
  })

  it('ở mode review hiển thị theo mảng order đã truyền', () => {
    render(
      <OrderingRenderer
        mode="review"
        question={mockOrderingTeethQuestion}
        order={['step-1', 'step-2', 'step-3']}
      />,
    )

    expect(screen.getByText('Lấy kem đánh răng')).toBeInTheDocument()
    expect(screen.getByText('Chải răng thật sạch')).toBeInTheDocument()
    // Ở mode review không hiển thị nút Xong rồi!
    expect(screen.queryByText('Xong rồi!')).toBeNull()
  })
})
