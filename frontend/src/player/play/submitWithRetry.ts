import axios, { CanceledError } from 'axios'

const WAITS_MS = [1000, 2000, 4000, 5000]

interface RetryOptions {
  signal?: AbortSignal
  /** true khi bắt đầu chờ nối lại, false khi nộp xong. */
  onRetrying?: (retrying: boolean) => void
}

// Lỗi mạng = AxiosError không có response. Có response (4xx, 5xx) là máy chủ đã trả lời, thử lại không đổi được.
const isNetworkError = (error: unknown) => axios.isAxiosError(error) && !error.response

// Chờ `ms`, hoặc dừng sớm khi trình duyệt báo `online`; hủy `signal` thì reject. Luôn gỡ timer và listener.
function waitForRetry(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer)
      window.removeEventListener('online', done)
      signal?.removeEventListener('abort', abort)
    }
    const done = () => {
      cleanup()
      resolve()
    }
    const abort = () => {
      cleanup()
      reject(new CanceledError('canceled'))
    }
    const timer = setTimeout(done, ms)

    if (signal?.aborted) return abort()

    window.addEventListener('online', done)
    signal?.addEventListener('abort', abort)
  })
}

/**
 * Nộp `send`; mất mạng thì chờ 1s, 2s, 4s rồi 5s lặp lại (không giới hạn, tiến độ phải được giữ) hoặc thử ngay khi có `online`.
 * Máy chủ chấm idempotent nên nộp lại cùng câu là an toàn. Lỗi có phản hồi của máy chủ ném ngay.
 */
export async function submitWithRetry<T>(send: () => Promise<T>, { signal, onRetrying }: RetryOptions = {}): Promise<T> {
  let attempt = 0

  for (;;) {
    try {
      const result = await send()

      if (attempt > 0) onRetrying?.(false)

      return result
    } catch (error) {
      if (!isNetworkError(error)) {
        if (attempt > 0) onRetrying?.(false)

        throw error
      }
    }

    if (attempt === 0) onRetrying?.(true)

    try {
      await waitForRetry(WAITS_MS[Math.min(attempt, WAITS_MS.length - 1)], signal)
    } catch (error) {
      onRetrying?.(false)

      throw error
    }

    attempt += 1
  }
}
