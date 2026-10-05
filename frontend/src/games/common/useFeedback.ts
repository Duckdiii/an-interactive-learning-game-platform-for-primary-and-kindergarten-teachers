import confetti from 'canvas-confetti'
import { Howl } from 'howler'

const CORRECT_SOUND = '/sounds/correct.wav'
const TRY_AGAIN_SOUND = '/sounds/try-again.wav'

// Mỗi âm chỉ tạo `Howl` một lần rồi phát lại (tạo mới mỗi lần trả lời sẽ để lại một audio node và một
// buffer đã giải mã, bộ nhớ tăng dần trong phiên chơi dài). Tạo lười để import module không sinh `Howl`.
// Hai âm ngắn dùng suốt vòng đời ứng dụng nên không gọi `unload()`.
const sounds = new Map<string, Howl>()

function playSound(src: string) {
  let sound = sounds.get(src)
  if (!sound) {
    sound = new Howl({ src: [src] })
    sounds.set(src, sound)
  }
  sound.play()
}

/**
 * Hook dùng chung cho mọi renderer: phản hồi khi trả lời đúng/sai theo đúng quy ước UX
 * (CLAUDE.md — không dùng màu đỏ gắt/rung mạnh/âm thanh phạt khi sai).
 * `frontend/public/sounds/correct.wav` và `try-again.wav` hiện là âm bíp tạm do code sinh ra
 * (đúng: 3 nốt đi lên; sai: 2 nốt mềm, nhỏ). Có thể thay bằng file thật cùng tên/đuôi bất cứ lúc nào;
 * nếu file thiếu, Howler chỉ im lặng bỏ qua, không làm vỡ giao diện.
 */
export function useFeedback() {
  const showFeedback = (isCorrect: boolean) => {
    if (isCorrect) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
      playSound(CORRECT_SOUND)
    } else {
      playSound(TRY_AGAIN_SOUND)
    }
  }

  return { showFeedback }
}
