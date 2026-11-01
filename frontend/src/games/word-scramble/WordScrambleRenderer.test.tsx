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
  }) => <div data-testid="konva-group" onClick={onClick}>{children}</div>,
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

/** Chạm chữ rồi chạm ô đích. Câu mẫu không có audio và ảnh nên các Group đầu tiên chính là các ô. */
function placeLetter(letter: string, slotIndex: number) {
  fireEvent.click(screen.getByText(letter))
  fireEvent.click(screen.getAllByTestId('konva-group')[slotIndex])
}

describe('WordScrambleRenderer Component', () => {
  it('renders prompt, letter tiles, and confirm button', () => {
    render(<WordScrambleRenderer mode="preview" question={sampleQuestion} />)

    expect(screen.getByText('Ghép từ đúng')).toBeInTheDocument()
    expect(screen.getByText('Á')).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument()
    expect(screen.getByText('Xong rồi!')).toBeInTheDocument()
  })

  it('places a selected tile into the tapped slot and submits in preview mode', () => {
    const onAnswered = vi.fn()
    render(<WordScrambleRenderer mode="preview" question={sampleQuestion} onAnswered={onAnswered} />)

    // Cố ý đặt ô sau trước: chữ phải vào đúng ô được chạm, không vào ô trống đầu tiên
    placeLetter('Á', 1)
    placeLetter('C', 0)

    // Click confirm button
    fireEvent.click(screen.getByText('Xong rồi!'))
    expect(onAnswered).toHaveBeenCalledWith('CÁ')
    expect(screen.getByText(/Tuyệt vời/)).toBeInTheDocument()
  })

  it('resets placed letters when the teacher edits letters under the same question id', () => {
    const onAnswered = vi.fn()
    const { rerender } = render(
      <WordScrambleRenderer mode="preview" question={sampleQuestion} onAnswered={onAnswered} />,
    )
    placeLetter('C', 0)
    placeLetter('Á', 1)

    const edited = { ...sampleQuestion, correctWord: 'CÁT', scrambledLetters: ['T', 'Á', 'C'] }
    rerender(<WordScrambleRenderer mode="preview" question={edited} onAnswered={onAnswered} />)

    fireEvent.click(screen.getByText('Xong rồi!'))
    expect(onAnswered).not.toHaveBeenCalled()
  })

  it('renders in review mode without confirm button, locks interaction, and updates on completedWord change', () => {
    const { rerender } = render(
      <WordScrambleRenderer mode="review" question={sampleQuestion} completedWord="CÁ" />,
    )
    expect(screen.queryByText('Xong rồi!')).toBeNull()

    // Clicking tiles in review mode should not trigger placement or errors
    fireEvent.click(screen.getByText('C'))
    expect(screen.queryByText('Xong rồi!')).toBeNull()

    // Changing completedWord in review mode updates displayed word
    rerender(<WordScrambleRenderer mode="review" question={sampleQuestion} completedWord="ÁC" />)
    expect(screen.queryByText('Xong rồi!')).toBeNull()
  })

  it('plays without correctWord in student mode and submits only once', async () => {
    // Mode play student question does NOT have correctWord
    const studentQuestion = {
      id: 'ws_student',
      timeLimitSeconds: 60,
      points: 20,
      audioText: 'Ghép từ đúng',
      scrambledLetters: ['Á', 'C'],
    }

    let resolveAnswer: (value: { isCorrect: boolean; correctWord?: string }) => void
    const answerPromise = new Promise<{ isCorrect: boolean; correctWord?: string }>((resolve) => {
      resolveAnswer = resolve
    })
    const onAnswered = vi.fn().mockReturnValue(answerPromise)

    render(<WordScrambleRenderer mode="play" question={studentQuestion} onAnswered={onAnswered} />)

    placeLetter('C', 0)
    placeLetter('Á', 1)

    const confirmBtn = screen.getByText('Xong rồi!')
    fireEvent.click(confirmBtn)
    // Clicking confirm again while submitting should be ignored (nộp một lần)
    fireEvent.click(confirmBtn)
    fireEvent.click(confirmBtn)

    expect(onAnswered).toHaveBeenCalledTimes(1)
    expect(onAnswered).toHaveBeenCalledWith('CÁ')

    // Resolve with result
    resolveAnswer!({ isCorrect: true, correctWord: 'CÁ' })
    expect(await screen.findByText(/Tuyệt vời/)).toBeInTheDocument()
  })
})
