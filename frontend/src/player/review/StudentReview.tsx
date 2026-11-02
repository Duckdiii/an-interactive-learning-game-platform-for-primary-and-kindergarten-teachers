import { useEffect, useRef, useState } from 'react'
import { viText } from '../../constants/viText'
import PlayButton from '../components/PlayButton'
import { describeAnswerLine, filterReview } from './reviewItems'
import type { ReviewFilter, ReviewItem } from './reviewItems'

const text = viText.player.review

interface StudentReviewProps {
  items: ReviewItem[]
  onBack: () => void
  onReplay: () => void
}

const filterClass = (active: boolean) =>
  [
    'min-h-[var(--play-min-touch)] rounded-xl border-2 px-4 font-bold transition',
    active ? 'border-play-primary bg-play-primary text-play-primary-ink' : 'border-play-outline bg-play-surface text-play-ink',
  ].join(' ')

// Hs-Review: chỉ hiện đáp án đúng (DSL chưa có lời giải thích). Sai dùng viền/nhãn play-accent, không đỏ gắt.
export default function StudentReview({ items, onBack, onReplay }: StudentReviewProps) {
  const [filter, setFilter] = useState<ReviewFilter>('all')
  const wrongCount = filterReview(items, 'wrong').length
  const shown = filterReview(items, filter)
  const titleRef = useRef<HTMLHeadingElement>(null)

  // Nút "Xem lại đáp án" vừa bị gỡ khỏi trang: đưa focus về tiêu đề màn mới.
  useEffect(() => titleRef.current?.focus(), [])

  return (
    <main data-band="hocSinh" className="min-h-screen bg-play-page play-safe-x play-safe-y text-play-ink">
      <section className="mx-auto flex w-full min-w-0 flex-col gap-4 md:max-w-2xl">
        <h1 ref={titleRef} tabIndex={-1} className="text-3xl font-bold outline-none">
          {text.title}
        </h1>
        <div role="group" aria-label={text.filterLabel} className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={filter === 'all'} className={filterClass(filter === 'all')} onClick={() => setFilter('all')}>
            {text.filterAll(items.length)}
          </button>
          <button type="button" aria-pressed={filter === 'wrong'} className={filterClass(filter === 'wrong')} onClick={() => setFilter('wrong')}>
            {text.filterWrong(wrongCount)}
          </button>
        </div>
        {shown.length === 0 ? (
          <p className="rounded-2xl border border-play-outline bg-play-surface p-4 text-center font-bold">{text.noWrong}</p>
        ) : (
          // role="list": Tailwind bỏ list-style nên Safari/VoiceOver không còn coi là danh sách.
          <ol role="list" className="flex flex-col gap-3">
            {shown.map((item) => {
              const line = describeAnswerLine(item)

              return (
                <li
                  key={item.questionId}
                  className={['flex flex-col gap-1 rounded-2xl border-2 bg-play-surface p-4', item.status === 'wrong' ? 'border-play-accent' : 'border-play-outline'].join(' ')}
                >
                  <p className={['text-sm font-bold', item.status === 'wrong' ? 'text-play-accent' : 'text-play-primary'].join(' ')}>
                    {item.status === 'missing' ? text.questionFallback(item.no) : text.cardLabel(item.no, item.status === 'correct')}
                  </p>
                  <p className="text-lg font-bold">{item.prompt}</p>
                  {line ? <p className="text-play-ink-soft">{line}</p> : null}
                </li>
              )
            })}
          </ol>
        )}
        {wrongCount > 0 ? <p className="text-sm text-play-ink-soft">{text.note}</p> : null}
        <div className="flex flex-col gap-2 md:flex-row">
          <PlayButton className="w-full md:w-auto" onClick={onBack}>
            {text.back}
          </PlayButton>
          <PlayButton className="w-full md:w-auto" onClick={onReplay}>
            {viText.player.replay}
          </PlayButton>
        </div>
      </section>
    </main>
  )
}
