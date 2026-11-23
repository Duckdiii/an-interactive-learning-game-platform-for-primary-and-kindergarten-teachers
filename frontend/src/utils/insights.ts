import { ROUTES } from '../routes/paths'
import type { InsightsSessionType, QuestionInsight } from '../services/home'

// Hàm thuần cho trang "Kết quả" (F8).

/** Địa chỉ trang Kết quả của một game. */
export const resultsLink = (gameId: string) => `${ROUTES.results}?${new URLSearchParams({ gameId }).toString()}`

// Chip lọc trên trang; giá trị nằm trên địa chỉ (?type=).
export type ResultsFilter = 'ALL' | 'TEAM' | 'SELF'

export const parseResultsFilter = (raw: string | null): ResultsFilter => (raw === 'TEAM' || raw === 'SELF' ? raw : 'ALL')

/** Ngày hợp lệ dạng `YYYY-MM-DD` từ địa chỉ, ngược lại bỏ qua (không tin giá trị tùy ý trên URL). */
export function parseDateParam(raw: string | null): string | undefined {
  const match = raw === null ? null : /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  if (!match) return undefined

  // So lại từng phần: `Date.parse` tự cuộn "2026-02-31" thành 3/3 nên không đủ để biết ngày có thật.
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? raw ?? undefined : undefined
}

/** Tất cả lượt thì không gửi `sessionType` (API-CONTRACT 2.8). */
export const filterToSessionType = (filter: ResultsFilter): InsightsSessionType | undefined =>
  filter === 'ALL' ? undefined : filter

/** Câu cần ôn lại nổi bật nhất: trong các câu `needsReview`, câu có tỉ lệ đúng thấp nhất (hòa thì câu đứng trước). */
export function pickReviewQuestion(questions: ReadonlyArray<QuestionInsight>): QuestionInsight | null {
  const candidates = questions.filter((question) => question.needsReview)

  return candidates.reduce<QuestionInsight | null>(
    (best, question) =>
      !best || question.correctRate < best.correctRate || (question.correctRate === best.correctRate && question.order < best.order)
        ? question
        : best,
    null,
  )
}

// Chặn trong 0..100: số liệu lỗi từ máy chủ (tỉ lệ âm hoặc trên 1) không làm thanh tràn khung.
export const toPercent = (rate: number) => Math.min(100, Math.max(0, Math.round(rate * 100)))

/** Dưới 50% thì thanh tỉ lệ đổi sang màu vàng (không dùng đỏ). So theo số % ĐÃ làm tròn để màu khớp chữ đang hiện (0,496 hiện "50%" thì không vàng). */
export const isLowRate = (rate: number) => toPercent(rate) < 50

/** Số thập phân kiểu Việt Nam: 1,6 (dấu phẩy). */
export const formatDecimalVi = (value: number, digits = 1) => value.toFixed(digits).replace('.', ',')

/** Mã (lớp, game...) hợp lệ từ địa chỉ: chữ, số, gạch; ngược lại bỏ qua, không gửi giá trị tùy ý lên máy chủ. */
export const parseIdParam = (raw: string | null): string | undefined =>
  raw !== null && /^[A-Za-z0-9_-]{1,64}$/.test(raw) ? raw : undefined
