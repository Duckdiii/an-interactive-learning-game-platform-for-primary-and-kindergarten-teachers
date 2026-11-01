import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetMockGames } from '../services/mock/mockGames'
import { setMockScenario } from '../services/mock/mockRuntime'
import { loginAsTeacher, renderWithProviders } from '../test/renderWithApp'
import type { QuizQuestion } from '../types/game-dsl.types'
import { validateQuestion } from '../utils/gameValidation'
import { TYPE_LIMITS } from '../utils/questionSpecs'
import WorkspaceEditor from './WorkspaceEditor'

// Ghim bộ đếm ký tự dùng chung của `CheckedTextField` (đếm theo code point SAU chuẩn hóa NFC) trên một form KHÁC WORD_SCRAMBLE (QUIZ): cùng một từ tiếng Việt có dấu,
// viết dạng dựng sẵn (NFC) hay dạng tổ hợp (NFD), phải cho CÙNG số đếm và CÙNG kết quả kiểm tra. Dùng chuỗi đúng bằng giới hạn để chênh lệch lộ ra: "ế" là 1 code point
// ở NFC nhưng 3 ở NFD (e + dấu mũ + dấu sắc).
const QUIZ_ID = 'mock-game-1'
const MAX = TYPE_LIMITS.QUIZ.optionText.max
const NFC = 'ế'.repeat(MAX)
const NFD = NFC.normalize('NFD')

const optionBox = () => screen.getByRole('textbox', { name: /Đáp án A/ })
const counter = (size: number) => `${size}/${MAX} ký tự`

async function openLoaded() {
  renderWithProviders(<WorkspaceEditor />, `/workspace/editor?gameId=${QUIZ_ID}`)
  await screen.findByRole('textbox', { name: /Tên trò chơi/ })
}

beforeEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'editor')
  loginAsTeacher()
  resetMockGames()
})
afterEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'none')
  setMockScenario('normal')
  localStorage.clear()
  vi.clearAllMocks()
})

const quiz = (text: string): QuizQuestion => ({
  id: 'q1',
  timeLimitSeconds: 30,
  points: 10,
  questionText: 'Chọn đáp án đúng',
  options: [
    { id: 'a', text },
    { id: 'b', text: 'khác' },
  ],
  correctOptionId: 'a',
})

describe('chuỗi NFC và NFD của cùng một từ cho cùng kết quả (bộ đếm dùng chung và bộ kiểm tra)', () => {
  it('hai dạng khác nhau thật ở mức code point (điều kiện của thử nghiệm)', () => {
    expect(NFC).not.toBe(NFD)
    expect([...NFC]).toHaveLength(MAX)
    expect([...NFD]).toHaveLength(MAX * 3)
    expect(NFD.normalize('NFC')).toBe(NFC)
  })

  it('bộ kiểm tra: đúng bằng giới hạn thì hợp lệ ở cả hai dạng, thêm một chữ thì cùng báo quá dài ở cả hai dạng', () => {
    for (const text of [NFC, NFD]) expect(validateQuestion('QUIZ', quiz(text), 0, 'save')).toEqual([])

    const codesOf = (text: string) => validateQuestion('QUIZ', quiz(`${text}ế`), 0, 'save').map((issue) => `${issue.field}:${issue.code}`)

    expect(codesOf(NFC)).toEqual(['options[0].text:tooLong'])
    expect(codesOf(NFD)).toEqual(codesOf(NFC))
  })

  it.each([
    ['NFC', NFC],
    ['NFD', NFD],
  ])('ô đáp án của QUIZ nhập dạng %s: bộ đếm hiện đúng "%s" = giới hạn, không đỏ, và đã áp thì bộ kiểm tra không báo quá dài', async (_name, text) => {
    await openLoaded()
    fireEvent.change(optionBox(), { target: { value: text } })

    // Bộ đếm cùng một con số ở hai dạng (đếm sau NFC).
    expect(screen.getAllByText(counter(MAX))).toHaveLength(1)
    expect(screen.queryByText(counter(MAX * 3))).not.toBeInTheDocument()

    fireEvent.blur(optionBox())
    await waitFor(() => expect(screen.queryByText('Đang áp dụng chỉnh sửa...')).not.toBeInTheDocument())

    expect(screen.queryByText(/tối đa 100 ký tự/)).not.toBeInTheDocument()
    expect(optionBox()).not.toHaveAttribute('aria-invalid', 'true')
    expect(screen.getAllByText(counter(MAX))).toHaveLength(1)
  })

  it('thêm một chữ vào chuỗi đầy: cả hai dạng cùng báo vượt giới hạn với CÙNG con số', async () => {
    await openLoaded()

    for (const text of [`${NFC}ế`, `${NFD}ế`.normalize('NFD')]) {
      fireEvent.change(optionBox(), { target: { value: text } })

      expect(screen.getAllByText(counter(MAX + 1))).toHaveLength(1)
    }
  })
})
