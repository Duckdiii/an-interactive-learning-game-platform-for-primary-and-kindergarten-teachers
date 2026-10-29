import { useEffect, useRef, useState } from 'react'
import { viText } from '../../constants/viText'
import { previewCorrectAnswer, toPreviewStudentQuestion } from '../../components/editor/preview/previewModel'
import type { GameResponse } from '../../types/game-response.types'
import { REVIEW_DESCRIBERS } from '../review/describers'
import PresentShell from '../shells/PresentShell'
import Mascot from '../theme/Mascot'
import { useTheme } from '../theme/useTheme'
import { classSummary, outcomeOf, recordOf } from './presentReducer'
import type { PresentState } from './presentReducer'
import { primaryButton, quietButton } from './presentStyles'
import { usePresentKeys } from './usePresentKeys'

const text = viText.present.play.result

interface PresentResultProps {
  game: GameResponse
  state: PresentState
  /** false: kiểu game chưa trình chiếu được, không có gì để tính hay xem lại. */
  supported: boolean
  onReplay: () => void
  onLeave: () => void
}

// Tv-Result (SPEC A3): kết quả cả lớp, không điểm và không tên từng bé.
export default function PresentResult({ game, state, supported, onReplay, onLeave }: PresentResultProps) {
  const theme = useTheme()
  const [reviewing, setReviewing] = useState(false)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const summary = supported ? classSummary(state) : { total: 0, correct: 0, retried: 0 }
  const outcomes = state.ids.map((id) => outcomeOf(recordOf(state, id)))

  // Đổi giữa kết quả và xem lại: nút vừa bấm biến mất, đưa tiêu điểm về tiêu đề màn mới.
  useEffect(() => titleRef.current?.focus(), [reviewing])

  usePresentKeys({
    Escape: () => {
      if (!reviewing) return false
      setReviewing(false)
    },
  })

  const end = (
    <button type="button" onClick={onLeave} className={quietButton}>
      {text.endSession}
    </button>
  )

  if (reviewing) {
    const describer = REVIEW_DESCRIBERS[game.gameType]

    return (
      <PresentShell
        controls={
          <>
            <button type="button" onClick={() => setReviewing(false)} className={primaryButton}>
              {text.backToResult}
            </button>
            {end}
          </>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-10 pb-24 pt-6">
          <h1 ref={titleRef} tabIndex={-1} className="text-4xl font-extrabold outline-none">
            {text.reviewTitle}
          </h1>
          {/* Nhiều câu thì cuộn bằng chuột/bàn phím; tabIndex để vùng cuộn nhận phím mũi tên. */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
          <ol role="list" tabIndex={0} aria-label={text.reviewTitle} className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-4 overflow-y-auto rounded-3xl p-1 focus-visible:outline-4 focus-visible:outline-play-primary">
            {game.questions.map((question, index) => {
              const student = toPreviewStudentQuestion(game.gameType, question)
              const correct = describer?.correct(student as never, previewCorrectAnswer(game.gameType, question)) ?? null

              return (
                <li key={question.id} className="flex flex-col gap-1 rounded-3xl bg-play-surface p-5 ring-2 ring-play-outline">
                  <p className="text-xl font-extrabold text-play-primary">
                    {viText.player.review.questionFallback(index + 1)} · {text.outcome[outcomes[index]]}
                  </p>
                  <p className="text-2xl font-bold">{describer?.prompt(student as never) ?? ''}</p>
                  {correct ? (
                    <p className="text-xl">
                      {text.correctAnswer}: {correct}
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ol>
        </div>
      </PresentShell>
    )
  }

  return (
    <PresentShell
      controls={
        <>
          <button type="button" onClick={onReplay} className={primaryButton}>
            {text.replay}
          </button>
          {summary.total > 0 ? (
            <button type="button" onClick={() => setReviewing(true)} className={quietButton}>
              {text.review}
            </button>
          ) : null}
          {end}
        </>
      }
      hint={text.noScoreNote}
    >
      <div className="m-auto flex flex-col items-center gap-6 px-16 text-center">
        <h1 ref={titleRef} tabIndex={-1} className="text-7xl font-extrabold outline-none">
          {summary.correct > 0 ? text.title : text.titleNoneCorrect}
        </h1>
        {summary.total > 0 ? (
          <>
            <p className="text-4xl font-bold">{text.summary(summary.correct, summary.total)}</p>
            <p role="img" aria-label={text.stars(summary.correct, summary.total)} className="flex flex-wrap justify-center gap-2 text-6xl text-play-accent">
              {outcomes.map((outcome, index) => (
                <span key={state.ids[index]} aria-hidden="true">
                  {outcome === 'notYet' ? theme.progress.empty : theme.progress.filled}
                </span>
              ))}
            </p>
          </>
        ) : null}
        {summary.retried > 0 ? <p className="text-2xl text-play-ink-soft">{text.retried(summary.retried)}</p> : null}
        <Mascot state="celebrate" className="text-8xl" />
      </div>
    </PresentShell>
  )
}
