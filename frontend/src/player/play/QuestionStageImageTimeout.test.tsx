import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { PROFILES } from '../profile/profiles'
import type { PlayerApi } from '../api'
import type { AnswerResult } from '../../types/game-student.types'
import type { AnyPlayableRenderer } from '../renderers'
import QuestionStage from './QuestionStage'

vi.mock('../audio/useAutoReadPrompt', () => ({ useAutoReadPrompt: () => undefined }))
vi.mock('../../games/common/useQuestionAudio', () => ({ useQuestionAudio: () => () => undefined }))
vi.mock('../profile/useUiProfile', () => ({ useUiProfile: () => PROFILES.hocSinh }))
vi.mock('../shells/PlayerShell', () => ({
  default: ({ children, remainingSeconds, onPause }: { children: ReactNode; remainingSeconds: number | null; onPause?: () => void }) => (
    <div><button onClick={onPause}>Pause</button><span data-testid="remaining">{remainingSeconds}</span>{children}</div>
  ),
}))
vi.mock('./useHint', () => ({ useHint: () => false }))
vi.mock('./usePlayerHotkeys', () => ({ usePlayerHotkeys: () => undefined }))

afterEach(() => {
  vi.useRealTimers()
  window.sessionStorage.clear()
})

it('records timeout after an in-flight retryable IMAGE placement settles at zero', async () => {
  vi.useFakeTimers()
  let resolvePlacement!: (value: AnswerResult) => void
  const firstPlacement = new Promise<AnswerResult>((resolve) => { resolvePlacement = resolve })
  const submitInteraction = vi.fn()
    .mockReturnValueOnce(firstPlacement)
    .mockResolvedValueOnce({ status: 'TIMEOUT', isCorrect: false, retryable: false, pointsEarned: 0, totalScore: 0, correctAnswer: null })
  const Renderer = (({ onSubmit }: { onSubmit: (answer: { placements: { blankId: string; optionId: string }[] }) => Promise<AnswerResult> }) => (
    <button onClick={() => void onSubmit({ placements: [{ blankId: 'b1', optionId: 'o1' }] })}>Place option</button>
  )) as AnyPlayableRenderer
  render(<QuestionStage gameType="VISUAL_CLOZE" api={{ submitInteraction } as unknown as PlayerApi} sessionId="s" title="test"
    question={{ id: 'q1', timeLimitSeconds: 2, points: 10, questionText: 'Find it', sceneImageUrl: '/scene.png', sceneWidth: 400, sceneHeight: 240,
      blanks: [{ id: 'b1', x: 100, y: 100 }], options: [{ id: 'o1', visualPrompt: 'Bee' }, { id: 'o2', visualPrompt: 'Bird' }] }}
    Renderer={Renderer} progress={{ current: 1, total: 1 }} score={0} streak={0} result={null} isLast
    onAnswered={() => undefined} onNext={() => undefined} autoRead={false} />)

  fireEvent.click(screen.getByRole('button', { name: 'Place option' }))
  expect(submitInteraction).toHaveBeenCalledTimes(1)
  await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
  expect(screen.getByTestId('remaining')).toHaveTextContent('0')
  expect(submitInteraction).toHaveBeenCalledTimes(1)

  await act(async () => {
    resolvePlacement({ status: 'IN_PROGRESS', isCorrect: true, placementCorrect: true, retryable: true, pointsEarned: 0, totalScore: 0, correctAnswer: null })
    await firstPlacement
    await Promise.resolve()
  })

  expect(submitInteraction).toHaveBeenCalledTimes(2)
  expect(submitInteraction.mock.calls[1][2]).toEqual({ outcome: 'TIMEOUT' })
  vi.useRealTimers()
})

it('includes server-restored elapsed time in the next placement submission', async () => {
  const submitInteraction = vi.fn().mockResolvedValue({
    status: 'IN_PROGRESS', isCorrect: true, placementCorrect: true, retryable: true, pointsEarned: 0, totalScore: 0, correctAnswer: null,
  })
  const Renderer = (({ onSubmit }: { onSubmit: (answer: { placements: { blankId: string; optionId: string }[] }) => Promise<AnswerResult> }) => (
    <button onClick={() => void onSubmit({ placements: [{ blankId: 'b1', optionId: 'o1' }] })}>Place option</button>
  )) as AnyPlayableRenderer
  render(<QuestionStage gameType="VISUAL_CLOZE" api={{ submitInteraction } as unknown as PlayerApi} sessionId="s" title="test"
    question={{ id: 'q1', timeLimitSeconds: 30, points: 10, questionText: 'Find it', sceneImageUrl: '/scene.png', sceneWidth: 400, sceneHeight: 240,
      blanks: [{ id: 'b1', x: 100, y: 100 }], options: [{ id: 'o1', visualPrompt: 'Bee' }, { id: 'o2', visualPrompt: 'Bird' }], elapsedTimeMs: 4000 }}
    Renderer={Renderer} progress={{ current: 1, total: 1 }} score={0} streak={0} result={null} isLast
    onAnswered={() => undefined} onNext={() => undefined} autoRead={false} />)

  fireEvent.click(screen.getByRole('button', { name: 'Place option' }))
  await waitFor(() => expect(submitInteraction).toHaveBeenCalledTimes(1))
  expect(submitInteraction.mock.calls[0][3]).toBeGreaterThanOrEqual(4000)
})

