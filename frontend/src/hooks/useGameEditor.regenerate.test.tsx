import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import { getMockGame, resetMockGames, saveMockGame } from '../services/mock/mockGames'
import { setMockScenario } from '../services/mock/mockRuntime'
import { loginAsTeacher } from '../test/renderWithApp'
import type { QuestionDsl, QuizQuestion } from '../types/game-dsl.types'
import { loadDraft } from '../utils/draftStorage'
import { toContent } from '../utils/gameContent'
import { useGameEditor } from './useGameEditor'

// A6.2: đưa câu AI làm lại vào bản đang soạn (kiểm tra trước khi áp, bản vá trên trạng thái hiện hành, hoàn tác, sao lưu).
// mock-game-1 là QUIZ có 3 câu q1, q2, q3.
const GAME_ID = 'mock-game-1'
const OWNER = 't1'

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}

const quizText = (question: QuestionDsl) => (question as QuizQuestion).questionText

function setup() {
  const view = renderHook(() => useGameEditor(getMockGame(GAME_ID)), { wrapper })
  const original = structuredClone(view.result.current.draft.questions[0]) as QuizQuestion
  const replacement = { ...original, questionText: 'Con hãy đếm các con vật trong hình', options: [{ id: 'a', text: '1' }, { id: 'b', text: '2' }], correctOptionId: 'b' } as QuizQuestion

  return { ...view, original, replacement }
}

beforeEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'editor')
  loginAsTeacher()
  resetMockGames()
})
afterEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'none')
  vi.stubEnv('VITE_MOCK_LATENCY_MS', '0')
  setMockScenario('normal')
  localStorage.clear()
})

describe('useGameEditor.applyRegenerated', () => {
  it('câu hợp lệ: thay đúng thẻ, các thẻ khác nguyên vẹn, game "chưa lưu", thẻ có thể hoàn tác', () => {
    const { result, replacement } = setup()
    const others = result.current.draft.questions.slice(1)
    const revision = result.current.revision

    let applied: unknown

    act(() => {
      applied = result.current.applyRegenerated(0, 'q1', replacement)
    })

    expect(applied).toEqual({ ok: true })
    expect(quizText(result.current.draft.questions[0])).toBe('Con hãy đếm các con vật trong hình')
    expect(result.current.draft.questions.slice(1)).toEqual(others)
    expect(result.current.dirty).toBe(true)
    expect(result.current.regeneratedIds).toEqual(['q1'])
    // Ô nhập giữ chữ gõ dở được dựng lại để hiện đúng nội dung mới.
    expect(result.current.revision).toBe(revision + 1)
  })

  it('câu mới KHÔNG hợp lệ (ví dụ chỉ có 1 đáp án, hoặc điểm ngoài giới hạn): không áp, giữ câu cũ, không "chưa lưu", không có hoàn tác', () => {
    const { result, original } = setup()
    const oneOption = { ...original, options: [{ id: 'a', text: '1' }], correctOptionId: 'a' } as QuizQuestion
    const badPoints = { ...original, questionText: 'Câu mới', points: 0 } as QuizQuestion
    const results: unknown[] = []

    act(() => {
      results.push(result.current.applyRegenerated(0, 'q1', oneOption))
      results.push(result.current.applyRegenerated(0, 'q1', badPoints))
    })

    expect(results).toEqual([{ ok: false, reason: 'invalid' }, { ok: false, reason: 'invalid' }])
    expect(result.current.draft.questions[0]).toEqual(original)
    expect(result.current.dirty).toBe(false)
    expect(result.current.regeneratedIds).toEqual([])
  })

  it('thời gian Backend đã sinh (ngoài 10 đến 120 giây nhưng trong DSL) được giữ khi làm lại: kiểm tra có tính bản đã lưu làm mốc', () => {
    const saved = structuredClone(toContent(getMockGame(GAME_ID)))

    saved.questions[0].timeLimitSeconds = 135
    saveMockGame(GAME_ID, saved)

    const { result, replacement } = setup()
    let applied: unknown

    act(() => {
      applied = result.current.applyRegenerated(0, 'q1', { ...replacement, timeLimitSeconds: 135 } as QuizQuestion)
    })
    expect(applied).toEqual({ ok: true })

    // Nhưng thời gian giáo viên/AI tự đặt ngoài giới hạn SRS thì vẫn bị chặn.
    act(() => {
      applied = result.current.applyRegenerated(0, 'q1', { ...replacement, timeLimitSeconds: 140 } as QuizQuestion)
    })
    expect(applied).toEqual({ ok: false, reason: 'invalid' })
  })

  it('chỉ lỗi của CHÍNH câu mới mới chặn: một thẻ khác đang lỗi sẵn không cản việc làm lại thẻ này', () => {
    const { result, replacement } = setup()

    act(() => result.current.updateQuestion(1, 'q2', (question) => ({ ...question, points: 0 })))

    let applied: unknown

    act(() => {
      applied = result.current.applyRegenerated(0, 'q1', replacement)
    })

    expect(applied).toEqual({ ok: true })
    expect(result.current.draft.questions[1].points).toBe(0)
  })

  it('thẻ không còn ở vị trí đó, sai mã, hoặc câu mới mang mã khác: stale, không áp', () => {
    const { result, replacement } = setup()
    const results: unknown[] = []

    act(() => {
      results.push(result.current.applyRegenerated(1, 'q1', replacement))
      results.push(result.current.applyRegenerated(99, 'q1', replacement))
      results.push(result.current.applyRegenerated(0, 'q1', { ...replacement, id: 'q9' } as QuizQuestion))
    })

    expect(results).toEqual([
      { ok: false, reason: 'stale' },
      { ok: false, reason: 'stale' },
      { ok: false, reason: 'stale' },
    ])
    expect(result.current.dirty).toBe(false)
  })

  it('áp lên trạng thái HIỆN HÀNH: sửa tay ở thẻ khác trong lúc chờ AI vẫn còn', () => {
    const { result, replacement } = setup()

    act(() => result.current.updateQuestion(2, 'q3', (question) => ({ ...question, points: 77 })))
    act(() => {
      result.current.applyRegenerated(0, 'q1', replacement)
    })

    expect(result.current.draft.questions[2].points).toBe(77)
    expect(quizText(result.current.draft.questions[0])).toBe('Con hãy đếm các con vật trong hình')
  })
})

