import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { postRegenerateQuestion } from '../api/gamesApi'
import { regenerateQuestion } from './aiService'
import type { RegenerateQuestionRequest } from './aiService'
import { buildMockGameContents } from './mock/gameFixtures'
import { resetMockAi } from './mock/mockAi'

vi.mock('../api/gamesApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/gamesApi')>()),
  postRegenerateQuestion: vi.fn(),
}))

const mockedPost = vi.mocked(postRegenerateQuestion)
const current = buildMockGameContents()[0].questions[0]
const request: RegenerateQuestionRequest = {
  gameId: 'g1',
  questionId: 'q1',
  gameType: 'QUIZ',
  current,
  feedback: ' dễ hơn ',
  voice: 'MALE',
}

beforeEach(() => resetMockAi())
afterEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'none')
  vi.clearAllMocks()
})

describe('regenerateQuestion', () => {
  it('nhóm ai KHÔNG mô phỏng: gọi API thật với mã game, mã câu, gợi ý và tín hiệu hủy; không gửi giọng đọc (contract chưa có) hay câu hiện tại', async () => {
    mockedPost.mockResolvedValue({ question: current, gameType: 'QUIZ' })

    const signal = new AbortController().signal
    const result = await regenerateQuestion(request, { signal })

    expect(result).toEqual({ question: current, gameType: 'QUIZ' })
    expect(mockedPost).toHaveBeenCalledTimes(1)
    expect(mockedPost).toHaveBeenCalledWith('g1', 'q1', { feedback: ' dễ hơn ', signal })
  })

  it('lỗi từ API thật được ném nguyên vẹn và KHÔNG thử lại (Backend đã thử lại 2 lần)', async () => {
    const failure = new Error('504')

    mockedPost.mockRejectedValue(failure)

    await expect(regenerateQuestion(request)).rejects.toBe(failure)
    expect(mockedPost).toHaveBeenCalledTimes(1)
  })

  it('nhóm ai đang mô phỏng: dùng AI giả lập, không gọi API', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'ai')

    const result = await regenerateQuestion(request)

    expect(result.gameType).toBe('QUIZ')
    expect(result.question.id).toBe('q1')
    expect(result.question.audioUrl).toContain('voice=MALE')
    expect(mockedPost).not.toHaveBeenCalled()
  })
})
