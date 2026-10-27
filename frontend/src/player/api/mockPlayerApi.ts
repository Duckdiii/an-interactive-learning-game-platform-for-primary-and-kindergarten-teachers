import { buildMockGameContents } from '../../services/mock/gameFixtures'
import { mockApiError } from '../../services/mock/mockErrors'
import { runMock } from '../../services/mock/mockRuntime'
import type { GameDsl } from '../../types/game-dsl.types'
import type { AnswerPayload, AnswerResult, PlayerSession, PublishInfo, StudentGame, UiOverride } from '../../types/game-student.types'
import { MOCK_HANDLERS } from './mockPlayerHandlers'
import type { PlayerApi } from './PlayerApi'

// Phía học sinh MÔ PHỎNG (nhóm "sessions"): mỗi trong 10 game mẫu có mã chia sẻ MOCK00..MOCK09 (theo thứ tự của gameFixtures). Đáp án và
// việc chấm nằm hết trong lớp này; mọi thứ trả ra ngoài đi qua `MOCK_HANDLERS[...].toStudent` nên không chứa trường [ĐA].
// Mã thử lỗi (getPublishInfo và createSession đều đi qua gameOf): MOCKNP = GAME_NOT_PUBLISHED, MOCKEX = GAME_EXPIRED, MOCKDS = GAME_DISABLED
// (cùng 404); mã lạ khác là SHARE_CODE_NOT_FOUND. Mã chơi được: MOCK00..MOCK09, MOCK10, MOCK11.
// Thử lỗi mạng: `?mock=error` (lỗi ngay khi mở trang); giữa chừng thì `window.__mock.setScenario('error')` rồi `'normal'`,
// hoặc bật Offline rồi Online trong DevTools (Network).
// Biệt danh chứa từ cấm (ngu, bậy; không phân biệt hoa thường) = 422 UNSAFE_CONTENT.
// Điểm theo FLD-16: points × (1 − 0.5 × tỉ lệ thời gian đã dùng). Mô phỏng KHÔNG áp TIMEOUT theo đồng hồ (xem API-CONTRACT.md 2.5a).

const SCORE_TIME_FACTOR = 0.5
const NICKNAME_MAX = 20
const BANNED_NICKNAME_WORDS = ['ngu', 'bậy']
const SESSION_TTL_MS = 24 * 60 * 60 * 1000

interface MockSession {
  game: GameDsl
  participantId: string
  nickname: string
  expiresAt: string
  score: number
  results: Map<string, AnswerResult>
}

export const mockShareCodes = () => buildMockGameContents().map((_, index) => `MOCK${String(index).padStart(2, '0')}`)

// Mọi game mẫu đều thuộc khối Mầm non / lớp 1 (khung Bé). Hai mã thêm này mở lại QUIZ và MATCHING với giáo viên ghi đè sang khung Học sinh,
// để thử cả hai khung khi chưa có game lớp 2 đến 5.
const OVERRIDDEN_CODES: Readonly<Record<string, { gameIndex: number; uiOverride: UiOverride }>> = {
  MOCK10: { gameIndex: 0, uiOverride: 'HOC_SINH' },
  MOCK11: { gameIndex: 1, uiOverride: 'HOC_SINH' },
}

const ERROR_CODES: Readonly<Record<string, { code: string; message: string }>> = {
  MOCKNP: { code: 'GAME_NOT_PUBLISHED', message: 'Trò chơi chưa được xuất bản.' },
  MOCKEX: { code: 'GAME_EXPIRED', message: 'Trò chơi đã hết hạn.' },
  MOCKDS: { code: 'GAME_DISABLED', message: 'Trò chơi đang tạm đóng.' },
}

export class MockPlayerApi implements PlayerApi {
  private readonly games = buildMockGameContents()
  private readonly sessions = new Map<string, MockSession>()
  private nextId = 1

  getPublishInfo(shareCode: string): Promise<PublishInfo> {
    return runMock(() => {
      const game = this.gameOf(shareCode)

      return {
        gameTitle: game.metadata.title,
        gameType: game.gameType,
        questionCount: game.questions.length,
        metadata: { subject: game.metadata.subject, gradeLevel: game.metadata.gradeLevel, topic: game.metadata.topic },
        uiOverride: OVERRIDDEN_CODES[normalizeCode(shareCode)]?.uiOverride ?? 'AUTO',
        themeId: null,
      }
    })
  }

