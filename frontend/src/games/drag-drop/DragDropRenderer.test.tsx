import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DragDropRenderer from './DragDropRenderer'
import type { DragDropQuestion } from '../../types/game-dsl.types'

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

const sampleQuestion: DragDropQuestion = {
  id: 'dd_1',
  timeLimitSeconds: 60,
  points: 20,
  audioText: 'Phân loại con vật',
  dropZones: [
    { id: 'water', label: 'Dưới nước' },
    { id: 'land', label: 'Trên cạn' },
  ],
  items: [
    { id: 'fish', text: 'Cá', targetZoneId: 'water' },
    { id: 'rabbit', text: 'Thỏ', targetZoneId: 'land' },
  ],
}

describe('DragDropRenderer Component', () => {
  it('renders prompt, drop zones, items, and confirm button', () => {
    render(<DragDropRenderer mode="preview" question={sampleQuestion} />)

    expect(screen.getByText('Phân loại con vật')).toBeInTheDocument()
    expect(screen.getByText('Dưới nước')).toBeInTheDocument()
    expect(screen.getByText('Trên cạn')).toBeInTheDocument()
    expect(screen.getByText('Cá')).toBeInTheDocument()
    expect(screen.getByText('Thỏ')).toBeInTheDocument()
    expect(screen.getByText('Xong rồi!')).toBeInTheDocument()
  })

  it('tapping an item inside a basket while another is selected places the selected one there', () => {
    const onAnswered = vi.fn()
    render(<DragDropRenderer mode="preview" question={sampleQuestion} onAnswered={onAnswered} />)

    fireEvent.click(screen.getByText('Cá'))
    fireEvent.click(screen.getByText('Dưới nước'))

    // Đang chọn 'Thỏ', chạm trúng 'Cá' trong rổ: 'Cá' ở lại, 'Thỏ' vào cùng rổ
    fireEvent.click(screen.getByText('Thỏ'))
    fireEvent.click(screen.getByText('Cá'))

    fireEvent.click(screen.getByText('Xong rồi!'))
    expect(onAnswered).toHaveBeenCalledWith([
      { itemId: 'fish', zoneId: 'water' },
      { itemId: 'rabbit', zoneId: 'water' },
    ])
  })

  it('resets placements when the teacher edits items under the same question id', () => {
    const onAnswered = vi.fn()
    const { rerender } = render(
      <DragDropRenderer mode="preview" question={sampleQuestion} onAnswered={onAnswered} />,
    )
    fireEvent.click(screen.getByText('Cá'))
    fireEvent.click(screen.getByText('Dưới nước'))
    fireEvent.click(screen.getByText('Thỏ'))
    fireEvent.click(screen.getByText('Trên cạn'))

    const edited = {
      ...sampleQuestion,
      items: [...sampleQuestion.items, { id: 'crab', text: 'Cua', targetZoneId: 'water' }],
    }
    rerender(<DragDropRenderer mode="preview" question={edited} onAnswered={onAnswered} />)

    fireEvent.click(screen.getByText('Xong rồi!'))
    expect(onAnswered).not.toHaveBeenCalled()
  })

  it('allows 2-tap placement and submits in preview mode', () => {
    const onAnswered = vi.fn()
    render(<DragDropRenderer mode="preview" question={sampleQuestion} onAnswered={onAnswered} />)

    // Tap 'Cá' -> tap 'Dưới nước'
    fireEvent.click(screen.getByText('Cá'))
    fireEvent.click(screen.getByText('Dưới nước'))

    // Tap 'Thỏ' -> tap 'Trên cạn'
    fireEvent.click(screen.getByText('Thỏ'))
    fireEvent.click(screen.getByText('Trên cạn'))

    // Click confirm button
    fireEvent.click(screen.getByText('Xong rồi!'))
    expect(onAnswered).toHaveBeenCalledWith([
      { itemId: 'fish', zoneId: 'water' },
      { itemId: 'rabbit', zoneId: 'land' },
    ])
    expect(screen.getByText(/Tuyệt vời/)).toBeInTheDocument()
  })

  it('renders locked state in review mode and ignores interaction', () => {
    render(
      <DragDropRenderer
        mode="review"
        question={sampleQuestion}
        placements={[
          { itemId: 'fish', zoneId: 'water' },
          { itemId: 'rabbit', zoneId: 'land' },
        ]}
      />,
    )

    // Confirm button should not appear in review mode
    expect(screen.queryByText('Xong rồi!')).toBeNull()

    // Clicking items or zones should not trigger changes or errors
    fireEvent.click(screen.getByText('Cá'))
    fireEvent.click(screen.getByText('Trên cạn'))
    expect(screen.queryByText('Xong rồi!')).toBeNull()
  })

  it('plays without targetZoneId in student mode and submits only once', async () => {
    // Mode play question does NOT contain targetZoneId
    const studentQuestion = {
      id: 'dd_student',
      timeLimitSeconds: 60,
      points: 20,
      audioText: 'Phân loại con vật',
      dropZones: [
        { id: 'water', label: 'Dưới nước' },
        { id: 'land', label: 'Trên cạn' },
      ],
      items: [
        { id: 'fish', text: 'Cá' },
        { id: 'rabbit', text: 'Thỏ' },
      ],
    }

    let resolveAnswer: (value: { isCorrect: boolean; correctPlacements?: { itemId: string; zoneId: string }[] }) => void
    const answerPromise = new Promise<{ isCorrect: boolean; correctPlacements?: { itemId: string; zoneId: string }[] }>((resolve) => {
      resolveAnswer = resolve
    })
    const onAnswered = vi.fn().mockReturnValue(answerPromise)

    render(<DragDropRenderer mode="play" question={studentQuestion} onAnswered={onAnswered} />)

    // Place Fish -> Land (intentionally wrong)
    fireEvent.click(screen.getByText('Cá'))
    fireEvent.click(screen.getByText('Trên cạn'))

    // Place Rabbit -> Land
    fireEvent.click(screen.getByText('Thỏ'))
    fireEvent.click(screen.getByText('Trên cạn'))

    // Confirm button appears and is clickable
    const confirmBtn = screen.getByText('Xong rồi!')
    fireEvent.click(confirmBtn)
    // Clicking confirm again while submitting should be ignored (nộp một lần)
    fireEvent.click(confirmBtn)
    fireEvent.click(confirmBtn)

    expect(onAnswered).toHaveBeenCalledTimes(1)
    expect(onAnswered).toHaveBeenCalledWith([
      { itemId: 'fish', zoneId: 'land' },
      { itemId: 'rabbit', zoneId: 'land' },
    ])

    // Resolve with incorrect answer and correctPlacements
    resolveAnswer!({
      isCorrect: false,
      correctPlacements: [
        { itemId: 'fish', zoneId: 'water' },
        { itemId: 'rabbit', zoneId: 'land' },
      ],
    })

    // Shows correct answer for misplaced item 'Cá'
    expect(await screen.findByText('Đúng: Dưới nước')).toBeInTheDocument()
    // Does NOT show correct label for 'Thỏ' because Thỏ was correctly placed in 'land'
    expect(screen.queryByText('Đúng: Trên cạn')).toBeNull()
  })
})
