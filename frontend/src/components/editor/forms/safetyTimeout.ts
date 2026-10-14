// Quá thời gian này mà chưa có kết quả kiểm tra từ ngữ thì coi như "chưa kiểm tra được": nếu không, một lần kiểm tra treo sẽ khóa
// nút Lưu và Chơi thử mãi mãi ("Đang áp dụng chỉnh sửa...").
export const SAFETY_CHECK_TIMEOUT_MS = 8000

export class SafetyCheckTimeoutError extends Error {
  constructor() {
    super('Kiểm tra từ ngữ quá thời gian')
    this.name = 'SafetyCheckTimeoutError'
  }
}

/** Trả về kết quả của `task`, hoặc ném `SafetyCheckTimeoutError` nếu quá `ms` mili giây. */
export function withTimeout<T>(task: Promise<T>, ms: number = SAFETY_CHECK_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new SafetyCheckTimeoutError()), ms)

    task.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}
