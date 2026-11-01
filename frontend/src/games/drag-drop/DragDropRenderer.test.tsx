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

  it('renders locked state in review mode', () => {
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
  })
})
