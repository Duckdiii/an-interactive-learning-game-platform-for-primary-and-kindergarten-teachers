import type { AnswerPayload, AnswerResult, PlayerSession, PublishInfo, StudentGame } from '../../types/game-student.types'

/**
 * Cổng dữ liệu của phía học sinh, bám `docs/ui/API-CONTRACT.md`. Khác bản nháp trong yêu cầu ở hai chỗ để khớp contract:
 * `createSession` cần `shareCode` (`POST /games/shared/{code}/play`) và `getGameForStudent` nhận `sessionId`
 * (`GET /sessions/{id}/questions` chỉ có sau khi đã có phiên).
 *
 * Mọi dữ liệu trả ra ở đây là dạng học sinh: KHÔNG chứa trường [ĐA]. Đáp án chỉ đến sau khi chấm, trong `AnswerResult`.
 */
export interface PlayerApi {
  /** Thông tin game đã xuất bản, đủ để chọn khung (Bé / Học sinh) và theme trước khi vào chơi. */
  getPublishInfo(shareCode: string): Promise<PublishInfo>
  /** Tạo phiên tự luyện (SELF). `nickname` 1 đến 20 ký tự, không dùng tên thật. */
  createSession(shareCode: string, nickname: string): Promise<PlayerSession>
  getGameForStudent(sessionId: string): Promise<StudentGame>
  /** Gửi lại cùng câu trả về kết quả đã lưu, không cộng điểm lần hai. */
  submitInteraction(sessionId: string, questionId: string, answer: AnswerPayload, timeSpentMs?: number): Promise<AnswerResult>
}

/** Endpoint chưa có ở Backend (chỉ `x-status: planned` trong openapi.yaml): ném lỗi rõ ràng thay vì gọi vào chỗ không tồn tại. */
export class PlayerApiNotSupportedError extends Error {
  constructor(operation: string) {
    super(`Chưa hỗ trợ: Backend chưa cài endpoint cho "${operation}". Đặt VITE_PLAYER_API=mock để chạy bằng dữ liệu mô phỏng.`)
    this.name = 'PlayerApiNotSupportedError'
  }
}
