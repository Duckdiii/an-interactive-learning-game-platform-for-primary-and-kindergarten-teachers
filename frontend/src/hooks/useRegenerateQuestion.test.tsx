import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PendingEditsContext } from '../components/editor/forms/PendingEditsContext'
import { regenerateQuestion } from '../services/aiService'
import { buildMockGameContents } from '../services/mock/gameFixtures'
import { mockApiError } from '../services/mock/mockErrors'
import { createPendingProbe } from '../test/probes'
import type { QuestionDsl } from '../types/game-dsl.types'
import { useRegenerateQuestion } from './useRegenerateQuestion'
import type { ApplyRegeneratedResult } from './useGameEditor'

vi.mock('../services/aiService', () => ({ regenerateQuestion: vi.fn() }))

const mockedRegenerate = vi.mocked(regenerateQuestion)
const current = buildMockGameContents()[0].questions[0]
const replacement = { ...buildMockGameContents()[0].questions[1], id: current.id } as QuestionDsl
type Resolved = Awaited<ReturnType<typeof regenerateQuestion>>

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

function setup(apply: () => ApplyRegeneratedResult = () => ({ ok: true }), getQuestion: () => QuestionDsl | undefined = () => current) {
  const probe = createPendingProbe()
  const applyRegenerated = vi.fn(apply)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <PendingEditsContext.Provider value={{ begin: probe.begin, pending: false }}>{children}</PendingEditsContext.Provider>
  )
  const view = renderHook(() => useRegenerateQuestion({ gameId: 'g1', gameType: 'QUIZ', voice: 'MALE', getQuestion, applyRegenerated }), {
    wrapper,
  })

  return { probe, applyRegenerated, ...view }
}

beforeEach(() => {
  mockedRegenerate.mockResolvedValue({ question: replacement, gameType: 'QUIZ' })
})
afterEach(() => vi.clearAllMocks())

