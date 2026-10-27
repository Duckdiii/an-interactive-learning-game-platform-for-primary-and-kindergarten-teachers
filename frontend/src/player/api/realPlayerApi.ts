import { PlayerApiNotSupportedError } from './PlayerApi'
import type { PlayerApi } from './PlayerApi'

// Backend hiện chỉ cài /auth/*; mọi endpoint của học sinh còn `planned`. Khi từng endpoint được cài thì thay đúng phương thức tương ứng
// bằng lời gọi axiosInstance (header X-Participant-Id lấy từ `createSession`), không đụng phần còn lại.
export class RealPlayerApi implements PlayerApi {
  getPublishInfo(): Promise<never> {
    return Promise.reject(new PlayerApiNotSupportedError('GET /games/shared/{shareCode}'))
  }

  createSession(): Promise<never> {
    return Promise.reject(new PlayerApiNotSupportedError('POST /games/shared/{shareCode}/play'))
  }

  getGameForStudent(): Promise<never> {
    return Promise.reject(new PlayerApiNotSupportedError('GET /sessions/{sessionId}/questions'))
  }

  submitInteraction(): Promise<never> {
    return Promise.reject(new PlayerApiNotSupportedError('POST /sessions/{sessionId}/interactions'))
  }
}
