/**
 * Lựa chọn âm thanh của trẻ/người làm bài, nhớ trong PHIÊN (sessionStorage): không giữ sang lần mở sau. Mọi truy cập bọc try/catch vì sessionStorage có thể
 * ném lỗi (cửa sổ riêng tư, chặn dữ liệu trang) hoặc không có; lúc đó dùng giá trị mặc định và game vẫn chạy bình thường.
 */
export const SOUND_PREF_KEYS = { muted: 'bee-garden-sound-muted', ambience: 'bee-garden-ambience' } as const

export function readBoolPref(key: string, fallback: boolean, storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): boolean {
  try {
    const value = storage?.getItem(key)
    return value === '1' ? true : value === '0' ? false : fallback
  } catch {
    return fallback
  }
}

export function writeBoolPref(key: string, value: boolean, storage: Pick<Storage, 'setItem'> | undefined = safeStorage()): void {
  try {
    storage?.setItem(key, value ? '1' : '0')
  } catch {
    // không lưu được thì thôi: lựa chọn chỉ còn hiệu lực trong lúc đang mở trang
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.sessionStorage
  } catch {
    return undefined
  }
}
