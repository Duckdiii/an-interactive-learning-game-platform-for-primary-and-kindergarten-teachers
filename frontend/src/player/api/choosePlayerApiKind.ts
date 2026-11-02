export type PlayerApiKind = 'mock' | 'real'

interface ChooseInput {
  isProd: boolean
  /** Giá trị `VITE_PLAYER_API` đã chuẩn hóa (trim, chữ thường); rỗng nếu không đặt. */
  setting: string | undefined
  /** Nhóm mô phỏng `sessions` của `VITE_USE_MOCK` có đang bật không. */
  sessionsMocked: boolean
}

let warned = false

/** Bản build thật không bao giờ chạy dữ liệu mô phỏng cho học sinh, dù biến môi trường nói gì. */
export function choosePlayerApiKind({ isProd, setting, sessionsMocked }: ChooseInput): PlayerApiKind {
  if (isProd) {
    if ((setting === 'mock' || (setting !== 'real' && sessionsMocked)) && !warned) {
      warned = true
      console.error('[player] Bản build thật bỏ qua VITE_PLAYER_API=mock / VITE_USE_MOCK: luôn dùng API thật.')
    }

    return 'real'
  }

  if (setting === 'mock') return 'mock'
  if (setting === 'real') return 'real'

  return sessionsMocked ? 'mock' : 'real'
}
