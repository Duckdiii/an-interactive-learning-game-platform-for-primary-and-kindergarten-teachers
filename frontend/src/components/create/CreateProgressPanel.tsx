import { forwardRef, useEffect, useId, useState } from 'react'
import { gameTypeLabel, gradeLevelLabel } from '../../constants/labels'
import { viText } from '../../constants/viText'
import { estimateProgress } from '../../utils/estimatedProgress'
import Button from '../Button'
import LetterTiles from '../ui/LetterTiles'
import MockBadge from '../ui/MockBadge'
import { MIXED_TILES } from '../ui/tileSets'

interface CreateProgressPanelProps {
  idea: string
  gradeLevel: string
  types: ReadonlyArray<string>
  mock: boolean
  onCancel: () => void
}

const text = viText.generator
const TICK_MS = 500
const QUOTE_MAX = 90

// Màn F4 "AI đang soạn": các bước và thanh tiến độ chạy theo thời gian ước tính (xem estimatedProgress), có nút Hủy.
// `forwardRef` để trang đưa tiêu điểm vào đây ngay khi bắt đầu tạo (nút Tạo vừa biến mất).
const CreateProgressPanel = forwardRef<HTMLElement, CreateProgressPanelProps>(function CreateProgressPanel(
  { idea, gradeLevel, types, mock, onCancel },
  ref,
) {
  const titleId = useId()
  const [startedAt] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setElapsed(Date.now() - startedAt), TICK_MS)

    return () => clearInterval(timer)
  }, [startedAt])

  const { percent, step } = estimateProgress(elapsed)
  const quote = idea.length > QUOTE_MAX ? `${idea.slice(0, QUOTE_MAX).trimEnd()}…` : idea
  const title = gradeLevel ? text.progressTitleFor.replace('{grade}', gradeLevelLabel(gradeLevel)) : text.progressTitle
  const tiles = MIXED_TILES.slice(0, 3)

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-10 lg:flex-row lg:gap-16">
      <div aria-hidden="true" className="flex items-end gap-4">
        {tiles.map((tile, index) => (
          <div key={tile.glyph + index} className={index === step % tiles.length ? 'motion-safe:animate-bounce' : ''}>
            <LetterTiles tiles={[tile]} size="xl" />
          </div>
        ))}
      </div>

      <section
        ref={ref}
        tabIndex={-1}
        role="group"
        aria-labelledby={titleId}
        className="w-full max-w-xl space-y-4 rounded-card bg-surface p-6 shadow-card outline-none sm:p-8"
      >
        <div className="flex flex-wrap items-center gap-2">
          <h1 id={titleId} className="font-display text-3xl font-extrabold leading-tight">
            {title}
          </h1>
          {mock ? <MockBadge /> : null}
        </div>
        {quote ? <p className="text-base font-bold text-ink-soft">“{quote}”</p> : null}
        {types.length > 1 ? (
          <p className="text-sm font-semibold text-ink-soft">
            {text.progressTypes.replace('{n}', String(types.length)).replace('{types}', types.map(gameTypeLabel).join(', '))}
          </p>
        ) : null}

        <ol className="space-y-2">
          {text.progressSteps.map((item, index) => {
            const done = index < step
            const doing = index === step

            return (
              <li
                key={item.title}
                aria-current={doing ? 'step' : undefined}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${doing ? 'bg-sun-soft' : ''}`}
              >
                <span
                  aria-hidden="true"
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg font-black ${
                    done ? 'bg-brand text-white' : doing ? 'bg-sun text-sun-ink' : 'bg-paper text-ink-soft'
                  }`}
                >
                  {done ? '✓' : doing ? '…' : index + 1}
                </span>
                <span>
                  <span className="block text-base font-black">
                    {item.title}
                    {done ? <span className="sr-only"> ({text.stepDone})</span> : null}
                  </span>
                  <span className="block text-sm font-semibold text-ink-soft">{item.detail}</span>
                </span>
              </li>
            )
          })}
        </ol>
        {/* Chỉ đọc to khi sang bước mới, không đọc từng % */}
        <p aria-live="polite" className="sr-only">
          {text.progressSteps[step].title}
        </p>

        <div
          role="progressbar"
          aria-label={text.progressLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-3 overflow-hidden rounded-full bg-paper"
        >
          <div className="h-full bg-brand motion-safe:transition-[width] motion-safe:duration-500" style={{ width: `${percent}%` }} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink-soft">{text.progressEstimateNote}</p>
          <Button type="button" variant="secondary" onClick={onCancel}>
            {text.cancelCreate}
          </Button>
        </div>
      </section>
    </div>
  )
})

export default CreateProgressPanel
