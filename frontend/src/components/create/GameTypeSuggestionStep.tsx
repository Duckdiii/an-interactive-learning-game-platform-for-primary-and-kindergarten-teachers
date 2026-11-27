import { useState } from 'react'
import { gameTypeLabel } from '../../constants/labels'
import { viText } from '../../constants/viText'
import type { GameTypeSuggestion } from '../../types/game-suggestion.types'
import { TOP_FIT_SCORE } from '../../services/gameTypeSuggestionService'
import Button from '../Button'
import ErrorNotice from '../ui/ErrorNotice'
import GameTypeCover from '../ui/GameTypeCover'
import MockBadge from '../ui/MockBadge'

interface GameTypeSuggestionStepProps {
  status: 'pending' | 'error' | 'success'
  suggestions: ReadonlyArray<GameTypeSuggestion>
  subject: string
  // Dòng tóm tắt bài dưới tiêu đề: "Toán · Mầm non · mô tả" hoặc câu của chế độ ngẫu nhiên.
  context: string
  errorMessage?: string
  // Chọn một kiểu là bắt đầu soạn ngay (phương án rẻ của F5: đề xuất trước, soạn sau).
  onUse: (type: string) => void
  onBack: () => void
  onRetry: () => void
}

const text = viText.generator
// Mỗi lần hiện 3 thẻ như wireframe; còn đề xuất thì "Đề xuất kiểu khác" lật sang 3 thẻ tiếp theo (không gọi lại AI).
const PAGE_SIZE = 3

// Màn F5: AI đề xuất kiểu chơi kèm lý do, thẻ đầu (điểm đủ cao) là "Phù hợp nhất". Tiêu đề bước nằm ở trang (h1).
export default function GameTypeSuggestionStep({
  status,
  suggestions,
  subject,
  context,
  errorMessage,
  onUse,
  onBack,
  onRetry,
}: GameTypeSuggestionStepProps) {
  const [page, setPage] = useState(0)
  const pageCount = Math.ceil(suggestions.length / PAGE_SIZE)
  const shown = suggestions.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  return (
    <section aria-label={text.suggestPick} className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-base font-bold text-ink-soft">{context}</p>
        <MockBadge />
      </div>

      {status === 'pending' ? <SuggestionSkeleton /> : null}

      {status === 'error' ? (
        <ErrorNotice
          title={text.suggestErrorTitle}
          message={errorMessage || text.suggestErrorFallback}
          action={
            <Button variant="secondary" onClick={onRetry}>
              {text.suggestRetry}
            </Button>
          }
        />
      ) : null}

      {status === 'success' && suggestions.length === 0 ? (
        <div className="rounded-card border-2 border-dashed border-line bg-surface p-6 text-center">
          <p className="text-lg font-bold">{text.suggestEmptyTitle}</p>
          <p className="mx-auto mt-2 max-w-md text-base leading-7 text-ink-soft">{text.suggestEmpty}</p>
        </div>
      ) : null}

      {shown.length > 0 ? (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((suggestion) => {
            const best = suggestion === suggestions[0] && suggestion.fitScore >= TOP_FIT_SCORE
            const label = suggestion.title || gameTypeLabel(suggestion.type)

            return (
              <li
                key={suggestion.type}
                className={`flex flex-col overflow-hidden rounded-card bg-surface shadow-card ${best ? 'ring-4 ring-brand' : ''}`}
              >
                <div className="relative h-44">
                  <GameTypeCover gameType={suggestion.type} subject={subject} />
                  <span
                    className={`absolute left-3 top-3 rounded-xl px-2.5 py-1 text-sm font-black ${
                      best ? 'bg-sun text-sun-ink' : 'bg-surface text-ink'
                    }`}
                  >
                    {best ? text.suggestTopPick : text.suggestOther}
                  </span>
                  {suggestion.track === 'CPF' && (
                    <span className="absolute right-3 top-3 rounded-xl bg-purple-600 px-2.5 py-1 text-xs font-black text-white shadow-xs">
                      🎮 Tương tác Vận động
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-2xl font-extrabold">{label}</h2>
                    {suggestion.track === 'CPF' && (
                      <span className="rounded-lg bg-purple-100 px-2.5 py-0.5 text-xs font-black text-purple-700 border border-purple-200">
                        Phản xạ & Vận động
                      </span>
                    )}
                  </div>
                  <p className="text-base font-semibold leading-7 text-ink">{suggestion.reason}</p>
                  <p className="self-start rounded-xl bg-paper px-3 py-1.5 text-sm font-bold text-ink-soft">
                    {text.suggestHowToPlay}: {suggestion.description}
                  </p>
                  <Button
                    type="button"
                    variant={best ? 'primary' : 'secondary'}
                    fullWidth
                    className="mt-auto"
                    aria-label={`${text.suggestUse}: ${label}`}
                    onClick={() => onUse(suggestion.type)}
                  >
                    {text.suggestUse}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-base font-bold text-ink-soft">
        {status === 'success' && suggestions.length > 0 ? <span>{text.suggestNotHappy}</span> : null}
        {pageCount > 1 ? (
          <Button type="button" variant="secondary" onClick={() => setPage((page + 1) % pageCount)}>
            {text.suggestMore}
          </Button>
        ) : null}
        <Button type="button" variant="secondary" onClick={onBack}>
          {text.suggestBack}
        </Button>
      </div>
    </section>
  )
}

function SuggestionSkeleton() {
  return (
    <div role="status">
      <ul aria-hidden="true" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <li key={item} className="h-96 animate-pulse rounded-card bg-ink/5 motion-reduce:animate-none" />
        ))}
      </ul>
      <span className="sr-only">{viText.generator.suggestLoading}</span>
    </div>
  )
}
