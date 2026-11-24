import { useEffect, useMemo, useReducer, useRef } from 'react'
import { viText } from '../../constants/viText'
import type { GameDsl } from '../../types/game-dsl.types'
import { resolveUiProfile } from '../../player/profile/resolveUiProfile'
import { UiProfileProvider } from '../../player/profile/UiProfileContext'
import { summarizeQuestions } from '../../utils/questionSummary'
import Button from '../Button'
import Icon from '../ui/Icon'
import { PLAY_TEST_RENDERERS } from './play/playTestRegistry'
import PlayTestSummary from './PlayTestSummary'
import { createPlayTestState, playTestReducer } from './playTestReducer'
import UnsupportedPlayTest from './UnsupportedPlayTest'
import { usePlayTestNarrationAudio } from './usePlayTestNarrationAudio'
import type { PlayTestQuestionNarration } from './usePlayTestNarrationAudio'

interface PlayTestPanelProps {
  // Bản đang soạn (kể cả phần chưa lưu): chơi thử đúng thứ giáo viên thấy trên màn hình.
  game: GameDsl
  gameId?: string
  questionNarrations?: Readonly<Record<string, PlayTestQuestionNarration>>
  onExit: () => void
}

// PlayTest uses real renderers in `preview` mode. It may fetch narration URLs only; it never creates or stores sessions, answers, scores, or results.
export default function PlayTestPanel({ game, gameId, questionNarrations, onExit }: PlayTestPanelProps) {
  const text = viText.editor.play
  const Player = PLAY_TEST_RENDERERS[game.gameType]
  const total = game.questions.length
  const [state, dispatch] = useReducer(playTestReducer, total, createPlayTestState)
  const summaries = useMemo(() => summarizeQuestions(game), [game])
  const feedbackRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const question = game.questions[state.index]
  const lastResult = state.results[state.index]
  const questionNarration = question ? questionNarrations?.[question.id] : undefined
  const narrationAudio = usePlayTestNarrationAudio({
    enabled: Boolean(Player) && !state.finished,
    gameId,
    questionKey: question ? `${question.id}:${state.attempt}` : 'empty',
    question: question ? { id: question.id, audioText: question.audioText } : undefined,
    narration: questionNarration,
    answered: state.answered,
    isCorrect: state.answered ? lastResult : null,
  })

  // Mở màn chơi thử, sang câu khác hoặc thử lại câu: đưa tiêu điểm về đầu màn (nút vừa bấm đã bị gỡ khỏi trang nên nếu không
  // người dùng bàn phím và trình đọc màn hình sẽ rơi về đầu trang). Không cuộn để câu hỏi giữ nguyên chỗ.
  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true })
  }, [state.index, state.attempt])

  // Trả lời xong thì đưa tiêu điểm tới thanh phản hồi để tới ngay nút "Câu tiếp theo"; chỉ cuộn đủ để thanh hiện ra, không
  // đẩy bàn cờ (đáp án đúng đang được đánh dấu) ra khỏi màn hình hơn mức cần.
  useEffect(() => {
    const bar = feedbackRef.current

    if (!state.answered || !bar) return

    bar.focus({ preventScroll: true })
    bar.scrollIntoView?.({ block: 'nearest' })
  }, [state.answered])

  if (!Player) return <UnsupportedPlayTest game={game} onExit={onExit} />

  if (state.finished) {
    return (
      <PlayTestSummary
        summaries={summaries}
        results={state.results}
        onPlayAgain={() => dispatch({ type: 'restart' })}
        onExit={onExit}
      />
    )
  }

  const isLast = state.index + 1 >= total
  const feedbackAudioStatus = narrationAudio.playbackError
    ?? (state.answered
      ? narrationAudio.feedbackError
        ?? (narrationAudio.feedbackLoading ? 'Đang tải giọng đọc phản hồi…' : undefined)
      : undefined)
  const playQuestionAudio = narrationAudio.questionAudioAvailable
    ? narrationAudio.replayQuestion
    : question?.audioUrl?.trim() ? undefined : () => undefined
  const needsGeneratedNarration = Boolean(question?.audioText?.trim())
    && !question?.audioUrl?.trim()
    && !narrationAudio.questionAudioAvailable

  return (
    <section ref={panelRef} tabIndex={-1} aria-label={text.panelLabel} className="space-y-4 focus:outline-none">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-ink/10 bg-white p-3 sm:p-4">
        <p className="text-lg font-extrabold" aria-live="polite">
          {text.questionProgress} {state.index + 1} {text.of} {total}
        </p>
        <Button type="button" variant="secondary" onClick={onExit}>
          {text.exit}
        </Button>
      </div>

      {/* Dựng lại renderer từ đầu khi sang câu khác hoặc thử lại câu này. */}
      <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white sm:border-2 sm:border-ink/10 sm:p-4">
        <UiProfileProvider profile={resolveUiProfile({ gradeLevel: game.metadata.gradeLevel })}>
          <Player
            key={`${state.index}-${state.attempt}`}
            question={question}
            subject={game.metadata.subject}
            onResult={(isCorrect) => dispatch({ type: 'answered', isCorrect })}
            playQuestionAudio={playQuestionAudio}
          />
        </UiProfileProvider>
      </div>

      {narrationAudio.questionAudioAvailable ? (
        <div className="flex justify-center">
          <Button type="button" variant="secondary" onClick={narrationAudio.replayQuestion}>
            Nghe lại câu hỏi
          </Button>
        </div>
      ) : null}
      {needsGeneratedNarration ? (
        <p role="note" className="text-center text-sm text-ink-soft">
          Chưa có giọng đọc cho câu hỏi này. Hãy tạo giọng đọc trong phần chỉnh sửa để nghe câu hỏi.
        </p>
      ) : null}
      {feedbackAudioStatus ? (
        <p aria-live="polite" className="rounded-xl bg-paper px-4 py-2 text-sm text-ink-soft">
          {feedbackAudioStatus}
        </p>
      ) : null}

      {state.answered ? (
        <div
          ref={feedbackRef}
          tabIndex={-1}
          role="status"
          className={[
            'space-y-3 rounded-2xl border-2 p-4 focus:outline-none',
            lastResult ? 'border-brand/40 bg-brand-soft' : 'border-sun bg-sun-soft',
          ].join(' ')}
        >
          <p className="flex items-start gap-2 text-lg font-bold">
            <Icon name={lastResult ? 'check' : 'info'} className="mt-1 h-5 w-5 shrink-0" />
            <span>{lastResult ? text.correct : text.wrong}</span>
          </p>
          {lastResult !== null ? (
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="secondary" disabled={!narrationAudio.feedbackAvailable}
                onClick={narrationAudio.replayFeedback}>
                Nghe lại phản hồi
              </Button>
              {narrationAudio.feedbackError || narrationAudio.playbackError ? (
                <Button type="button" variant="secondary" onClick={narrationAudio.retryFeedback}>
                  Thử tải lời đọc lại
                </Button>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={() => dispatch({ type: 'next' })}>
              {isLast ? text.showResult : text.nextQuestion}
            </Button>
            <Button type="button" variant="secondary" onClick={() => dispatch({ type: 'retryQuestion' })}>
              {text.retryQuestion}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
