import { useEffect, useRef, useState } from 'react'
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
import { useAutoReadPrompt } from '../audio/useAutoReadPrompt'
import { useQuestionAudio } from '../../games/common/useQuestionAudio'
import PauseOverlay from './PauseOverlay'
import { useCountdown } from './useCountdown'
import { usePlayerHotkeys } from './usePlayerHotkeys'
import { submitWithRetry } from './submitWithRetry'
import { useHint } from './useHint'
import { ConfettiEffect } from '../../games/common/ConfettiEffect'
import { soundBus } from '../../games/common/sound'

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
  onAnswered: (result: AnswerResult, answer: AnswerPayload) => void
  onNext: () => void
  /** Tự đọc đề bài khi vào câu. */
  autoRead: boolean
  /** Một màn khác đang che câu (nhắc xoay máy): câu vẫn giữ nguyên, đồng hồ dừng, không nhận chạm/phím. */
  covered?: boolean
}

/**
 * Một câu hỏi trong khung: lo đồng hồ, đo thời gian, nộp lên máy chủ, thanh phản hồi theo kết quả chấm và nút sang câu sau. Renderer chỉ vẽ và gọi `onSubmit`.
 * Dùng với `key` theo id câu hỏi để mỗi câu có đồng hồ và trạng thái mới.
 */
export default function QuestionStage({ api, sessionId, title, question, Renderer, progress, score, streak, result, isLast, onAnswered, onNext, autoRead, covered = false }: QuestionStageProps) {
  const profile = useUiProfile()
  useAutoReadPrompt(question.audioUrl, autoRead)
  const [startedAt] = useState(() => Date.now())
  const [submitFailed, setSubmitFailed] = useState(false)
  // Mất mạng, đang tự nối lại: renderer vẫn khóa (lời nộp chưa xong) và đồng hồ dừng.
  const [retrying, setRetrying] = useState(false)
  // Tạm dừng: đồng hồ và gợi ý dừng, lớp phủ che nên renderer không nhận chạm.
  const [paused, setPaused] = useState(false)
  // Màn khác che câu (ví dụ nhắc xoay máy): giữ câu (không mất cặp đã nối, lần nộp đang chờ) nhưng dừng như tạm dừng.
  const halted = paused || covered
  // Thời gian đã dừng không tính vào thời gian làm bài gửi lên máy chủ (điểm theo tốc độ).
  const haltedTotal = useRef(0)
  const haltedSince = useRef<number | null>(null)

  useEffect(() => {
    if (halted) {
      haltedSince.current = Date.now()

      return
    }

    if (haltedSince.current !== null) haltedTotal.current += Date.now() - haltedSince.current
    haltedSince.current = null
  }, [halted])
  const interaction = interactionRules(profile)
  const remaining = useCountdown(interaction.countdownSeconds(question.timeLimitSeconds), result === null && !retrying && !halted)
  const showHint = useHint(interaction.hintDelayMs, result === null && !submitFailed && !halted)
  const rules = feedbackRules(profile.feedback)
  const replayPrompt = useQuestionAudio(question.audioUrl)

  usePlayerHotkeys({
    onEnter: () => {
      if (halted || result === null) return false

      onNext()

      return true
    },
    onReplay: () => {
      if (!halted) replayPrompt()
    },
    onTogglePause: () => {
      if (!covered) setPaused((current) => !current)
    },
  })

  // Lần nộp đang chưa về. Hết giờ đúng lúc đó thì không tự nộp "hết giờ" chen vào; trẻ chạm đáp án khi "hết giờ" đang chờ nối lại
  // thì dùng chung lần nộp đó (không chạy hai vòng nối lại song song làm cờ `retrying` bật/tắt lẫn nhau).
  const inFlight = useRef<Promise<AnswerResult> | null>(null)

  // Rời câu (đổi câu, rời trang) thì dừng chờ nối lại.
  const abort = useRef<AbortController>(null)
  useEffect(() => {
    const controller = new AbortController()

    abort.current = controller

    return () => controller.abort()
  }, [])

  const submit = (answer: AnswerPayload): Promise<AnswerResult> => {
    // Nộp lại sau khi đã có kết quả (ví dụ chạm sau khi hết giờ) trả kết quả cũ, như máy chủ.
    if (result) return Promise.resolve(result)
    if (inFlight.current) return inFlight.current

    const pending = send(answer).finally(() => {
      inFlight.current = null
    })

    inFlight.current = pending

    return pending
  }

  const send = async (answer: AnswerPayload): Promise<AnswerResult> => {
    setSubmitFailed(false)

    try {
      const now = Date.now()
      const halt = haltedTotal.current + (haltedSince.current === null ? 0 : now - haltedSince.current)
      const spent = interaction.timeSpentMs(now - startedAt - halt, question.timeLimitSeconds)
      const next = await submitWithRetry(() => api.submitInteraction(sessionId, question.id, answer, spent), { signal: abort.current?.signal, onRetrying: setRetrying })

      onAnswered(next, answer)

      return next
    } catch (error) {
      if (abort.current?.signal.aborted) throw error

      setSubmitFailed(true)
      throw error // renderer tự mở khóa để trẻ thử lại
    }
  }

  // Hết giờ thì nộp "hết giờ" để máy chủ ghi nhận và trả đáp án đúng.
  useEffect(() => {
    if (remaining === 0 && result === null && inFlight.current === null) void submit({ outcome: 'TIMEOUT' }).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ phản ứng khi đồng hồ về 0
  }, [remaining])

  useEffect(() => {
    if (result?.isCorrect) {
      try {
        soundBus.playCorrect()
      } catch {
        // Suppressed safely
      }
    }
  }, [result])

  const feedback = result ? (
    <div className="flex flex-col items-center gap-3">
      <p>{rules.message(result, streak)}</p>
      <PlayButton onClick={onNext}>
        {isLast ? viText.player.seeResult : viText.player.nextQuestion}
        {/* aria-hidden để tên nút vẫn là "Câu tiếp theo"; chỉ thiết bị có chuột mới hiện. */}
        <span aria-hidden="true" className="ml-2 hidden [@media(hover:hover)_and_(pointer:fine)]:inline">{viText.player.hotkeys.nextSuffix}</span>
      </PlayButton>
    </div>
  ) : retrying ? (
    <p>{rules.retrying}</p>
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
    <>
      <ConfettiEffect active={Boolean(result?.isCorrect)} />
      {/* inert khi bị che: Tab không ra nền, renderer không nhận chạm hay phím. */}
      <div inert={halted}>
      <PlayerShell title={title} progress={progress} score={rules.showScore ? score : undefined} remainingSeconds={remaining} feedback={feedback}
        showHotkeyHint onPause={() => setPaused(true)}
        mascot={profile.tokens.decoration ? <Mascot state={mascotStateFor(result)} /> : undefined}>
        {/* QuestionStage dựng lại theo từng câu (key ở cha) nên hiệu ứng question-in chạy mỗi lần sang câu mới. */}
        <div className="question-in h-full w-full">
          <Renderer question={question} profile={profile} onSubmit={submit} />
        </div>
      </PlayerShell>
      </div>
      {paused ? <PauseOverlay onResume={() => setPaused(false)} /> : null}
    </>
  )
}
