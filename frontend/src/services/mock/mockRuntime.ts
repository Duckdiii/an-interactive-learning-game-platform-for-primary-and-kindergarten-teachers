import { AxiosError, CanceledError } from 'axios'
import { setMockGameLocked } from './mockGames'

// Môi trường chạy chung của mọi service mô phỏng: độ trễ giả lập và kịch bản (bình thường, trống, lỗi, chậm) để kiểm các
// trạng thái giao diện mà không cần backend (normal, empty, error, timeout, slow). Kịch bản chỉ đổi được ở môi trường phát triển, qua `window.__mock`:
//   window.__mock.setScenario('error')   // 'normal' | 'empty' | 'error' | 'slow'
// hoặc đặt ngay từ lúc mở trang bằng địa chỉ, ví dụ /workspace?mock=empty

export type MockScenario = 'normal' | 'empty' | 'error' | 'timeout' | 'slow'

const SLOW_MS = 3000
const DEFAULT_LATENCY_MS = 400

let scenario: MockScenario = 'normal'

export const getMockScenario = () => scenario

export function setMockScenario(next: MockScenario) {
  scenario = next
}

// Để trống hoặc giá trị không hợp lệ (chữ, số âm) thì dùng độ trễ mặc định, không coi chuỗi rỗng là 0.
function latencyMs() {
  const raw = String(import.meta.env.VITE_MOCK_LATENCY_MS ?? '').trim()
  const configured = raw === '' ? Number.NaN : Number(raw)

  return Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_LATENCY_MS
}

/** Độ trễ của MỘT lời gọi theo kịch bản hiện tại (kịch bản `slow` kéo dài tối thiểu 3 giây). */
export function mockTotalDelayMs(ms: number = latencyMs()) {
  return scenario === 'slow' ? Math.max(ms, SLOW_MS) : ms
}

export function mockDelay(ms: number = latencyMs()) {
  const wait = mockTotalDelayMs(ms)

  return new Promise<void>((resolve) => setTimeout(resolve, wait))
}

/** Chờ `ms` mili giây nhưng dừng ngay (ném lỗi hủy giống axios) khi `signal` bị hủy: để thử nút "Hủy" của các thao tác chạy lâu. */
export function mockWait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new CanceledError('canceled'))

      return
    }

    const onAbort = () => {
      clearTimeout(timer)
      reject(new CanceledError('canceled'))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/** Lỗi mất kết nối giống lỗi thật của axios, để `parseApiError` ra đúng câu "kiểm tra mạng". */
export const mockNetworkError = () => new AxiosError('Network Error', 'ERR_NETWORK')

/** Lỗi quá thời gian chờ giống axios (mã ECONNABORTED), để giao diện hiện câu "phản hồi quá chậm". */
export const mockTimeoutError = () => new AxiosError('timeout of 15000ms exceeded', 'ECONNABORTED')

/**
 * Chạy một lời gọi mô phỏng: chờ độ trễ giả lập, ném lỗi mạng nếu kịch bản là `error`, ngược lại gọi `produce` với kịch
 * bản hiện tại (để service tự trả dữ liệu trống khi `empty`).
 */
export async function runMock<T>(produce: (current: MockScenario) => T | Promise<T>): Promise<T> {
  await mockDelay()

  if (scenario === 'error') throw mockNetworkError()
  if (scenario === 'timeout') throw mockTimeoutError()

  return produce(scenario)
}

declare global {
  interface Window {
    __mock?: {
      setScenario: (next: MockScenario) => void
      getScenario: () => MockScenario
      // Giả lập game đang có (hoặc hết) phòng chơi chưa kết thúc: lưu sẽ bị 409.
      lockGame: (gameId: string, locked?: boolean) => void
    }
  }
}

const SCENARIOS: ReadonlyArray<MockScenario> = ['normal', 'empty', 'error', 'timeout', 'slow']

/** Gắn công cụ chỉnh kịch bản vào `window.__mock` và đọc `?mock=` trên địa chỉ (chỉ ở môi trường phát triển). */
export function installMockDevTools() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return

  window.__mock = {
    setScenario: setMockScenario,
    getScenario: getMockScenario,
    lockGame: (gameId, locked = true) => setMockGameLocked(gameId, locked),
  }

  const fromUrl = new URLSearchParams(window.location.search).get('mock')
  const requested = SCENARIOS.find((item) => item === fromUrl)

  if (requested) setMockScenario(requested)
}
