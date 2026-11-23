// Dữ liệu Trang chủ và trang Kết quả của giáo viên. `getGameInsights`, `getQuestionInsights` và `listReviewNeeded` đã có endpoint
// thật (API-CONTRACT mục 2.8); `listLiveSessions` còn ở mức đề xuất (mục 2.10) nên Backend CHƯA có. Chỉ khai các trường
// màn hình dùng tới.

export interface LiveSession {
  sessionId: string
  gameId: string
  gameTitle: string
  status: 'WAITING' | 'ACTIVE' | 'PAUSED'
  participantCount: number
  // Chỉ số câu đang chơi tính từ 0 (null khi chưa bắt đầu); questionCount theo API-CONTRACT 2.10, vắng thì không hiện "/tổng".
  currentQuestionIndex: number | null
  questionCount?: number | null
}

export interface ReviewNeeded {
  gameId: string
  gameTitle: string
  questionId: string
  questionText: string
  // Tỉ lệ đúng 0..1.
  correctRate: number
  commonWrong?: { label: string; count: number } | null
}

// Kết quả theo câu của một game (API-CONTRACT 2.8, `GET /games/{gameId}/insights`). Chỉ khai các trường màn hình dùng.
export type InsightsSessionType = 'SOLO' | 'TEAM' | 'SELF'

export interface CommonWrong {
  // Chuỗi đã dựng sẵn ở Backend cho người đọc (đáp án sai khác hình dạng theo loại game).
  label: string
  count: number
}

export interface QuestionInsight {
  questionId: string
  // Thứ tự câu, tính từ 1.
  order: number
  text: string
  answeredCount: number
  // Tỉ lệ đúng 0..1.
  correctRate: number
  avgAttempts: number
  needsReview: boolean
  commonWrong: CommonWrong[]
}

export interface GameInsights {
  playCount: number
  correctRate: number
  avgAttemptsPerQuestion: number
  // Tỉ lệ học sinh làm hết các câu (0..1) và điểm trung bình mỗi học sinh đã chơi.
  completionRate: number
  avgScore: number
  // true khi có lượt chơi nhưng ít (Backend dưới 5): số liệu chỉ mang tính tham khảo. Vắng nghĩa là không cảnh báo.
  lowSample: boolean
  questions: QuestionInsight[]
}

/** Khoảng ngày (`YYYY-MM-DD`, tính trọn ngày) lọc theo ngày tạo phiên, và lớp học (UC-16); bỏ trống là không giới hạn. */
export interface InsightsRange {
  from?: string
  to?: string
  classroomId?: string
}

export interface AnswerShare {
  label: string
  count: number
  correct: boolean
}

// Chi tiết một câu (`GET /games/{gameId}/questions/{questionId}/insights`).
export interface QuestionInsightDetail {
  questionId: string
  order: number
  text: string
  answeredCount: number
  correctRate: number
  needsReview: boolean
  // Chỉ đáp án lặp từ 2 lần; phần còn lại gộp vào otherCount. noAnswerCount là bỏ qua hoặc hết giờ.
  distribution: AnswerShare[]
  otherCount: number
  noAnswerCount: number
}

export interface HomeApi {
  /** `GET /sessions?status=WAITING,ACTIVE,PAUSED` */
  listLiveSessions(): Promise<LiveSession[]>
  /** `GET /insights/review-needed?limit=` */
  listReviewNeeded(limit: number): Promise<ReviewNeeded[]>
  /** `GET /games/{gameId}/insights?sessionType=&from=&to=`; bỏ `sessionType` là tất cả loại lượt chơi. */
  getGameInsights(gameId: string, sessionType?: InsightsSessionType, range?: InsightsRange): Promise<GameInsights>
  /** `GET /games/{gameId}/questions/{questionId}/insights?sessionType=&from=&to=` */
  getQuestionInsights(
    gameId: string,
    questionId: string,
    sessionType?: InsightsSessionType,
    range?: InsightsRange,
  ): Promise<QuestionInsightDetail>
}

/** Endpoint còn ở mức đề xuất: giao diện coi như "chưa có dữ liệu", không báo lỗi. */
export class HomeApiNotSupportedError extends Error {
  constructor(operation: string) {
    super(`Chưa hỗ trợ: Backend chưa cài endpoint "${operation}".`)
    this.name = 'HomeApiNotSupportedError'
  }
}