it('keeps elapsed time across a refresh before the first IMAGE placement', async () => {
  let now = 1_000_000
  vi.spyOn(Date, 'now').mockImplementation(() => now)
  const submitInteraction = vi.fn().mockResolvedValue({
    status: 'IN_PROGRESS', isCorrect: true, placementCorrect: true, retryable: true, pointsEarned: 0, totalScore: 0, correctAnswer: null,
  })
  const Renderer = (({ onSubmit }: { onSubmit: (answer: { placements: { blankId: string; optionId: string }[] }) => Promise<AnswerResult> }) => (
    <button onClick={() => void onSubmit({ placements: [{ blankId: 'b1', optionId: 'o1' }] })}>Place option</button>
  )) as AnyPlayableRenderer
  const props = {
    gameType: 'VISUAL_CLOZE' as const,
    api: { submitInteraction } as unknown as PlayerApi,
    sessionId: 'refresh-session',
    title: 'test',
    question: { id: 'refresh-question', timeLimitSeconds: 30, points: 10, questionText: 'Find it', sceneImageUrl: '/scene.png', sceneWidth: 400, sceneHeight: 240,
      blanks: [{ id: 'b1', x: 100, y: 100 }], options: [{ id: 'o1', visualPrompt: 'Bee' }, { id: 'o2', visualPrompt: 'Bird' }] },
    Renderer,
    progress: { current: 1, total: 1 },
    score: 0,
    streak: 0,
    result: null,
    isLast: true,
    onAnswered: () => undefined,
    onNext: () => undefined,
    autoRead: false,
  }
  const firstMount = render(<QuestionStage {...props} />)
  firstMount.unmount()
  now += 5_000
  render(<QuestionStage {...props} />)

  fireEvent.click(screen.getByRole('button', { name: 'Place option' }))
  await waitFor(() => expect(submitInteraction).toHaveBeenCalledTimes(1))
  expect(submitInteraction.mock.calls[0][3]).toBeGreaterThanOrEqual(5_000)
})

it('does not count a paused interval across a refresh', () => {
  let now = 1_000_000
  vi.spyOn(Date, 'now').mockImplementation(() => now)
  const submitInteraction = vi.fn()
  const Renderer = (() => <div>Image puzzle</div>) as AnyPlayableRenderer
  const props = {
    gameType: 'VISUAL_CLOZE' as const,
    api: { submitInteraction } as unknown as PlayerApi,
    sessionId: 'paused-session',
    title: 'test',
    question: { id: 'paused-question', timeLimitSeconds: 10, points: 10, questionText: 'Find it', sceneImageUrl: '/scene.png', sceneWidth: 400, sceneHeight: 240,
      blanks: [{ id: 'b1', x: 100, y: 100 }], options: [{ id: 'o1', visualPrompt: 'Bee' }, { id: 'o2', visualPrompt: 'Bird' }] },
    Renderer,
    progress: { current: 1, total: 1 },
    score: 0,
    streak: 0,
    result: null,
    isLast: true,
    onAnswered: () => undefined,
    onNext: () => undefined,
    autoRead: false,
  }
  const firstMount = render(<QuestionStage {...props} />)
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
  now += 60_000
  firstMount.unmount()

  render(<QuestionStage {...props} />)
  expect(screen.getByTestId('remaining')).toHaveTextContent('10')
})

