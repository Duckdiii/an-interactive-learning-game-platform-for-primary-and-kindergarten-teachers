import { useReducer } from 'react'
import type { ComponentProps } from 'react'
import { viText } from '../../constants/viText'
import { gradePreviewAnswer, toPreviewStudentQuestion } from '../../components/editor/preview/previewModel'
import { useQuestionAudio } from '../../games/common/useQuestionAudio'
import type { AnswerPayload, AnswerResult } from '../../types/game-student.types'
import type { GameResponse } from '../../types/game-response.types'
import { feedbackRules } from '../policies/feedback'
import PauseOverlay from '../play/PauseOverlay'
import { useUiProfile } from '../profile/useUiProfile'
import { getPlayableRenderer } from '../renderers'
import type { AnyPlayableRenderer } from '../renderers'
import PresentShell from '../shells/PresentShell'
import Mascot from '../theme/Mascot'
import { mascotStateFor } from '../theme/mascotState'
import { useTheme } from '../theme/useTheme'
import { currentId, initialPresentState, isLastQuestion, presentReducer, recordOf } from './presentReducer'
import { usePresentKeys } from './usePresentKeys'
import FitToHeight from './FitToHeight'
import PresentResult from './PresentResult'
import { barButton, primaryButton, quietButton } from './presentStyles'

const text = viText.present.play

// Kết quả chấm chỉ để chọn câu nói và nhân vật: tivi không có điểm.
const verdict = (isCorrect: boolean): AnswerResult => ({ status: isCorrect ? 'CORRECT' : 'INCORRECT', isCorrect, pointsEarned: 0, totalScore: 0, correctAnswer: null })

// Renderer là hàng tra sẵn trong bảng đăng ký, không phải component tạo lúc render; bọc lại để lint không nhầm.
function PlayableQuestion({ Renderer, ...props }: { Renderer: AnyPlayableRenderer } & ComponentProps<AnyPlayableRenderer>) {
  return <Renderer {...props} />
}

interface PresentPlayProps {
  game: GameResponse
  /** Rời trang trình chiếu, từ nút ở màn kết quả. */
  onLeave: () => void
}

