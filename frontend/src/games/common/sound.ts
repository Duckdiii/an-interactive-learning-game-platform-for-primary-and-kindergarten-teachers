import { Howl } from 'howler'
import { soundBus } from '../../services/pipeline/soundBus'

// Mỗi file âm thanh chỉ tạo `Howl` một lần rồi phát lại (tạo mới mỗi lần phát sẽ để lại một audio node và
// một buffer đã giải mã, bộ nhớ tăng dần trong phiên chơi dài). Tạo lười để import module không sinh `Howl`.
// Các âm phản hồi ngắn dùng suốt vòng đời ứng dụng nên không gọi `unload()`.
const sounds = new Map<string, Howl>()

/**
 * Hybrid Cartoon Sound Engine:
 * Kết hợp Web Audio SoundBus (phản hồi tức thì 0ms, không phụ thuộc mạng hay file tải)
 * cùng Howler static audio cache (hỗ trợ file wav/mp3 tĩnh nếu có).
 */
export function playSound(src: string) {
  const norm = src.toLowerCase()

  // 1. Phản hồi âm thanh hoạt hình tức thì qua Web Audio SoundBus
  try {
    if (norm.includes('correct') || norm.includes('win') || norm.includes('complete')) {
      soundBus.playCorrect()
    } else if (norm.includes('pair-matched') || norm.includes('pop') || norm.includes('flip') || norm.includes('click') || norm.includes('select')) {
      soundBus.playPop()
    } else if (norm.includes('wrong') || norm.includes('try-again') || norm.includes('error')) {
      soundBus.playWrong()
    } else if (norm.includes('hit') || norm.includes('drop')) {
      soundBus.playHit()
    } else if (norm.includes('bounce') || norm.includes('spring')) {
      soundBus.playBounce()
    }
  } catch {
    // SoundBus suppressed safely in environments without Web Audio
  }

  // 2. Phát file tĩnh qua Howler (giữ contract tạo lười và cache)
  let sound = sounds.get(src)
  if (!sound) {
    sound = new Howl({ src: [src] })
    sounds.set(src, sound)
  }
  try {
    sound.play()
  } catch {
    // Suppressed safely
  }
}
