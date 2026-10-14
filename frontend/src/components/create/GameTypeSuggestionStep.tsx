import { forwardRef } from 'react'
import { gameTypeLabel } from '../../constants/labels'
import { viText } from '../../constants/viText'
import type { GameTypeSuggestion } from '../../types/game-suggestion.types'
import { TOP_FIT_SCORE } from '../../services/gameTypeSuggestionService'
import { MAX_GAMES_PER_REQUEST } from '../../utils/generateRequest'
import Button from '../Button'
import ErrorNotice from '../ui/ErrorNotice'
import MockBadge from '../ui/MockBadge'
import GameTypeCover from '../ui/GameTypeCover'
import Icon from '../ui/Icon'

interface GameTypeSuggestionStepProps {
  status: 'pending' | 'error' | 'success'
  suggestions: ReadonlyArray<GameTypeSuggestion>
  selected: ReadonlyArray<string>
  subject: string
  // Chế độ "Tạo ngẫu nhiên": chưa có chủ đề cụ thể, chỉ có thể nói AI sẽ chọn.
  randomTopic: boolean
  errorMessage?: string
  onToggle: (type: string) => void
  onCreate: () => void
  onBack: () => void
  onRetry: () => void
}

// Bước 2 của luồng tạo game: AI đề xuất 3 đến 5 loại game, giáo viên chọn một hoặc nhiều loại (tối đa 3).
// `forwardRef` để trang đưa tiêu điểm vào tiêu đề bước khi vừa chuyển sang đây.
const GameTypeSuggestionStep = forwardRef<HTMLHeadingElement, GameTypeSuggestionStepProps>(
  function GameTypeSuggestionStep(
    { status, suggestions, selected, subject, randomTopic, errorMessage, onToggle, onCreate, onBack, onRetry },
    headingRef,
  ) {
    const text = viText.generator
    const limitReached = selected.length >= MAX_GAMES_PER_REQUEST

    return (
      <section
        aria-labelledby="suggest-title"
        className="space-y-6 rounded-3xl border-2 border-ink/10 bg-white p-5 sm:p-7"
      >
        <div>
          <h2
            id="suggest-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-extrabold outline-none"
          >
            {text.suggestStepTitle}
          </h2>
          <MockBadge className="mt-2" />
          {randomTopic ? (
            <p className="mt-2 text-base leading-7 text-ink-soft">{text.suggestStepRandom}</p>
          ) : null}
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
          <div className="rounded-2xl border-2 border-dashed border-ink/20 p-6 text-center">
            <p className="text-lg font-bold">{text.suggestEmptyTitle}</p>
            <p className="mx-auto mt-2 max-w-md text-base leading-7 text-ink-soft">{text.suggestEmpty}</p>
          </div>
        ) : null}

        {status === 'success' && suggestions.length > 0 ? (
          <fieldset>
            <legend className="text-base font-semibold text-ink">{text.suggestPick}</legend>
            <p id="suggest-pick-hint" className="mt-1 text-sm text-ink-soft">
              {text.suggestPickHint.replace('{max}', String(MAX_GAMES_PER_REQUEST))}
            </p>
            <ul className="mt-4 grid gap-3">
              {suggestions.map((suggestion, index) => {
                const checked = selected.includes(suggestion.type)
                const blocked = limitReached && !checked

                return (
                  <li key={suggestion.type}>
                    <label className={['block', blocked ? 'cursor-not-allowed' : 'cursor-pointer'].join(' ')}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={blocked}
                        aria-describedby="suggest-pick-hint"
                        onChange={() => onToggle(suggestion.type)}
                        className="peer sr-only"
                      />
                      <span
                        className={[
                          'flex items-stretch gap-4 rounded-2xl border-2 p-3 transition sm:p-4',
                          'peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink',
                          checked
                            ? 'border-brand bg-brand-soft'
                            : blocked
                              ? 'border-ink/10 bg-paper opacity-60'
                              : 'border-ink/15 bg-white hover:border-brand/50',
                        ].join(' ')}
                      >
                        <span className="hidden w-28 shrink-0 overflow-hidden rounded-xl sm:block">
                          <GameTypeCover gameType={suggestion.type} subject={subject} compact />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-extrabold">{gameTypeLabel(suggestion.type)}</span>
                            {index === 0 && suggestion.fitScore >= TOP_FIT_SCORE ? (
                              <span className="rounded-full bg-sun px-2.5 py-0.5 text-sm font-bold text-ink">
                                {text.suggestTopPick}
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-1 block text-base leading-7 text-ink">{suggestion.reason}</span>
                          <span className="mt-1 block text-sm leading-6 text-ink-soft">
                            <span className="font-semibold">{text.suggestHowToPlay}:</span> {suggestion.description}
                          </span>
                        </span>
                        <span
                          aria-hidden="true"
                          className={[
                            'mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2',
                            checked ? 'border-brand bg-brand text-white' : 'border-ink/30 bg-white text-transparent',
                          ].join(' ')}
                        >
                          <Icon name="check" className="h-4 w-4" />
                        </span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
            <p role="status" className="mt-3 text-sm font-medium text-ink-soft">
              {text.suggestSelected} {selected.length}/{MAX_GAMES_PER_REQUEST}
              {limitReached ? `. ${text.suggestLimitReached.replace('{max}', String(MAX_GAMES_PER_REQUEST))}` : ''}
            </p>
          </fieldset>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            className="gap-2"
            disabled={status !== 'success' || selected.length === 0}
            onClick={onCreate}
          >
            <Icon name="sparkles" />
            {selected.length > 0 ? `${text.suggestCreate} ${selected.length} trò chơi` : text.suggestCreateNone}
          </Button>
          <Button type="button" variant="secondary" onClick={onBack}>
            {text.suggestBack}
          </Button>
        </div>
      </section>
    )
  },
)

export default GameTypeSuggestionStep

function SuggestionSkeleton() {
  return (
    <div role="status">
      <ul aria-hidden="true" className="grid gap-3">
        {[1, 2, 3, 4].map((item) => (
          <li
            key={item}
            className="h-28 animate-pulse rounded-2xl bg-ink/5 motion-reduce:animate-none"
          />
        ))}
      </ul>
      <span className="sr-only">{viText.generator.suggestLoading}</span>
    </div>
  )
}