// Tv-Play (SPEC A2): cô điều khiển bằng chuột/bàn phím, chạy và chấm tại chỗ, không lưu gì. Hết câu thì sang Tv-Result.
export default function PresentPlay({ game, onLeave }: PresentPlayProps) {
  const profile = useUiProfile()
  const theme = useTheme()
  const [state, dispatch] = useReducer(presentReducer, game.questions, (questions) => initialPresentState(questions.map((question) => question.id)))
  const question = game.questions[state.index]
  const Renderer = getPlayableRenderer(game.gameType)
  const replay = useQuestionAudio(question?.audioUrl)
  const record = recordOf(state, currentId(state))
  const result = record.answered ? verdict(record.lastCorrect) : null
  const last = isLastQuestion(state)
  const canAct = Renderer !== undefined && !state.paused
  const retryBlocked = !canAct || !record.answered
  // Phím chạy khi không tạm dừng. Space cố ý không làm gì ở pha chơi: tránh bấm nhầm khi đang chỉ bảng.
  const whenPlaying = (action: () => void) => () => {
    if (state.paused) return false
    action()
  }

  usePresentKeys({
    ArrowLeft: whenPlaying(() => dispatch({ type: 'prev' })),
    ArrowRight: whenPlaying(() => dispatch({ type: 'next' })),
    r: whenPlaying(replay),
    Escape: () => {
      if (!state.paused) return false
      dispatch({ type: 'resume' })
    },
  })

  if (state.phase === 'result') {
    return <PresentResult game={game} state={state} supported={Renderer !== undefined} onReplay={() => dispatch({ type: 'restart' })} onLeave={onLeave} />
  }

  const onSubmit = async (answer: AnswerPayload) => {
    const graded = gradePreviewAnswer(game.gameType, question, answer)

    dispatch({ type: 'answered', isCorrect: graded.isCorrect })

    return graded
  }

  const bubble = result
    ? feedbackRules('garden').message(result, 0)
    : state.hint === 1
      ? text.hintByType[game.gameType]
      : state.hint === 2
        ? text.hintReread
        : text.ask

  const controls = (
    <>
      <button type="button" onClick={() => dispatch({ type: 'prev' })} disabled={state.index === 0} className={quietButton}>
        <span aria-hidden="true">← </span>
        {text.prev}
      </button>
      {/* aria-disabled thay vì disabled: nút vẫn nhận tiêu điểm để trình đọc màn hình đọc được lý do. */}
      <button
        type="button"
        onClick={() => {
          if (!retryBlocked) dispatch({ type: 'retry' })
        }}
        aria-disabled={retryBlocked}
        aria-describedby={retryBlocked ? 'present-retry-reason' : undefined}
        title={retryBlocked ? text.retryReason : undefined}
        className={quietButton}
      >
        {text.retry}
      </button>
      <span id="present-retry-reason" hidden>
        {text.retryReason}
      </span>
      <button
        type="button"
        onClick={() => {
          dispatch({ type: 'hint' })
          if (state.hint >= 1) replay()
        }}
        disabled={!canAct || record.answered}
        className={quietButton}
      >
        {text.hint}
      </button>
      <button type="button" onClick={() => dispatch({ type: 'next' })} className={primaryButton}>
        {last ? text.seeResult : text.next}
        {last ? null : <span aria-hidden="true"> →</span>}
      </button>
      <button type="button" aria-label={text.pause} onClick={() => dispatch({ type: 'pause' })} className={quietButton}>
        <span aria-hidden="true">⏸</span>
      </button>
      <button type="button" onClick={() => dispatch({ type: 'end' })} className={quietButton}>
        {viText.present.end}
      </button>
    </>
  )

  return (
    <PresentShell controls={controls} hint={text.keysHint}>
      {/* Chừa đáy cho thanh điều khiển (cao khoảng 5rem) khi nó đang hiện. */}
      <div inert={state.paused} className="flex min-h-0 flex-1 flex-col gap-4 px-10 pb-24 pt-6">
        <div className="flex items-center gap-6">
          <h1 className="text-4xl font-extrabold">{text.progress(state.index + 1, state.ids.length)}</h1>
          <p role="img" aria-label={text.progress(state.index + 1, state.ids.length)} className="flex flex-1 flex-wrap gap-1 text-3xl text-play-accent">
            {state.ids.map((id) => (
              <span key={id} aria-hidden="true">
                {recordOf(state, id).answered || recordOf(state, id).correct ? theme.progress.filled : theme.progress.empty}
              </span>
            ))}
          </p>
          <button type="button" onClick={replay} className={`${barButton} bg-play-surface text-play-ink ring-2 ring-play-outline`}>
            <span aria-hidden="true">🔊 </span>
            {text.replay}
          </button>
        </div>
        <div className="flex min-h-0 flex-1 gap-6">
          {/* inert khi đã có kết quả: bé/cô không bấm tiếp được, muốn chơi lại thì "Cho thử lại". */}
          <div inert={record.answered} className="min-w-0 flex-1 overflow-hidden rounded-3xl bg-play-surface p-4">
            {record.answered && !state.answeredHere ? (
              // Quay lại câu đã trả lời: không dựng lại renderer trống (bé bấm được mà không chấm), chỉ báo và mời "Cho thử lại".
              <div className="grid h-full place-items-center text-center">
                <p className="text-3xl font-extrabold">{text.answeredBefore}</p>
              </div>
            ) : Renderer && question ? (
              <FitToHeight key={`${question.id}-${state.attempt}`}>
                <div className="question-in h-full w-full">
                  <PlayableQuestion Renderer={Renderer} question={toPreviewStudentQuestion(game.gameType, question)} profile={profile} onSubmit={onSubmit} />
                </div>
              </FitToHeight>
            ) : (
              <div className="grid h-full place-items-center text-center">
                <div className="space-y-2">
                  <p className="text-3xl font-extrabold">{text.unsupported}</p>
                  <p className="text-xl">{text.unsupportedSkip}</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex w-64 shrink-0 flex-col items-center justify-end gap-3">
            <p role="status" className="w-full rounded-3xl bg-play-surface p-4 text-center text-2xl font-bold ring-2 ring-play-outline">
              {bubble}
            </p>
            <Mascot state={result ? mascotStateFor(result) : state.hint > 0 ? 'speak' : 'ask'} className="text-7xl" />
          </div>
        </div>
      </div>
      {state.paused ? <PauseOverlay onResume={() => dispatch({ type: 'resume' })} /> : null}
    </PresentShell>
  )
}
