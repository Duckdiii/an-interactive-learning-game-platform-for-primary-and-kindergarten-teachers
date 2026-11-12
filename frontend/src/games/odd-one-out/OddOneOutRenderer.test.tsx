import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnswerResult, StudentOddOneOutQuestion } from '../../types/game-student.types'
import OddOneOutRenderer from './OddOneOutRenderer'

const effects = vi.hoisted(() => ({ confetti: vi.fn(), praise: vi.fn(), retry: vi.fn(), status: 'loaded', imageCalls: [] as unknown[][] }))
vi.mock('canvas-confetti', () => ({ default: effects.confetti }))
vi.mock('use-image', () => ({ default: (...args: unknown[]) => {
  effects.imageCalls.push(args)
  return [{ width: 200, height: 100 }, effects.status]
} }))
vi.mock('../common/useAnswerAudio', () => ({ useAnswerAudio: () => (correct: boolean) => (correct ? effects.praise : effects.retry)() }))
vi.mock('../common/ResponsiveStage', () => ({ default: ({ children }: { children: ReactNode }) => <div data-testid="odd-stage">{children}</div> }))
vi.mock('react-konva', () => ({
  Layer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Group: ({ children, onClick, onTap, name }: { children: ReactNode; onClick?: () => void; onTap?: () => void; name?: string }) =>
    <div data-testid={name} onClick={onClick} onTouchEnd={onTap}>{children}</div>,
  Rect: ({ stroke }: { stroke?: string }) => <span data-stroke={stroke} />,
  Image: ({ width, height }: { width: number; height: number }) => <span data-testid="image" data-width={width} data-height={height} />,
  Text: ({ text }: { text: string }) => <span>{text}</span>,
}))

const question: StudentOddOneOutQuestion = {
  id: 'q', renderMode: 'IMAGE', timeLimitSeconds: 30, points: 10,
  items: ['Mèo 1', 'Chó', 'Mèo 2', 'Mèo 3'].map((text, i) => ({ id: String(i), text, imageUrl: `/${i}.png` })),
}
const verdict = (isCorrect: boolean, correctAnswer: Record<string, unknown> | null = { selectedItemId: '1' }): AnswerResult =>
  ({ status: isCorrect ? 'CORRECT' : 'INCORRECT', isCorrect, pointsEarned: 0, totalScore: 0, correctAnswer })
const item = (id: string) => screen.getByTestId(`avm-option-${id}`)
const outline = (id: string, color: string) => expect(item(id).querySelector(`[data-stroke="${color}"]`)).not.toBeNull()

beforeEach(() => { effects.status = 'loaded'; effects.imageCalls = []; vi.resetAllMocks() })

