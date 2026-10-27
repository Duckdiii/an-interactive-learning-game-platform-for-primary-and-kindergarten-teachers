import { useEffect, useState } from 'react'
import PlayButton from '../components/PlayButton'
import { viText } from '../../constants/viText'
import type { AnswerPayload, AnswerResult, StudentGame } from '../../types/game-student.types'
import type { PlayerApi } from '../api'
import { feedbackRules } from '../policies/feedback'
import { interactionRules } from '../policies/interaction'
import { useUiProfile } from '../profile/useUiProfile'
import type { AnyPlayableRenderer } from '../renderers'
import PlayerShell from '../shells/PlayerShell'
import Mascot from '../theme/Mascot'
import { mascotStateFor } from '../theme/mascotState'
import { useCountdown } from './useCountdown'
import { useHint } from './useHint'

interface QuestionStageProps {
  api: PlayerApi
  sessionId: string
  title: string
  question: StudentGame['questions'][number]
  Renderer: AnyPlayableRenderer
  /** Vị trí câu (tính từ 1) và tổng số câu. */
  progress: { current: number; total: number }
  score: number
  /** Số câu đúng liên tiếp tính cả câu này. */
  streak: number
  /** Kết quả chấm của câu này; null = chưa trả lời. */
  result: AnswerResult | null
  isLast: boolean
  onAnswered: (result: AnswerResult) => void
  onNext: () => void
}

/**
 * Một câu hỏi trong khung: lo đồng hồ, đo thời gian, nộp lên máy chủ, thanh phản hồi theo kết quả chấm và nút sang câu sau. Renderer chỉ vẽ và gọi `onSubmit`.
 * Dùng với `key` theo id câu hỏi để mỗi câu có đồng hồ và trạng thái mới.
 */
export default function QuestionStage({ api, sessionId, title, question, Renderer, progress, score, streak, result, isLast, onAnswered, onNext }: QuestionStageProps) {
  const profile = useUiProfile()
  const [startedAt] = useState(() => Date.now())
  const [submitFailed, setSubmitFailed] = useState(false)
  const interaction = interactionRules(profile)
  const remaining = useCountdown(interaction.countdownSeconds(question.timeLimitSeconds), result === null)
  const showHint = useHint(interaction.hintDelayMs, result === null && !submitFailed)
  const rules = feedbackRules(profile.feedback)

  const submit = async (answer: AnswerPayload): Promise<AnswerResult> => {
    // Nộp lại sau khi đã có kết quả (ví dụ chạm sau khi hết giờ) trả kết quả cũ, như máy chủ.
    if (result) return result

    setSubmitFailed(false)

    try {
      const spent = interaction.timeSpentMs(Date.now() - startedAt, question.timeLimitSeconds)
      const next = await api.submitInteraction(sessionId, question.id, answer, spent)

      onAnswered(next)

      return next
    } catch (error) {
      setSubmitFailed(true)
      throw error // renderer tự mở khóa để trẻ thử lại
    }
  }

  // Hết giờ thì nộp "hết giờ" để máy chủ ghi nhận và trả đáp án đúng.
  useEffect(() => {
    if (remaining === 0 && result === null) void submit({ outcome: 'TIMEOUT' }).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ phản ứng khi đồng hồ về 0
  }, [remaining])

  const feedback = result ? (
    <div className="flex flex-col items-center gap-3">
      <p>{rules.message(result, streak)}</p>
      <PlayButton onClick={onNext}>
        {isLast ? viText.player.seeResult : viText.player.nextQuestion}
      </PlayButton>
    </div>
  ) : submitFailed ? (
    <div className="flex flex-col items-center gap-3">
      <p>{viText.player.submitFailed}</p>
      {remaining === 0 ? (
        <PlayButton onClick={() => void submit({ outcome: 'TIMEOUT' }).catch(() => undefined)}>
          {viText.player.retry}
        </PlayButton>
      ) : null}
    </div>
  ) : showHint ? (
    <p>{viText.player.hint}</p>
  ) : null

  return (
    <PlayerShell title={title} progress={progress} score={rules.showScore ? score : undefined} remainingSeconds={remaining} feedback={feedback}
      mascot={profile.tokens.decoration ? <Mascot state={mascotStateFor(result)} /> : undefined}>
      <Renderer question={question} profile={profile} onSubmit={submit} />
    </PlayerShell>
  )
}
