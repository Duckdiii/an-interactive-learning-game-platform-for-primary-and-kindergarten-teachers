import { useCallback, useEffect, useRef, useState } from 'react'
import { isCanceled } from '../../../utils/mediaErrors'
import { usePendingEdits } from './PendingEditsContext'

export type MediaOperationState =
  | { status: 'idle' }
  // `progress` là phần trăm (0 đến 100), hoặc null khi thao tác không biết tiến độ (hiện thanh chạy không xác định).
  | { status: 'working'; progress: number | null }
  | { status: 'error'; message: string }

export interface OperationContext {
  signal: AbortSignal
  onProgress: (percent: number) => void
}

interface RunOptions<T> {
  // Đổi lỗi thành câu hiển thị.
  describeError: (error: unknown) => string
  // Kết quả về nhưng bị bỏ (đã hủy, hoặc màn hình đã đóng): để giải phóng tài nguyên đã tạo (ví dụ đường dẫn `blob:`).
  discard?: (result: T) => void
}

interface HookOptions {
  // Thao tác sẽ ĐỔI game khi xong (tải tệp, tạo giọng đọc) thì khóa Lưu/Chơi thử trong lúc chạy; thao tác chỉ để xem (gợi ý ảnh) thì không.
  lockEditing?: boolean
}

/**
 * Chạy MỘT thao tác bất đồng bộ có thể hủy của form (tải tệp, tạo giọng đọc, tìm ảnh): theo dõi tiến độ/lỗi, cho hủy bằng `cancel()`,
 * tự hủy khi form đóng (đổi câu, rời trang) và, nếu `lockEditing`, báo cho trang biết còn thay đổi chưa vào game (`PendingEditsContext`)
 * để không Lưu hoặc Chơi thử trên bản cũ. Kết quả chỉ được trả về khi thao tác còn hiệu lực; còn lại `run` trả undefined.
 */
export function useMediaOperation({ lockEditing = true }: HookOptions = {}) {
  const { begin } = usePendingEdits()
  const [state, setState] = useState<MediaOperationState>({ status: 'idle' })
  const controllerRef = useRef<AbortController | null>(null)
  const endLockRef = useRef<(() => void) | null>(null)
  const aliveRef = useRef(true)

  const release = useCallback(() => {
    controllerRef.current = null
    endLockRef.current?.()
    endLockRef.current = null
  }, [])

  useEffect(() => {
    aliveRef.current = true

    return () => {
      aliveRef.current = false
      controllerRef.current?.abort()
      release()
    }
  }, [release])

  const run = useCallback(
    async <T>(task: (context: OperationContext) => Promise<T>, { describeError, discard }: RunOptions<T>): Promise<T | undefined> => {
      // Đang có một thao tác thì không chạy thêm (nút đã bị khóa; đây là chốt chặn cho lần bấm đúp).
      if (controllerRef.current) return undefined

      const controller = new AbortController()

      controllerRef.current = controller
      if (lockEditing) endLockRef.current = begin()
      setState({ status: 'working', progress: null })

      try {
        const result = await task({
          signal: controller.signal,
          onProgress: (percent) => {
            if (!controller.signal.aborted) setState({ status: 'working', progress: percent })
          },
        })

        // Đã hủy (hoặc form đã đóng) trong lúc chờ: bỏ kết quả, không áp vào game.
        if (controller.signal.aborted || !aliveRef.current) {
          discard?.(result)

          return undefined
        }

        setState({ status: 'idle' })

        return result
      } catch (error) {
        // Lỗi hủy không do `cancel()` gây ra (ví dụ tầng mạng tự hủy) cũng không phải sự cố: chỉ trở về trạng thái nghỉ, không để thanh tiến trình treo.
        if (aliveRef.current && !controller.signal.aborted) {
          setState(isCanceled(error) ? { status: 'idle' } : { status: 'error', message: describeError(error) })
        }

        return undefined
      } finally {
        if (controllerRef.current === controller) release()
      }
    },
    [begin, lockEditing, release],
  )

  const cancel = useCallback(() => {
    controllerRef.current?.abort()
    // Mở khóa ngay: kết quả của thao tác đã hủy sẽ bị bỏ (xem `run`), nên cho giáo viên Lưu hay thao tác tiếp mà không chờ mạng trả lời hủy.
    release()
    setState({ status: 'idle' })
  }, [release])

  const clearError = useCallback(() => setState((current) => (current.status === 'error' ? { status: 'idle' } : current)), [])

  return { state, run, cancel, clearError, busy: state.status === 'working' }
}
