import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { StudentAudioVisualMatchQuestion } from '../../types/game-student.types'
import { PROFILES } from '../profile/profiles'
import { getPlayableRenderer } from './index'

const effects = vi.hoisted(() => ({
  confetti: vi.fn(),
  feedback: vi.fn(),
  status: 'loaded' as 'loading' | 'failed' | 'loaded',
  imageCalls: [] as unknown[][],
  audioCalls: [] as { url: string | undefined; options: unknown; play: ReturnType<typeof vi.fn> }[],
}))
vi.mock('canvas-confetti', () => ({ default: effects.confetti }))
vi.mock('../../games/common/useAnswerAudio', () => ({ useAnswerAudio: () => effects.feedback }))
vi.mock('use-image', () => ({ default: (...args: unknown[]) => { effects.imageCalls.push(args); return [undefined, effects.status] } }))
vi.mock('../../games/common/ResponsiveStage', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('../../games/common/QuestionAudioButton', () => ({ default: ({ onPress }: { onPress: () => void }) => <button onClick={onPress}>Nghe lại</button> }))
vi.mock('../../games/common/useQuestionAudio', () => ({
  useQuestionAudio: (url: string | undefined, options: unknown) => {
    const play = vi.fn()
    effects.audioCalls.push({ url, options, play })
    return play
  },
}))
vi.mock('react-konva', () => ({
  Layer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Group: ({ children, onClick, name, x }: { children: ReactNode; onClick?: () => void; name?: string; x?: number }) =>
    <div data-testid={name} data-x={x} onClick={onClick}>{children}</div>,
  Rect: ({ stroke }: { stroke?: string }) => <span data-stroke={stroke} />,
  Image: () => <span>Ảnh</span>,
  Text: ({ text }: { text: string }) => <span>{text}</span>,
}))

const question: StudentAudioVisualMatchQuestion = {
  id: 'q1', timeLimitSeconds: 30, points: 10, audioText: 'Mèo', audioUrl: '/cat.mp3',
  options: [
    { id: 'a', visualPrompt: 'mèo', imageUrl: '/cat.png' },
    { id: 'b', visualPrompt: 'chó', imageUrl: '/dog.png' },
    { id: 'c', visualPrompt: 'chim', imageUrl: '/bird.png' },
  ],
}
const answer = (isCorrect: boolean, correctAnswer: Record<string, unknown> | null) =>
  ({ status: isCorrect ? 'CORRECT' as const : 'INCORRECT' as const, isCorrect, pointsEarned: 0, totalScore: 0, correctAnswer })

function setup(onSubmit = vi.fn().mockResolvedValue(answer(false, { selectedOptionId: 'a' })), q = question) {
  effects.audioCalls = []
  effects.feedback.mockClear()
  const Renderer = getPlayableRenderer('AUDIO_VISUAL_MATCH')
  expect(Renderer).toBeDefined()
  if (!Renderer) throw new Error('Thiếu renderer AUDIO_VISUAL_MATCH')
  render(<Renderer question={q} profile={PROFILES.hocSinh} onSubmit={onSubmit} />)
  return onSubmit
}

describe('AudioVisualMatchPlayable', () => {
  it('local preview can replay audioText when the sample has no audioUrl', () => {
    setup(undefined, { ...question, audioUrl: undefined })
    expect(effects.audioCalls).toContainEqual(expect.objectContaining({ url: undefined,
      options: expect.objectContaining({ ttsText: 'Mèo', html5: true }) }))
  })
  it('loads option images with anonymous CORS so canvas rendering is permitted', () => {
    effects.imageCalls = []
    setup()
    expect(effects.imageCalls).toContainEqual(['/cat.png', 'anonymous'])
  })

  it('chọn sai gửi đúng id, viền sai đỏ nhạt và viền đáp án đúng xanh', async () => {
    const submit = setup()
    fireEvent.click(screen.getByTestId('avm-option-b'))
    await waitFor(() => expect(submit).toHaveBeenCalledWith({ selectedOptionId: 'b' }))
    await waitFor(() => expect(screen.getByTestId('avm-option-a').querySelector('[data-stroke="#66BB6A"]')).toBeTruthy())
    expect(screen.getByTestId('avm-option-b').querySelector('[data-stroke="#EF9A9A"]')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Nghe lại' })).toBeEnabled()
    fireEvent.click(screen.getByTestId('avm-option-c'))
    expect(submit).toHaveBeenCalledTimes(1)
  })

  it('chọn đúng có viền xanh và confetti', async () => {
    effects.confetti.mockClear()
    setup(vi.fn().mockResolvedValue(answer(true, { selectedOptionId: 'a' })))
    fireEvent.click(screen.getByTestId('avm-option-a'))
    await waitFor(() => expect(screen.getByTestId('avm-option-a').querySelector('[data-stroke="#66BB6A"]')).toBeTruthy())
    expect(effects.confetti).toHaveBeenCalledTimes(1)
    expect(effects.feedback).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('plays the local spoken retry message after an incorrect answer', async () => {
    setup()
    fireEvent.click(screen.getByTestId('avm-option-b'))
    await waitFor(() => expect(screen.getByTestId('avm-option-a').querySelector('[data-stroke="#66BB6A"]')).toBeTruthy())
    expect(effects.feedback).toHaveBeenCalledExactlyOnceWith(false)
  })

  it('khóa hình khi hết giờ nhưng vẫn cho nghe lại', () => {
    effects.feedback.mockClear()
    const submit = vi.fn()
    const replay = vi.fn()
    const Renderer = getPlayableRenderer('AUDIO_VISUAL_MATCH')!
    render(<Renderer question={question} profile={PROFILES.hocSinh} onSubmit={submit} playAudio={replay} answerDisabled />)
    fireEvent.click(screen.getByTestId('avm-option-b'))
    expect(submit).not.toHaveBeenCalled()
    expect(effects.feedback).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Nghe lại' }))
    expect(replay).toHaveBeenCalledTimes(1)
  })

  it.each(['TIMEOUT', 'SKIPPED'] as const)('không báo sai nếu máy chủ trả %s', async (status) => {
    const submit = vi.fn().mockResolvedValue({ status, isCorrect: false, pointsEarned: 0, totalScore: 0, correctAnswer: null })
    setup(submit)
    await act(async () => { fireEvent.click(screen.getByTestId('avm-option-b')) })
    expect(submit).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('avm-option-b').querySelector('[data-stroke="#EF9A9A"]')).toBeNull()
    expect(effects.feedback).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('avm-option-c'))
    expect(submit).toHaveBeenCalledTimes(1)
  })

  it('không đoán hình đúng khi máy chủ không trả đáp án', async () => {
    setup(vi.fn().mockResolvedValue(answer(false, null)))
    fireEvent.click(screen.getByTestId('avm-option-b'))
    await waitFor(() => expect(screen.getByTestId('avm-option-b').querySelector('[data-stroke="#EF9A9A"]')).toBeTruthy())
    expect(document.querySelector('[data-stroke="#66BB6A"]')).toBeNull()
  })

  it('lỗi nộp thì mở khóa để chọn lại', async () => {
    const submit = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(answer(true, { selectedOptionId: 'a' }))
    setup(submit)
    fireEvent.click(screen.getByTestId('avm-option-a'))
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
    await waitFor(() => { fireEvent.click(screen.getByTestId('avm-option-a')); expect(submit).toHaveBeenCalledTimes(2) })
  })

  it('chạm liên tiếp khi đang chấm chỉ gửi một đáp án', async () => {
    let resolve!: (value: ReturnType<typeof answer>) => void
    const submit = vi.fn().mockReturnValue(new Promise((done) => { resolve = done }))
    setup(submit)
    fireEvent.click(screen.getByTestId('avm-option-a'))
    fireEvent.click(screen.getByTestId('avm-option-b'))
    expect(submit).toHaveBeenCalledTimes(1)
    expect(submit).toHaveBeenCalledWith({ selectedOptionId: 'a' })
    resolve(answer(true, { selectedOptionId: 'a' }))
    await waitFor(() => expect(screen.getByTestId('avm-option-a').querySelector('[data-stroke="#66BB6A"]')).toBeTruthy())
  })

  it('câu thiếu danh sách hình hiện lỗi và không gửi đáp án', () => {
    const invalid = { ...question, options: undefined } as unknown as StudentAudioVisualMatchQuestion
    const submit = setup(vi.fn(), invalid)
    expect(screen.getByText('Câu hỏi chưa sẵn sàng')).toBeInTheDocument()
    expect(submit).not.toHaveBeenCalled()
  })

  it.each([2, 3, 4])('%i hình căn giữa', (count) => {
    const options = Array.from({ length: count }, (_, index) => ({ id: String(index), visualPrompt: `hình ${index}` }))
    setup(vi.fn(), { ...question, options })
    const first = Number(screen.getByTestId('avm-option-0').getAttribute('data-x'))
    const last = Number(screen.getByTestId(`avm-option-${count - 1}`).getAttribute('data-x'))
    expect(first + last + 160).toBe(800)
  })

  it.each(['loading', 'failed'] as const)('ảnh %s có thông tin dự phòng', (status) => {
    effects.status = status
    setup()
    expect(screen.getAllByText(status === 'loading' ? 'Đang tải hình' : /🖼️.*mèo/s).length).toBeGreaterThan(0)
    effects.status = 'loaded'
  })

  it('hình thiếu URL có biểu tượng dự phòng', () => {
    setup(vi.fn(), { ...question, options: [{ id: 'a', visualPrompt: 'mèo' }, { id: 'b', visualPrompt: 'chó' }] })
    expect(screen.getByText(/🖼️.*mèo/s)).toBeInTheDocument()
  })
})