describe('OddOneOutRenderer', () => {
  it('shows the question criterion supplied for an image round', () => {
    const prompt = 'Hãy chọn hình không thuộc nhóm các loại trái cây mà em thấy trong những hình ở bên dưới nhé.'.repeat(2)
    render(<OddOneOutRenderer question={{ ...question, questionText: prompt }} onSubmit={vi.fn()} />)
    expect(screen.getByText(prompt)).toBeInTheDocument()
    expect(screen.getByTestId('odd-stage')).not.toContainElement(screen.getByText(prompt))
  })
  it('reveals the supplied correct item after a wrong answer and locks further choices', async () => {
    const submit = vi.fn().mockResolvedValue(verdict(false))
    render(<OddOneOutRenderer question={question} onSubmit={submit} />)
    fireEvent.click(item('0'))
    await waitFor(() => outline('0', '#EF9A9A'))
    outline('1', '#66BB6A')
    expect(submit).toHaveBeenCalledWith({ selectedItemId: '0' })
    fireEvent.click(item('1'))
    expect(submit).toHaveBeenCalledTimes(1)
    expect(effects.praise).not.toHaveBeenCalled()
    expect(effects.retry).toHaveBeenCalledOnce()
  })
  it('accepts tap, praises a correct answer and sends only once while pending', async () => {
    let finish!: (r: AnswerResult) => void
    const submit = vi.fn().mockReturnValue(new Promise<AnswerResult>((resolve) => { finish = resolve }))
    render(<OddOneOutRenderer question={question} onSubmit={submit} />)
    fireEvent.touchEnd(item('1'))
    fireEvent.click(item('0'))
    expect(submit).toHaveBeenCalledTimes(1)
    expect(submit).toHaveBeenCalledWith({ selectedItemId: '1' })
    finish(verdict(true))
    await waitFor(() => outline('1', '#66BB6A'))
    expect(effects.confetti).toHaveBeenCalledOnce()
    expect(effects.praise).toHaveBeenCalledOnce()
    expect(effects.retry).not.toHaveBeenCalled()
    fireEvent.touchEnd(item('0'))
    expect(submit).toHaveBeenCalledTimes(1)
  })
  it.each([null, { selectedItemId: 42 }, { selectedItemId: 'absent' }])('does not guess a correct image for unusable key %s', async (key) => {
    render(<OddOneOutRenderer question={question} onSubmit={vi.fn().mockResolvedValue(verdict(false, key))} />)
    fireEvent.click(item('0'))
    await waitFor(() => outline('0', '#EF9A9A'))
    expect(document.querySelector('[data-stroke="#66BB6A"]')).toBeNull()
  })
  it('reports submission failure and allows another selection', async () => {
    const submit = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(verdict(true))
    render(<OddOneOutRenderer question={question} onSubmit={submit} />)
    fireEvent.click(item('0'))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(effects.retry).not.toHaveBeenCalled()
    fireEvent.click(item('1'))
    await waitFor(() => outline('1', '#66BB6A'))
    expect(submit).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })
  it('keeps a successful answer locked if a celebration effect fails', async () => {
    effects.confetti.mockImplementationOnce(() => { throw new Error('no canvas') })
    const submit = vi.fn().mockResolvedValue(verdict(true))
    render(<OddOneOutRenderer question={question} onSubmit={submit} />)
    fireEvent.click(item('1'))
    await waitFor(() => outline('1', '#66BB6A'))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(effects.praise).toHaveBeenCalledOnce()
    fireEvent.click(item('0'))
    expect(submit).toHaveBeenCalledOnce()
  })
  it.each([false, true])('does not show conflicting green outlines for a contradictory key (correct=%s)', async (isCorrect) => {
    render(<OddOneOutRenderer question={question} onSubmit={vi.fn().mockResolvedValue(verdict(isCorrect, { selectedItemId: isCorrect ? '1' : '0' }))} />)
    fireEvent.click(item('0'))
    await waitFor(() => outline('0', isCorrect ? '#66BB6A' : '#EF9A9A'))
    expect(document.querySelectorAll('[data-stroke="#66BB6A"]')).toHaveLength(isCorrect ? 1 : 0)
  })
  it('does not lock the learner for an invalid grading response', async () => {
    const submit = vi.fn().mockResolvedValue({ isCorrect: 'yes' })
    render(<OddOneOutRenderer question={question} onSubmit={submit} />)
    fireEvent.click(item('0'))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    fireEvent.click(item('1'))
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2))
  })
  it('discards a stale result and starts fresh when data changes under the same question id', async () => {
    let finish!: (r: AnswerResult) => void
    const submit = vi.fn().mockReturnValueOnce(new Promise<AnswerResult>((resolve) => { finish = resolve })).mockResolvedValue(verdict(true))
    const { rerender } = render(<OddOneOutRenderer question={question} onSubmit={submit} />)
    fireEvent.click(item('0'))
    rerender(<OddOneOutRenderer question={{ ...question, items: question.items.map((i) => ({ ...i, text: `${i.text} mới` })) }} onSubmit={submit} />)
    finish(verdict(true))
    await waitFor(() => expect(item('0')).toBeInTheDocument())
    expect(effects.praise).not.toHaveBeenCalled()
    fireEvent.click(item('1'))
    await waitFor(() => expect(effects.praise).toHaveBeenCalledOnce())
  })
  it('does not play effects after unmount', async () => {
    let finish!: (r: AnswerResult) => void
    const { unmount } = render(<OddOneOutRenderer question={question} onSubmit={() => new Promise((r) => { finish = r })} />)
    fireEvent.click(item('1'))
    unmount()
    finish(verdict(true))
    await Promise.resolve()
    expect(effects.praise).not.toHaveBeenCalled()
    expect(effects.confetti).not.toHaveBeenCalled()
  })
  it.each(['loading', 'failed', 'missing'])('keeps a usable fallback when images are %s', (state) => {
    effects.status = state
    const q = state === 'missing' ? { ...question, items: question.items.map(({ imageUrl: _drop, ...i }) => i) } : question
    render(<OddOneOutRenderer question={q} onSubmit={vi.fn()} />)
    expect(screen.getAllByText(state === 'loading' ? 'Đang tải hình' : /🖼️/)).toHaveLength(4)
    expect(item('1')).toBeInTheDocument()
  })
  it('loads images with anonymous CORS and contains their aspect ratio', () => {
    render(<OddOneOutRenderer question={question} onSubmit={vi.fn()} />)
    expect(effects.imageCalls).toContainEqual(['/0.png', 'anonymous'])
    expect(screen.getAllByTestId('image')[0]).toHaveAttribute('data-width', '144')
    expect(screen.getAllByTestId('image')[0]).toHaveAttribute('data-height', '72')
  })
  it.each([
    [], question.items.slice(0, 3), [...question.items, ...question.items.slice(0, 3)],
    question.items.map((i) => ({ ...i, id: 'same' })),
    question.items.map((i) => ({ ...i, id: '' })),
    question.items.map((i) => ({ ...i, text: ' ' })), [null, ...question.items.slice(1)],
  ].map((items) => ({ items })))('does not permit invalid items %#', ({ items }) => {
    const submit = vi.fn()
    render(<OddOneOutRenderer question={{ ...question, items } as unknown as StudentOddOneOutQuestion} onSubmit={submit} />)
    expect(screen.getByRole('status')).toHaveTextContent('Câu hỏi chưa sẵn sàng')
    expect(screen.queryByTestId('avm-option-0')).toBeNull()
    expect(submit).not.toHaveBeenCalled()
  })
})
