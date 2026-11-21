import type { GameUnderstanding, GameUnderstandingResponse, UnderstandGameRequest } from '../../types/understanding.types'
import { rankGameTypes } from '../gameTypeSuggestionService'
import { runMock } from './mockRuntime'

// Mô phỏng `POST /games/understand` cho nhóm `ai` của VITE_USE_MOCK: luật đơn giản, đủ để thử giao diện chat (hỏi lại, phần chưa làm được,
// sửa thẻ) mà không gọi AI. Không cố bắt chước chất lượng của AI thật.

const UNSUPPORTED: ReadonlyArray<{ pattern: RegExp; need: string; fallback: string }> = [
  { pattern: /ghi âm|đọc to|phát âm|nói to/iu, need: 'Ghi âm và chấm giọng đọc của bé', fallback: 'Bé nghe máy đọc rồi chọn đáp án đúng' },
  { pattern: /tô chữ|tô màu|vẽ|viết theo nét/iu, need: 'Tô hoặc vẽ theo nét', fallback: 'Bé chọn hình hoặc chữ đúng' },
  { pattern: /mê cung|điều khiển nhân vật/iu, need: 'Mê cung, điều khiển nhân vật đi lại', fallback: 'Bé chạm vào đáp án đúng trên đường đi' },
]

// Mô tả quá ngắn ở lượt đầu thì hỏi lại một câu.
const SHORT_IDEA = 25

export function buildMockUnderstanding(request: UnderstandGameRequest): GameUnderstandingResponse {
  const teacherTexts = request.messages.filter((turn) => turn.role === 'TEACHER').map((turn) => turn.text.trim())
  const idea = teacherTexts.join('. ')
  const asked = request.messages.filter((turn) => turn.role === 'ASSISTANT').length
  const ranked = rankGameTypes({ idea, gradeLevel: request.gradeLevel, subject: request.subject }).map((item) => item.type)
  const unsupported = UNSUPPORTED.filter((item) => item.pattern.test(idea)).map(({ need, fallback }) => ({ need, fallback }))
  const listed = idea.includes(':') ? idea.slice(idea.indexOf(':') + 1).split(/[,;]/).map((item) => item.trim()).filter(Boolean) : []
  const previous = request.understanding

  const understanding: GameUnderstanding = previous ?? {
    learningGoal: teacherTexts[0].slice(0, 200),
    childAction: 'Chọn đáp án đúng',
    content: listed.slice(0, 20).map((item) => item.slice(0, 100)),
    setting: 'Theo chủ đề bài học',
    gameType: ranked[0] ?? 'QUIZ',
    alternativeGameTypes: ranked.slice(1, 3),
    unsupported,
    assumptions: listed.length === 0 ? ['Nội dung do AI đề xuất theo chủ đề'] : [],
  }
  const askNow = asked === 0 && teacherTexts.length === 1 && teacherTexts[0].length < SHORT_IDEA

  return {
    reply: unsupported.length > 0
      ? `Em hiểu ý thầy/cô. Hệ thống chưa làm được phần "${unsupported[0].need.toLowerCase()}", em đề xuất: ${unsupported[0].fallback.toLowerCase()}.`
      : 'Em đã tóm tắt yêu cầu ở thẻ bên cạnh, thầy/cô xem lại giúp em nhé.',
    question: askNow ? { text: 'Thầy/cô muốn bé luyện phần nào cụ thể ạ?', quickReplies: ['Nhận biết', 'So sánh', 'Đếm số'] } : null,
    understanding,
    ready: !askNow,
  }
}

export function mockUnderstandGame(request: UnderstandGameRequest): Promise<GameUnderstandingResponse> {
  return runMock(() => buildMockUnderstanding(request))
}