it('does not count network retry time in the next IMAGE placement', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(1_000_000))
  let resolveRetriedPlacement!: (value: AnswerResult) => void
  const retriedPlacement = new Promise<AnswerResult>((resolve) => { resolveRetriedPlacement = resolve })
  const networkError = Object.assign(new Error('offline'), { isAxiosError: true })
  const submitInteraction = vi.fn()
    .mockRejectedValueOnce(networkError)
    .mockImplementationOnce(() => retriedPlacement)
    .mockResolvedValueOnce({ status: 'IN_PROGRESS', isCorrect: true, placementCorrect: true, retryable: true, pointsEarned: 0, totalScore: 0, correctAnswer: null })
  const Renderer = (({ onSubmit }: { onSubmit: (answer: { placements: { blankId: string; optionId: string }[] }) => Promise<AnswerResult> }) => (
    <button onClick={() => void onSubmit({ placements: [{ blankId: 'b1', optionId: 'o1' }] })}>Place option</button>
  )) as AnyPlayableRenderer
  render(<QuestionStage gameType="VISUAL_CLOZE" api={{ submitInteraction } as unknown as PlayerApi} sessionId="network-session" title="test"
    question={{ id: 'network-question', timeLimitSeconds: 30, points: 10, questionText: 'Find it', sceneImageUrl: '/scene.png', sceneWidth: 400, sceneHeight: 240,
      blanks: [{ id: 'b1', x: 100, y: 100 }], options: [{ id: 'o1', visualPrompt: 'Bee' }, { id: 'o2', visualPrompt: 'Bird' }] }}
    Renderer={Renderer} progress={{ current: 1, total: 1 }} score={0} streak={0} result={null} isLast
    onAnswered={() => undefined} onNext={() => undefined} autoRead={false} />)

  fireEvent.click(screen.getByRole('button', { name: 'Place option' }))
  await act(async () => { await Promise.resolve(); await Promise.resolve() })
  await act(async () => { await vi.advanceTimersByTimeAsync(1_000) })
  expect(submitInteraction).toHaveBeenCalledTimes(2)
  await act(async () => { vi.setSystemTime(new Date(Date.now() + 60_000)) })
  await act(async () => {
    resolveRetriedPlacement({ status: 'IN_PROGRESS', isCorrect: false, placementCorrect: false, retryable: true, pointsEarned: 0, totalScore: 0, correctAnswer: null })
    await retriedPlacement
    await Promise.resolve()
  })

  fireEvent.click(screen.getByRole('button', { name: 'Place option' }))
  await act(async () => { await Promise.resolve(); await Promise.resolve() })
  expect(submitInteraction).toHaveBeenCalledTimes(3)
  expect(submitInteraction.mock.calls[2][3]).toBeLessThan(2_000)
})

it('submits timeout after resuming when an in-flight placement settles at zero while paused', async () => {
  vi.useFakeTimers()
  let resolvePlacement!: (value: AnswerResult) => void
  const firstPlacement = new Promise<AnswerResult>((resolve) => { resolvePlacement = resolve })
  const submitInteraction = vi.fn()
    .mockReturnValueOnce(firstPlacement)
    .mockResolvedValueOnce({ status: 'TIMEOUT', isCorrect: false, retryable: false, pointsEarned: 0, totalScore: 0, correctAnswer: null })
  const Renderer = (({ onSubmit }: { onSubmit: (answer: { placements: { blankId: string; optionId: string }[] }) => Promise<AnswerResult> }) => (
    <button onClick={() => void onSubmit({ placements: [{ blankId: 'b1', optionId: 'o1' }] })}>Place option</button>
  )) as AnyPlayableRenderer
  render(<QuestionStage gameType="VISUAL_CLOZE" api={{ submitInteraction } as unknown as PlayerApi} sessionId="paused-timeout" title="test"
    question={{ id: 'paused-timeout-question', timeLimitSeconds: 2, points: 10, questionText: 'Find it', sceneImageUrl: '/scene.png', sceneWidth: 400, sceneHeight: 240,
      blanks: [{ id: 'b1', x: 100, y: 100 }], options: [{ id: 'o1', visualPrompt: 'Bee' }, { id: 'o2', visualPrompt: 'Bird' }] }}
    Renderer={Renderer} progress={{ current: 1, total: 1 }} score={0} streak={0} result={null} isLast
    onAnswered={() => undefined} onNext={() => undefined} autoRead={false} />)

  fireEvent.click(screen.getByRole('button', { name: 'Place option' }))
  await act(async () => { await vi.advanceTimersByTimeAsync(2_000) })
  expect(screen.getByTestId('remaining')).toHaveTextContent('0')
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }))

  await act(async () => {
    resolvePlacement({ status: 'INCORRECT', isCorrect: false, placementCorrect: false, retryable: true, pointsEarned: 0, totalScore: 0, correctAnswer: null })
    await firstPlacement
    await Promise.resolve()
  })
  expect(submitInteraction).toHaveBeenCalledTimes(1)

  fireEvent.click(screen.getByRole('dialog').querySelector('button')!)
  await act(async () => { await Promise.resolve(); await Promise.resolve() })
  expect(submitInteraction).toHaveBeenCalledTimes(2)
  expect(submitInteraction.mock.calls[1][2]).toEqual({ outcome: 'TIMEOUT' })
})
