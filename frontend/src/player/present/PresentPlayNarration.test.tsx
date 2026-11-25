import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { postGenerateNarrationFeedback, postGenerateNarrationPreview } from '../../api/gamesApi'
import { buildMockGameContents } from '../../services/mock/gameFixtures'
import type { AnswerPayload, AnswerResult } from '../../types/game-student.types'
import type { GameResponse } from '../../types/game-response.types'
import { resolveUiProfile } from '../profile/resolveUiProfile'
import { UiProfileProvider } from '../profile/UiProfileContext'
import { resolveTheme } from '../theme/resolveTheme'
import { ThemeProvider } from '../theme/ThemeContext'
import PresentPlay from './PresentPlay'

const narrationApi = vi.hoisted(() => ({ preview: vi.fn(), feedback: vi.fn() }))

vi.mock('../../api/gamesApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/gamesApi')>()
  return {
    ...actual,
    postGenerateNarrationPreview: narrationApi.preview,
    postGenerateNarrationFeedback: narrationApi.feedback,
  }
})

vi.mock('../../components/editor/preview/previewModel', () => ({
  toPreviewStudentQuestion: (_gameType: string, question: unknown) => question,
}))

vi.mock('../../components/editor/preview/usePreviewGrader', () => ({
  usePreviewGrader: () => (answer: AnswerPayload): AnswerResult => {
    const isCorrect = 'selectedOptionId' in answer && answer.selectedOptionId === 'b'
    return { status: isCorrect ? 'CORRECT' : 'INCORRECT', isCorrect, pointsEarned: 0, totalScore: 0, correctAnswer: null }
  },
}))

vi.mock('../renderers', () => ({
  getPlayableRenderer: () => function TestPlayable({ onSubmit }: { onSubmit: (answer: AnswerPayload) => Promise<AnswerResult> }) {
    return (
      <div>
        <button type="button" onClick={() => void onSubmit({ selectedOptionId: 'b' })}>Answer correctly</button>
        <button type="button" onClick={() => void onSubmit({ selectedOptionId: 'a' })}>Answer incorrectly</button>
      </div>
    )
  },
}))

vi.mock('./FitToHeight', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }))

const audioInstances: MockAudio[] = []

class MockAudio {
  readonly src: string
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  currentTime = 0
  playbackRate = 1
  play = vi.fn(async (): Promise<void> => undefined)
  pause = vi.fn()

  constructor(src: string) {
    this.src = src
    audioInstances.push(this)
  }
}

const narrationUrls = {
  question: 'https://storage.test/presentation-question.mp3',
  correct: 'https://storage.test/presentation-correct.mp3',
  wrong: 'https://storage.test/presentation-wrong.mp3',
}

const [quiz] = buildMockGameContents()
const game = { ...quiz, gameId: 'saved-game', status: 'PUBLISHED', updatedAt: '' } as GameResponse

function renderPresentation() {
  const profile = resolveUiProfile({ gradeLevel: game.metadata.gradeLevel })
  render(
    <UiProfileProvider profile={profile}>
      <ThemeProvider theme={resolveTheme({ themeId: null, gameType: game.gameType, subject: game.metadata.subject })}>
        <PresentPlay game={game} onLeave={vi.fn()} />
      </ThemeProvider>
    </UiProfileProvider>,
  )
}

async function flushNarrationRequests() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('PresentPlay narration', () => {
  beforeEach(() => {
    audioInstances.length = 0
    vi.useFakeTimers()
    vi.stubGlobal('Audio', MockAudio)
    vi.mocked(postGenerateNarrationPreview).mockReset().mockResolvedValue({
      questionId: 'q1', audioUrl: narrationUrls.question, bytes: 1200, durationMillis: 1500,
    })
    vi.mocked(postGenerateNarrationFeedback).mockReset().mockResolvedValue({
      correctAudioUrl: narrationUrls.correct, wrongAudioUrl: narrationUrls.wrong,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('plays the saved question narration and replays it from the presentation control', async () => {
    renderPresentation()
    await flushNarrationRequests()

    expect(postGenerateNarrationPreview).toHaveBeenCalledWith('saved-game', 'q1', expect.any(AbortSignal))
    expect(postGenerateNarrationFeedback).toHaveBeenCalledWith('saved-game')

    await act(async () => { await vi.advanceTimersByTimeAsync(500) })
    expect(audioInstances.map((audio) => audio.src)).toEqual([narrationUrls.question])

    fireEvent.click(screen.getByRole('button', { name: /Đọc lại/ }))
    expect(audioInstances.map((audio) => audio.src)).toEqual([narrationUrls.question, narrationUrls.question])
  })

  it('speaks the correct verdict after a correct presentation answer', async () => {
    renderPresentation()
    await flushNarrationRequests()
    fireEvent.click(screen.getByRole('button', { name: 'Answer correctly' }))
    expect(screen.getByText('Giỏi quá!')).toBeInTheDocument()

    await act(async () => { await vi.advanceTimersByTimeAsync(550) })
    expect(audioInstances.at(-1)?.src).toBe(narrationUrls.correct)
  })

  it('speaks the incorrect verdict after an incorrect presentation answer', async () => {
    renderPresentation()
    await flushNarrationRequests()
    fireEvent.click(screen.getByRole('button', { name: 'Answer incorrectly' }))
    expect(screen.getByText(/Gần đúng rồi/)).toBeInTheDocument()

    expect(audioInstances.at(-1)?.src).toBe(narrationUrls.wrong)
  })

  it('keeps text feedback and presentation playable when narration APIs fail', async () => {
    vi.mocked(postGenerateNarrationPreview).mockRejectedValueOnce(new Error('preview unavailable'))
    vi.mocked(postGenerateNarrationFeedback).mockRejectedValueOnce(new Error('feedback unavailable'))
    renderPresentation()
    await flushNarrationRequests()

    fireEvent.click(screen.getByRole('button', { name: 'Answer correctly' }))
    expect(screen.getByText('Giỏi quá!')).toBeInTheDocument()
    expect(audioInstances).toHaveLength(0)
  })
})
