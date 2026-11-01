import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import WordScrambleRenderer from './WordScrambleRenderer'
import type { WordScrambleQuestion } from '../../types/game-dsl.types'

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
  Line: () => null,
  Text: ({ text }: { text?: string }) => <span>{text}</span>,
  Image: () => null,
}))

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}))

vi.mock('../common/measureText', () => ({
  measureWrappedTextHeight: () => 40,
}))

const sampleQuestion: WordScrambleQuestion = {
  id: 'ws_1',
  timeLimitSeconds: 60,
  points: 20,
  audioText: 'Ghép từ đúng',
  correctWord: 'CÁ',
  scrambledLetters: ['Á', 'C'],
}

describe('WordScrambleRenderer Component', () => {
  it('renders prompt, letter tiles, and confirm button', () => {
    render(<WordScrambleRenderer mode="preview" question={sampleQuestion} />)

    expect(screen.getByText('Ghép từ đúng')).toBeInTheDocument()
    expect(screen.getByText('Á')).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument()
    expect(screen.getByText('Xong rồi!')).toBeInTheDocument()
  })

  it('allows tapping tiles to auto-place into slots and submits in preview mode', () => {
    const onAnswered = vi.fn()
    render(<WordScrambleRenderer mode="preview" question={sampleQuestion} onAnswered={onAnswered} />)

    // Tap 'C' -> auto-places into slot 0
    fireEvent.click(screen.getByText('C'))
    // Tap 'Á' -> auto-places into slot 1
    fireEvent.click(screen.getByText('Á'))

    // Click confirm button
    fireEvent.click(screen.getByText('Xong rồi!'))
    expect(onAnswered).toHaveBeenCalledWith('CÁ')
    expect(screen.getByText(/Tuyệt vời/)).toBeInTheDocument()
  })

  it('renders in review mode without confirm button', () => {
    render(<WordScrambleRenderer mode="review" question={sampleQuestion} completedWord="CÁ" />)
    expect(screen.queryByText('Xong rồi!')).toBeNull()
  })
})
