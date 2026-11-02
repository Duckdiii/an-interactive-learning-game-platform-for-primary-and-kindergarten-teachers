import { viText } from '../../constants/viText'
import type { AnswerResult } from '../../types/game-student.types'
import type { FeedbackPolicy } from '../profile/types'

interface FeedbackRules {
  /** Câu hiện trên thanh phản hồi sau khi máy chủ chấm. `streak`: số câu đúng liên tiếp tính cả câu này (0 nếu câu này không đúng). */
  message(result: AnswerResult, streak: number): string
  /** Câu hiện khi mất mạng và đang tự nối lại. */
  retrying: string
  /** Khung có hiện điểm không. */
  showScore: boolean
}

const text = viText.player

/** Từ bao nhiêu câu đúng liên tiếp thì nhắc chuỗi (khung có điểm). */
const STREAK_MIN = 2

// Tra theo chính sách của profile, không theo tuổi. `garden`: không điểm, không chữ "sai"; `score`: điểm và chuỗi đúng.
const POLICIES: Readonly<Record<FeedbackPolicy, FeedbackRules>> = {
  garden: {
    showScore: false,
    retrying: text.retryingGarden,
    message: ({ status }) =>
      status === 'CORRECT' ? text.feedbackGardenCorrect : status === 'INCORRECT' ? text.feedbackGardenWrong : text.feedbackGardenSkipped,
  },
  score: {
    showScore: true,
    retrying: text.retryingScore,
    message: ({ status, pointsEarned }, streak) =>
      status === 'CORRECT' ? text.feedbackScoreCorrect(pointsEarned) + (streak >= STREAK_MIN ? text.feedbackStreak(streak) : '') : status === 'INCORRECT' ? text.feedbackScoreWrong : text.feedbackScoreTimeout,
  },
}

export const feedbackRules = (policy: FeedbackPolicy) => POLICIES[policy]
