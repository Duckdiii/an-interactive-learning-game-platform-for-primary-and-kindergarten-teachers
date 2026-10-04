import confetti from 'canvas-confetti'
import { Howl } from 'howler'

/**
 * Hook dùng chung cho mọi renderer: phản hồi khi trả lời đúng/sai theo đúng quy ước UX
 * (CLAUDE.md — không dùng màu đỏ gắt/rung mạnh/âm thanh phạt khi sai).
 * File âm thanh `/sounds/correct.mp3`, `/sounds/try-again.mp3` cần được bổ sung vào
 * `frontend/public/sounds/` sau — nếu thiếu, Howler chỉ im lặng bỏ qua, không làm vỡ giao diện.
 */
export function useFeedback() {
  const showFeedback = (isCorrect: boolean) => {
    if (isCorrect) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
      new Howl({ src: ['/sounds/correct.mp3'] }).play()
    } else {
      new Howl({ src: ['/sounds/try-again.mp3'] }).play()
    }
  }

  return { showFeedback }
}
