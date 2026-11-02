import confetti from 'canvas-confetti'
import { playSound } from './sound'

const CORRECT_SOUND = '/sounds/correct.wav'
const TRY_AGAIN_SOUND = '/sounds/try-again.wav'

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