describe('useGameEditor: hoàn tác', () => {
  it('hoàn tác trả đúng câu cũ, hết "chưa lưu" và hết nút hoàn tác', () => {
    const { result, replacement, original } = setup()

    act(() => {
      result.current.applyRegenerated(0, 'q1', replacement)
    })
    act(() => result.current.undoRegenerated(0, 'q1'))

    expect(result.current.draft.questions[0]).toEqual(original)
    expect(result.current.dirty).toBe(false)
    expect(result.current.regeneratedIds).toEqual([])
  })

  it('sửa tiếp CHÍNH câu đó thì hết hoàn tác (và hoàn tác muộn không làm mất phần vừa sửa); sửa thẻ khác thì còn', () => {
    const { result, replacement } = setup()

    act(() => {
      result.current.applyRegenerated(0, 'q1', replacement)
    })
    act(() => result.current.updateQuestion(1, 'q2', (question) => ({ ...question, points: 55 })))
    expect(result.current.regeneratedIds).toEqual(['q1'])

    act(() => result.current.updateQuestion(0, 'q1', (question) => ({ ...question, points: 33 })))
    expect(result.current.regeneratedIds).toEqual([])

    act(() => result.current.undoRegenerated(0, 'q1'))
    expect(result.current.draft.questions[0].points).toBe(33)
    expect(quizText(result.current.draft.questions[0])).toBe('Con hãy đếm các con vật trong hình')
  })

  it('bấm Lưu thì hết hoàn tác', async () => {
    const { result, replacement } = setup()

    act(() => {
      result.current.applyRegenerated(0, 'q1', replacement)
    })
    expect(result.current.regeneratedIds).toEqual(['q1'])

    act(() => {
      result.current.save()
    })

    expect(result.current.regeneratedIds).toEqual([])
    await waitFor(() => expect(result.current.savedNotice).toBe(true))
    expect(quizText(getMockGame(GAME_ID).questions[0])).toBe('Con hãy đếm các con vật trong hình')
  })
})

describe('useGameEditor: bản sao lưu không chứa câu cũ', () => {
  it('sau khi AI làm lại, bản sao lưu trong localStorage là câu MỚI và không còn dấu vết của câu cũ hay của bộ nhớ hoàn tác', async () => {
    const { result, replacement, original } = setup()

    act(() => {
      result.current.applyRegenerated(0, 'q1', replacement)
    })

    await waitFor(() => expect(loadDraft(OWNER, GAME_ID)).not.toBeNull(), { timeout: 3000 })

    const raw = localStorage.getItem(`ai-game:editor-draft:${OWNER}:${GAME_ID}`)!
    const stored = loadDraft(OWNER, GAME_ID)!

    expect(quizText(stored.content.questions[0])).toBe('Con hãy đếm các con vật trong hình')
    expect(raw).not.toContain(original.questionText)
    expect(raw).not.toContain('previous')
    expect(raw).not.toContain('undo')
  })

  it('khôi phục bản sao lưu thì không có gì để hoàn tác', async () => {
    const first = setup()

    act(() => {
      first.result.current.applyRegenerated(0, 'q1', first.replacement)
    })
    await waitFor(() => expect(loadDraft(OWNER, GAME_ID)).not.toBeNull(), { timeout: 3000 })
    first.unmount()

    // Mở lại: có bản sao lưu chờ khôi phục; khôi phục xong cũng không có hoàn tác (câu cũ không được sao lưu).
    const reopened = renderHook(() => useGameEditor(getMockGame(GAME_ID)), { wrapper })

    expect(reopened.result.current.pendingRestore).not.toBeNull()
    act(() => reopened.result.current.restore())

    expect(quizText(reopened.result.current.draft.questions[0])).toBe('Con hãy đếm các con vật trong hình')
    expect(reopened.result.current.regeneratedIds).toEqual([])
  })
})