  createSession(shareCode: string, nickname: string): Promise<PlayerSession> {
    return runMock(() => {
      const game = this.gameOf(shareCode)
      const name = nickname.trim()

      if (name.length < 1 || name.length > NICKNAME_MAX) {
        throw mockApiError(400, 'VALIDATION_ERROR', `Biệt danh phải có từ 1 đến ${NICKNAME_MAX} ký tự.`)
      }

      const lowered = name.normalize('NFC').toLowerCase()

      if (BANNED_NICKNAME_WORDS.some((word) => lowered.includes(word))) {
        throw mockApiError(422, 'UNSAFE_CONTENT', 'Biệt danh có từ không phù hợp. Bạn chọn biệt danh khác nhé.')
      }

      const sessionId = `mock-session-${this.nextId}`
      const participantId = `mock-participant-${this.nextId}`
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

      this.nextId += 1
      this.sessions.set(sessionId, { game, participantId, nickname: name, expiresAt, score: 0, results: new Map() })

      return { sessionId, participantId, nickname: name, sessionType: 'SELF', status: 'ACTIVE', expiresAt }
    })
  }

  getGameForStudent(sessionId: string): Promise<StudentGame> {
    return runMock(() => {
      const session = this.sessionOf(sessionId)
      const { game } = session
      const handler = MOCK_HANDLERS[game.gameType]

      return {
        schemaVersion: game.schemaVersion,
        gameType: game.gameType,
        metadata: game.metadata,
        gameplaySettings: game.gameplaySettings,
        questions: game.questions.map((q) => handler.toStudent(q, `${sessionId}:${q.id}`)),
        answeredQuestionIds: [...session.results.keys()],
      } as StudentGame
    })
  }

  submitInteraction(sessionId: string, questionId: string, answer: AnswerPayload, timeSpentMs = 0): Promise<AnswerResult> {
    return runMock(() => {
      const session = this.sessionOf(sessionId)
      const question = session.game.questions.find((q) => q.id === questionId)

      if (!question) throw mockApiError(404, 'NOT_FOUND', 'Không tìm thấy câu hỏi.')

      const saved = session.results.get(questionId)

      if (saved) return saved

      const handler = MOCK_HANDLERS[session.game.gameType]
      const seed = `${sessionId}:${questionId}`
      const outcome = 'outcome' in answer ? answer.outcome : null
      const isCorrect = outcome === null && gradeOrReject(() => handler.isCorrect(question, seed, answer as never))
      const ratio = Math.min(1, Math.max(0, timeSpentMs / Math.max(1000, question.timeLimitSeconds * 1000)))
      const pointsEarned = isCorrect ? Math.round(question.points * (1 - SCORE_TIME_FACTOR * ratio)) : 0

      session.score += pointsEarned

      const result: AnswerResult = {
        status: outcome ?? (isCorrect ? 'CORRECT' : 'INCORRECT'),
        isCorrect,
        pointsEarned,
        totalScore: session.score,
        correctAnswer: handler.correct(question, seed),
      }

      session.results.set(questionId, result)

      return result
    })
  }

  private gameOf(shareCode: string) {
    const code = normalizeCode(shareCode)
    const failure = ERROR_CODES[code]

    if (failure) throw mockApiError(404, failure.code, failure.message)

    const game = this.games[OVERRIDDEN_CODES[code]?.gameIndex ?? mockShareCodes().indexOf(code)]

    if (!game) throw mockApiError(404, 'SHARE_CODE_NOT_FOUND', 'Mã không đúng hoặc trò chơi hiện không thể truy cập.')

    return game
  }

  private sessionOf(sessionId: string) {
    const session = this.sessions.get(sessionId)

    if (!session) throw mockApiError(404, 'NOT_FOUND', 'Không tìm thấy phiên chơi.')

    return session
  }
}

// Phần trả lời sai hình dạng (thiếu trường) là lỗi 400 như Backend thật, không phải "trả lời sai".
function gradeOrReject(grade: () => boolean) {
  try {
    return grade()
  } catch {
    throw mockApiError(400, 'VALIDATION_ERROR', 'Phần trả lời không đúng dạng của loại game này.')
  }
}

const normalizeCode = (shareCode: string) => shareCode.trim().toUpperCase()