describe('useRegenerateQuestion', () => {
  it('gửi câu hiện hành, gợi ý, giọng đã chọn; đưa câu mới vào đúng thẻ; khóa Lưu trong lúc chờ rồi mở lại', async () => {
    const pending = deferred<Resolved>()

    mockedRegenerate.mockReturnValue(pending.promise)

    const { result, probe, applyRegenerated } = setup()
    let outcome!: Promise<string>

    act(() => {
      outcome = result.current.regenerate(0, 'q1', 'làm dễ hơn')
    })

    expect(result.current.working).toBe(true)
    expect(probe.active).toBe(1)
    expect(mockedRegenerate).toHaveBeenCalledWith(
      { gameId: 'g1', questionId: 'q1', gameType: 'QUIZ', current, feedback: 'làm dễ hơn', voice: 'MALE' },
      { signal: expect.any(AbortSignal) },
    )

    await act(async () => pending.resolve({ question: replacement, gameType: 'QUIZ' }))

    await expect(outcome).resolves.toBe('applied')
    expect(applyRegenerated).toHaveBeenCalledWith(0, 'q1', replacement)
    expect(probe.active).toBe(0)
    expect(result.current.working).toBe(false)
    expect(result.current.failure).toBeNull()
  })

  it('lỗi không an toàn (5a): ra loại unsafe với đúng câu SRS, KHÔNG áp câu nào, KHÔNG tự thử lại', async () => {
    mockedRegenerate.mockRejectedValue(mockApiError(422, 'UNSAFE_CONTENT', 'x'))

    const { result, applyRegenerated } = setup()
    let outcome = ''

    await act(async () => {
      outcome = await result.current.regenerate(0, 'q1', 'gợi ý')
    })

    expect(outcome).toBe('failed')
    expect(result.current.failure).toEqual({
      kind: 'unsafe',
      message: 'Nội dung tạo lại chưa đạt chuẩn an toàn học đường. Hệ thống đã khôi phục câu hỏi cũ, vui lòng thử lại với gợi ý mô tả khác.',
    })
    expect(applyRegenerated).not.toHaveBeenCalled()
    expect(mockedRegenerate).toHaveBeenCalledTimes(1)
  })

  it('máy chủ AI bận (5b): loại busy; bấm thử lại là một lần gọi MỚI do giáo viên chủ động, và thành công thì xóa lỗi', async () => {
    mockedRegenerate.mockRejectedValueOnce(mockApiError(504, 'AI_GENERATION_TIMEOUT', 'x'))

    const { result, applyRegenerated } = setup()

    await act(async () => {
      await result.current.regenerate(0, 'q1', '')
    })
    expect(result.current.failure?.kind).toBe('busy')
    expect(mockedRegenerate).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.regenerate(0, 'q1', '')
    })
    expect(mockedRegenerate).toHaveBeenCalledTimes(2)
    expect(result.current.failure).toBeNull()
    expect(applyRegenerated).toHaveBeenCalledTimes(1)
  })

  it('câu AI trả về không hợp lệ (bộ kiểm tra từ chối): KHÔNG áp, báo lỗi invalid, thẻ giữ nguyên', async () => {
    const { result } = setup(() => ({ ok: false, reason: 'invalid' }))
    let outcome = ''

    await act(async () => {
      outcome = await result.current.regenerate(0, 'q1', '')
    })

    expect(outcome).toBe('failed')
    expect(result.current.failure).toEqual({
      kind: 'invalid',
      message: 'Câu AI tạo lại chưa hợp lệ nên chưa được dùng. Câu hiện tại vẫn được giữ nguyên, vui lòng thử lại.',
    })
  })

  it('lỗi "không hợp lệ" của lần trước được xóa khi gọi lại và lần này áp được', async () => {
    let allowed = false
    const { result } = setup(() => (allowed ? { ok: true } : { ok: false, reason: 'invalid' }))

    await act(async () => {
      await result.current.regenerate(0, 'q1', '')
    })
    expect(result.current.failure?.kind).toBe('invalid')

    allowed = true
    await act(async () => {
      expect(await result.current.regenerate(0, 'q1', '')).toBe('applied')
    })
    expect(result.current.failure).toBeNull()
  })

  it('thẻ đã đổi chỗ khi kết quả về (stale): không áp, báo lỗi chung', async () => {
    const { result } = setup(() => ({ ok: false, reason: 'stale' }))

    await act(async () => {
      await result.current.regenerate(0, 'q1', '')
    })

    expect(result.current.failure?.kind).toBe('other')
  })

  it('AI trả câu sai mã thẻ hoặc sai loại game thì không tin và không áp', async () => {
    const { result, applyRegenerated } = setup()

    mockedRegenerate.mockResolvedValueOnce({ question: { ...replacement, id: 'q9' } as QuestionDsl, gameType: 'QUIZ' })
    await act(async () => {
      await result.current.regenerate(0, 'q1', '')
    })
    expect(result.current.failure?.kind).toBe('invalid')

    mockedRegenerate.mockResolvedValueOnce({ question: replacement, gameType: 'MATCHING' })
    await act(async () => {
      await result.current.regenerate(0, 'q1', '')
    })
    expect(result.current.failure?.kind).toBe('invalid')
    expect(applyRegenerated).not.toHaveBeenCalled()
  })

  it('thẻ không còn trong bản đang soạn thì không gọi AI', async () => {
    const { result } = setup(undefined, () => undefined)

    await act(async () => {
      expect(await result.current.regenerate(0, 'q1', '')).toBe('failed')
    })

    expect(mockedRegenerate).not.toHaveBeenCalled()
    expect(result.current.failure?.kind).toBe('other')
  })

  it('hủy: mở khóa ngay, kết quả về muộn bị bỏ (không áp), không coi là lỗi', async () => {
    const pending = deferred<Resolved>()

    mockedRegenerate.mockReturnValue(pending.promise)

    const { result, probe, applyRegenerated } = setup()
    let outcome!: Promise<string>

    act(() => {
      outcome = result.current.regenerate(0, 'q1', '')
    })
    act(() => result.current.cancel())

    expect(probe.active).toBe(0)
    expect(mockedRegenerate.mock.calls[0][1]?.signal?.aborted).toBe(true)

    await act(async () => pending.resolve({ question: replacement, gameType: 'QUIZ' }))

    await expect(outcome).resolves.toBe('canceled')
    expect(applyRegenerated).not.toHaveBeenCalled()
    expect(result.current.failure).toBeNull()
  })

  it('đóng giữa chừng: tự hủy, mở khóa, không áp kết quả muộn', async () => {
    const pending = deferred<Resolved>()

    mockedRegenerate.mockReturnValue(pending.promise)

    const { result, probe, applyRegenerated, unmount } = setup()

    act(() => {
      void result.current.regenerate(0, 'q1', '')
    })
    unmount()

    expect(probe.active).toBe(0)
    pending.resolve({ question: replacement, gameType: 'QUIZ' })
    await waitFor(() => expect(mockedRegenerate.mock.calls[0][1]?.signal?.aborted).toBe(true))
    expect(applyRegenerated).not.toHaveBeenCalled()
  })

  it('gọi lần hai khi lần một chưa xong thì không gửi thêm yêu cầu', async () => {
    const pending = deferred<Resolved>()

    mockedRegenerate.mockReturnValue(pending.promise)

    const { result } = setup()

    act(() => {
      void result.current.regenerate(0, 'q1', '')
      void result.current.regenerate(0, 'q1', '')
    })

    expect(mockedRegenerate).toHaveBeenCalledTimes(1)
    await act(async () => pending.resolve({ question: replacement, gameType: 'QUIZ' }))
  })

  it('clearFailure xóa lỗi hiện tại', async () => {
    mockedRegenerate.mockRejectedValue(mockApiError(504, 'AI_GENERATION_TIMEOUT', 'x'))

    const { result } = setup()

    await act(async () => {
      await result.current.regenerate(0, 'q1', '')
    })
    expect(result.current.failure).not.toBeNull()

    act(() => result.current.clearFailure())
    expect(result.current.failure).toBeNull()
  })
})
