import { useEffect, useRef } from 'react'
import { viText } from '../../constants/viText'
import Button from '../Button'
import Icon from '../ui/Icon'

interface PlayTestSummaryProps {
  // Một dòng tóm tắt cho mỗi câu, cùng thứ tự với `results`.
  summaries: ReadonlyArray<string>
  results: ReadonlyArray<boolean | null>
  onPlayAgain: () => void
  onExit: () => void
}

// Màn tổng kết (UC-03 bước 8): điểm mô phỏng và ghi rõ KHÔNG lưu vào báo cáo học sinh. Từng câu có biểu tượng kèm chữ
// "Đúng"/"Chưa đúng" (không chỉ dựa vào màu).
export default function PlayTestSummary({ summaries, results, onPlayAgain, onExit }: PlayTestSummaryProps) {
  const text = viText.editor.play
  const headingRef = useRef<HTMLHeadingElement>(null)
  const correct = results.filter((result) => result === true).length

  useEffect(() => headingRef.current?.focus(), [])

  return (
    <section aria-labelledby="play-summary-title" className="space-y-5 rounded-2xl border-2 border-ink/10 bg-white p-4 sm:p-6">
      <h2 id="play-summary-title" ref={headingRef} tabIndex={-1} className="text-2xl font-extrabold focus:outline-none">
        {text.summaryTitle}
      </h2>
      <p className="text-3xl font-extrabold text-brand-strong" aria-live="polite">
        {text.scoreCorrect} {correct}/{results.length} {text.scoreUnit}
      </p>
      <p className="flex items-start gap-2 rounded-xl bg-sun-soft px-4 py-3 text-base">
        <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0" />
        <span>{text.simulatedNote}</span>
      </p>

      <ol className="space-y-2">
        {summaries.map((summary, index) => {
          const ok = results[index] === true

          return (
            <li key={index} className="flex items-start gap-3 rounded-xl border-2 border-ink/10 px-3 py-2">
              <span
                className={[
                  'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full',
                  ok ? 'bg-brand-soft text-brand-strong' : 'bg-sun-soft text-ink',
                ].join(' ')}
              >
                <Icon name={ok ? 'check' : 'info'} className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ink-soft">
                  {viText.editor.questionLabel} {index + 1} · {ok ? text.resultCorrect : text.resultWrong}
                </span>
                <span className="block text-base">{summary}</span>
              </span>
            </li>
          )
        })}
      </ol>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" onClick={onExit}>
          {text.backToEdit}
        </Button>
        <Button type="button" variant="secondary" onClick={onPlayAgain}>
          {text.playAgain}
        </Button>
      </div>
    </section>
  )
}
