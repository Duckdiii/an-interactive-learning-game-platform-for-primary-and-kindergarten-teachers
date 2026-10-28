import { isMock } from '../../config/mockMode'
import type { MockGroup } from '../../config/mockMode'
import { chooseHomeApiKind } from './chooseHomeApiKind'
import type { HomeApi } from './HomeApi'
import { RealHomeApi } from './realHomeApi'

export { HomeApiNotSupportedError } from './HomeApi'
export type {
  CommonWrong,
  GameInsights,
  HomeApi,
  InsightsSessionType,
  LiveSession,
  QuestionInsight,
  ReviewNeeded,
} from './HomeApi'

/** `sessions` cho "Đang diễn ra", `results` cho "Cần ôn lại". `isSample` = đang dùng dữ liệu mẫu. */
export async function getHomeApi(
  group: Extract<MockGroup, 'sessions' | 'results'>,
): Promise<{ api: HomeApi; isSample: boolean }> {
  // Điều kiện PROD viết thẳng ở đây để Vite loại cả chunk mô phỏng khỏi bản build thật.
  if (!import.meta.env.PROD && chooseHomeApiKind(import.meta.env.PROD, isMock(group)) === 'mock') {
    const { MockHomeApi } = await import('./mockHomeApi')

    return { api: new MockHomeApi(), isSample: true }
  }

  return { api: new RealHomeApi(), isSample: false }
}
