import { AI_BACKEND_ATTEMPTS } from '../../constants/aiLimits'
import type { GameType, QuestionDsl } from '../../types/game-dsl.types'
import type { RegeneratedQuestion } from '../../types/regenerate.types'
import { deepEqual } from '../../utils/gameContent'
import { hasPhrase, toMatchText } from '../../utils/phraseMatch'
import { buildMockGameContents } from './gameFixtures'
import { conflictError, mockApiError, notFoundError } from './mockErrors'
import { getMockGame, isMockGameLocked } from './mockGames'
import { findMockImages } from './mockMedia'
import type { VoiceGender } from './mockMedia'
import { mockNetworkError, mockTotalDelayMs, mockWait, getMockScenario } from './mockRuntime'
import { mockCheckSafety } from './safetyCheck'
import { isMock } from '../../config/mockMode'

// AI MÔ PHỎNG cho UC-06 (làm lại một câu), nhóm `ai` của cờ VITE_USE_MOCK. Backend thật chưa có điểm cuối này nên kết quả luôn là DỮ LIỆU
// MÔ PHỎNG: giao diện gắn nhãn. Mô phỏng đúng những gì Backend làm, kể cả việc Backend tự gọi lại dịch vụ AI tối đa 2 lần (tổng 1 + 2 lần),
// để giao diện thử được các nhánh 5a (không an toàn) và 5b (quá tải) mà không cần dịch vụ AI.

export interface MockRegenerateRequest {
  gameId: string
  questionId: string
  gameType: GameType
  current: QuestionDsl
  feedback: string
  voice: VoiceGender
}

// Gợi ý chứa các từ này thì "AI" trả về nội dung không an toàn (để thử nhánh 5a). Nội dung đó vẫn đi qua bộ lọc an toàn giả lập như nội dung thật.
export const MOCK_UNSAFE_HINT = /unsafe|nsfw|khong-an-toan/i

// Số lần thử đầu tiên bị "quá thời gian" trước khi AI trả lời (chỉ cho test và kiểm tay). 0, 1, 2 thì cuối cùng vẫn thành công; từ 3 trở lên là hết lượt.
let flakyAttempts = 0
let lastAttempts = 0
// Số lần đã làm lại của từng câu, để bấm liên tiếp ra các câu khác nhau.
const generations = new Map<string, number>()

export function setMockAiFlakiness(attempts: number) {
  flakyAttempts = Math.max(0, attempts)
}

/** Số lần gọi AI của lời yêu cầu gần nhất (1 là thành công ngay, 3 là đã dùng hết hai lần thử lại). */
export const getMockAiAttempts = () => lastAttempts

/** Chỉ cho test: đưa trạng thái mô phỏng AI về ban đầu. */
export function resetMockAi() {
  flakyAttempts = 0
  lastAttempts = 0
  generations.clear()
}

// Phần NỘI DUNG của câu (bỏ mã thẻ, thời gian, điểm do giáo viên đặt và ảnh, giọng đọc do AI tự gán sau khi làm lại): câu đang hiện đã được gán ảnh và giọng nên so cả hai thì
// không bao giờ nhận ra nó trùng câu mẫu gốc.
const contentOf = (question: QuestionDsl) => {
  const { id: _id, timeLimitSeconds: _time, points: _points, imageUrl: _image, audioUrl: _audio, ...rest } = question

  return rest
}

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(collectStrings)
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(collectStrings)

  return []
}

/** Chọn một câu cùng loại KHÁC câu hiện tại trong bộ câu mẫu, xoay vòng theo số lần làm lại; luôn giữ nguyên `id` của thẻ. */
function pickReplacement(request: MockRegenerateRequest): QuestionDsl {
  const pool = buildMockGameContents().find((game) => game.gameType === request.gameType)?.questions ?? []
  const different = pool.filter((question) => !deepEqual(contentOf(question), contentOf(request.current)))
  const candidates = different.length > 0 ? different : pool
  const count = generations.get(request.questionId) ?? 0

  generations.set(request.questionId, count + 1)

  // Giữ mã thẻ, thời gian và điểm giáo viên đã đặt: AI chỉ làm lại phần nội dung câu.
  return {
    ...structuredClone(candidates[count % candidates.length]),
    id: request.current.id,
    timeLimitSeconds: request.current.timeLimitSeconds,
    points: request.current.points,
  }
}

/** Gợi ý "dễ hơn" thì cho thêm thời gian, "khó hơn" thì bớt (trong khoảng 10 đến 120 giây của SRS). */
function adjustTime(question: QuestionDsl, feedback: string): QuestionDsl {
  const text = toMatchText(feedback)

  if (hasPhrase(text, 'de hon')) return { ...question, timeLimitSeconds: Math.min(120, Math.round(question.timeLimitSeconds * 1.5)) }
  if (hasPhrase(text, 'kho hon')) return { ...question, timeLimitSeconds: Math.max(10, Math.round(question.timeLimitSeconds * 0.7)) }

  return question
}

/** Bước 5 của UC-06: gán ảnh minh họa (theo mô tả hình) và giọng đọc (theo giọng đã chọn) cho câu mới. */
function decorate(question: QuestionDsl, voice: VoiceGender): QuestionDsl {
  const next: QuestionDsl = { ...question }
  const image = question.visualPrompt ? findMockImages(question.visualPrompt)[0] : undefined

  if (image) next.imageUrl = image.url
  if (question.audioText) next.audioUrl = `/mock/q1.wav?voice=${voice}`

  return next
}

export async function mockRegenerateQuestion(request: MockRegenerateRequest, signal?: AbortSignal): Promise<RegeneratedQuestion> {
  lastAttempts = 0

  // Độ trễ của đường truyền tới máy chủ.
  await mockWait(mockTotalDelayMs(), signal)

  if (getMockScenario() === 'error') throw mockNetworkError()

  // Máy chủ chỉ biết bản ĐÃ LƯU: câu mới thêm chưa lưu thì không có mã (404). Chỉ kiểm khi game thật sự nằm trong kho mô phỏng.
  if (isMock('editor')) {
    const saved = getMockGame(request.gameId)

    if (!saved.questions.some((question) => question.id === request.questionId)) throw notFoundError()
    if (isMockGameLocked(request.gameId)) throw conflictError()
  }

  // Backend gọi AI tối đa 3 lần: mỗi lần quá thời gian thì thử lại. Kịch bản `timeout` là AI không bao giờ trả lời kịp.
  for (let attempt = 1; attempt <= AI_BACKEND_ATTEMPTS; attempt += 1) {
    lastAttempts = attempt

    await mockWait(mockTotalDelayMs(), signal)

    const timedOut = getMockScenario() === 'timeout' || attempt <= flakyAttempts

    if (!timedOut) return finish(request)
  }

  throw mockApiError(504, 'AI_GENERATION_TIMEOUT', 'Dịch vụ AI không phản hồi kịp sau khi đã thử lại.')
}

function finish(request: MockRegenerateRequest): RegeneratedQuestion {
  let question = decorate(adjustTime(pickReplacement(request), request.feedback), request.voice)

  if (MOCK_UNSAFE_HINT.test(request.feedback)) question = { ...question, audioText: 'Cảnh máu me và giết người' }

  // Kiểm duyệt an toàn đầu ra (Layer 3), giống nội dung AI thật.
  if (!mockCheckSafety(collectStrings(question)).safe) {
    throw mockApiError(422, 'UNSAFE_CONTENT', 'Nội dung tạo lại không đạt chuẩn an toàn học đường.')
  }

  return { question, gameType: request.gameType }
}
