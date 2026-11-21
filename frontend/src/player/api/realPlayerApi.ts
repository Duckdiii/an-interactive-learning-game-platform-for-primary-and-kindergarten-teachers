import axiosInstance from '../../api/axiosInstance'
import type { ApiSuccessResponse } from '../../types/api'
import type { AnswerPayload, AnswerResult, PlayerSession, PublishInfo, StudentGame } from '../../types/game-student.types'
import type { PlayerApi } from './PlayerApi'

// Mạng lớp học hay "rơi gói" (kết nối không bị từ chối mà cũng không trả lời). Không có timeout thì
// bé ngồi nhìn spinner ở /play/:shareCode vô hạn, không hiện được màn hình lỗi + nút "Thử lại".
// Cùng mức với lệnh đọc danh sách game của giáo viên (`GAMES_REQUEST_TIMEOUT_MS`).
export const PLAYER_REQUEST_TIMEOUT_MS = 10_000

export class RealPlayerApi implements PlayerApi {
  async getPublishInfo(shareCode: string): Promise<PublishInfo> {
    const response = await axiosInstance.get<ApiSuccessResponse<PublishInfo>>(
      `/games/shared/${encodeURIComponent(shareCode)}`,
      { timeout: PLAYER_REQUEST_TIMEOUT_MS },
    )

    return response.data.data
  }

  async createSession(shareCode: string, nickname: string): Promise<PlayerSession> {
    const response = await axiosInstance.post<ApiSuccessResponse<PlayerSession>>(
      `/games/shared/${encodeURIComponent(shareCode)}/play`,
      { nickname },
      { timeout: PLAYER_REQUEST_TIMEOUT_MS },
    )

    return response.data.data
  }

  async getGameForStudent(sessionId: string): Promise<StudentGame> {
    const response = await axiosInstance.get<ApiSuccessResponse<StudentGame>>(
      `/sessions/${encodeURIComponent(sessionId)}/questions`,
      { headers: { 'X-Participant-Id': this.participantId(sessionId) }, timeout: PLAYER_REQUEST_TIMEOUT_MS },
    )

    return response.data.data
  }

  async submitInteraction(sessionId: string, questionId: string, answer: AnswerPayload, timeSpentMs = 0): Promise<AnswerResult> {
    const response = await axiosInstance.post<ApiSuccessResponse<AnswerResult>>(
      `/sessions/${encodeURIComponent(sessionId)}/interactions`,
      { questionId, timeSpentMs, ...answer },
      { headers: { 'X-Participant-Id': this.participantId(sessionId) }, timeout: PLAYER_REQUEST_TIMEOUT_MS },
    )

    return response.data.data
  }

  private participantId(sessionId: string): string {
    for (let index = 0; index < window.sessionStorage.length; index++) {
      const key = window.sessionStorage.key(index)
      if (!key?.startsWith('player:session:')) continue
      const raw = window.sessionStorage.getItem(key)
      if (!raw) continue
      try {
        const stored = JSON.parse(raw) as { sessionId?: unknown; participantId?: unknown }
        if (stored.sessionId === sessionId && typeof stored.participantId === 'string' && stored.participantId) return stored.participantId
      } catch {
        // Ignore other or malformed saved sessions.
      }
    }
    throw new Error('Không tìm thấy participantId cho phiên học sinh đã lưu')
  }
}
