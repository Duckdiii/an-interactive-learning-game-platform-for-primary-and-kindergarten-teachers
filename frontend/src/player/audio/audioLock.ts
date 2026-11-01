import { Howler } from 'howler'

// Trình duyệt chặn âm thanh tự phát cho tới khi người dùng chạm. Cờ giả lập (chỉ dev, mở trang với ?audio=blocked) để thử màn "Chạm để bắt đầu".
let simulated = import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).get('audio') === 'blocked'

export const setAudioLockSimulated = (value: boolean) => {
  simulated = value
}

// Howler chỉ tạo AudioContext khi có Howl đầu tiên (sau khi tải câu hỏi, ngoài sự kiện bấm); `Howler.volume()` buộc tạo ngay để kiểm và mở được.
const ensureContext = () => {
  try {
    Howler.volume()
  } catch {
    // Trình duyệt không có Web Audio: Howler dùng HTML5 Audio.
  }
}

export function isAudioLocked(): boolean {
  if (simulated) return true
  if (typeof navigator !== 'undefined' && navigator.userActivation && !navigator.userActivation.hasBeenActive) return true

  ensureContext()

  return Howler.ctx?.state === 'suspended'
}

/** Mở AudioContext, gọi đồng bộ trong sự kiện bấm. Không đụng cờ giả lập. */
export function resumeAudioContext() {
  try {
    ensureContext()
    void Howler.ctx?.resume()?.catch(() => undefined)
  } catch {
    // Không mở được thì thôi: màn "Chạm để bắt đầu" lo phần còn lại.
  }
}

export async function unlockAudio(): Promise<void> {
  simulated = false

  try {
    await Howler.ctx?.resume()
  } catch {
    // Bỏ qua: không có âm thanh vẫn chơi được.
  }
}
