import { Link, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import ButtonLink from '../components/ButtonLink'
import LoadingSpinner from '../components/LoadingSpinner'
import Card from '../components/ui/Card'
import ErrorNotice from '../components/ui/ErrorNotice'
import LetterTiles from '../components/ui/LetterTiles'
import MockBadge from '../components/ui/MockBadge'
import SubjectChip from '../components/ui/SubjectChip'
import { MIXED_TILES } from '../components/ui/tileSets'
import { gameTypeLabel, gradeLevelLabel } from '../constants/labels'
import { viText } from '../constants/viText'
import { sortByUpdatedDesc, useGames } from '../hooks/useGames'
import { useGameInsights } from '../hooks/useHomeData'
import { usePageTitle } from '../hooks/usePageTitle'
import { ROUTES } from '../routes/paths'
import type { GameInsights, QuestionInsight } from '../services/home'
import type { GameSummary } from '../types/game-summary.types'
import { parseApiError } from '../utils/apiError'
import {
  filterToSessionType,
  formatDecimalVi,
  isLowRate,
  parseResultsFilter,
  pickReviewQuestion,
  resultsLink,
  toPercent,
} from '../utils/insights'
import type { ResultsFilter } from '../utils/insights'

const text = viText.results

const FILTERS: ReadonlyArray<{ value: ResultsFilter; label: string }> = [
  { value: 'ALL', label: text.filterAll },
  { value: 'TEAM', label: text.filterTeam },
  { value: 'SELF', label: text.filterSelf },
]

// Chưa có `reviewFrom` (API-CONTRACT 2.8) nên chỉ điền tên game của giáo viên, không đưa câu trả lời của học sinh vào.
const reviewLink = (game: GameSummary) =>
  `${ROUTES.createGame}?${new URLSearchParams({
    idea: `${viText.home.reviewIdeaPrefix}${game.title}`,
    grade: game.gradeLevel,
    subject: game.subject,
  }).toString()}`

export default function ResultsPage() {
  usePageTitle(text.title)
  const [params] = useSearchParams()
  const gameId = params.get('gameId')

  return gameId ? <GameResults gameId={gameId} /> : <GamePicker />
}

function Pending() {
  return (
    <div role="status" className="py-6">
      <LoadingSpinner label={text.loadingLabel} />
    </div>
  )
}

function GamePicker() {
  const gamesQuery = useGames()
  const published = sortByUpdatedDesc(gamesQuery.data ?? []).filter((game) => game.status === 'PUBLISHED')

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-3xl font-extrabold">{text.title}</h1>
        <p className="mt-1 text-base font-semibold text-ink-soft">{text.pickerIntro}</p>
      </header>

      {gamesQuery.isPending ? <Pending /> : null}
      {gamesQuery.isError ? <LoadError error={gamesQuery.error} onRetry={() => gamesQuery.refetch()} /> : null}

      {gamesQuery.data && published.length === 0 ? (
        <Card className="flex flex-col items-start gap-3 border-2 border-dashed border-line shadow-none">
          <LetterTiles tiles={MIXED_TILES} size="md" />
          <p className="font-display text-xl font-extrabold">{text.pickerEmptyTitle}</p>
          <p className="text-base text-ink-soft">{text.pickerEmptyDescription}</p>
          <ButtonLink to={ROUTES.workspace}>{text.pickerEmptyAction}</ButtonLink>
        </Card>
      ) : null}

      {published.length > 0 ? (
        <ul aria-label={text.pickerLabel} className="grid gap-3 md:grid-cols-2">
          {published.map((game) => (
            <li key={game.gameId}>
              <Link
                to={resultsLink(game.gameId)}
                className="flex min-h-16 flex-col gap-1 rounded-card border border-line/60 bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <span className="font-display text-lg font-extrabold">{game.title}</span>
                <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink-soft">
                  <SubjectChip subject={game.subject} />
                  {gradeLevelLabel(game.gradeLevel)} · {gameTypeLabel(game.gameType)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <ErrorNotice
      title={text.errorTitle}
      message={parseApiError(error, text.errorFallback).message}
      action={
        <Button variant="secondary" onClick={onRetry}>
          {text.retry}
        </Button>
      }
    />
  )
}

function GameResults({ gameId }: { gameId: string }) {
  const [params, setParams] = useSearchParams()
  const filter = parseResultsFilter(params.get('type'))
  const gamesQuery = useGames()
  const game = gamesQuery.data?.find((item) => item.gameId === gameId)
  const insightsQuery = useGameInsights(game ? gameId : null, filterToSessionType(filter))

  const selectFilter = (value: ResultsFilter) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (value === 'ALL') next.delete('type')
        else next.set('type', value)

        return next
      },
      { replace: true },
    )

  if (gamesQuery.isPending) return <Pending />

  if (gamesQuery.isError) {
    return (
      <div className="space-y-5">
        <h1 className="font-display text-3xl font-extrabold">{text.title}</h1>
        <LoadError error={gamesQuery.error} onRetry={() => gamesQuery.refetch()} />
      </div>
    )
  }

  if (!game) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-extrabold">{text.notFoundTitle}</h1>
        <p className="text-base text-ink-soft">{text.notFoundDescription}</p>
        <ButtonLink to={ROUTES.results}>{text.backToList}</ButtonLink>
      </div>
    )
  }

  const result = insightsQuery.data

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-4">
        <LetterTiles tiles={MIXED_TILES} size="md" className="hidden sm:flex" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-extrabold leading-tight">{game.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Link
              to={ROUTES.results}
              className="inline-flex min-h-11 items-center font-bold text-brand-strong underline underline-offset-4"
            >
              {text.backToList}
            </Link>
            {result?.isSample ? <MockBadge /> : null}
          </div>
        </div>
      </header>

      <div role="group" aria-label={text.filterLabel} className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={filter === item.value}
            onClick={() => selectFilter(item.value)}
            className={[
              'inline-flex min-h-11 items-center rounded-full border-2 px-4 text-base font-bold transition',
              filter === item.value
                ? 'border-brand bg-brand-soft text-brand-strong'
                : 'border-line bg-surface text-ink-soft hover:bg-brand-soft/60',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>

      {insightsQuery.isPending ? <Pending /> : null}
      {insightsQuery.isError ? <LoadError error={insightsQuery.error} onRetry={() => insightsQuery.refetch()} /> : null}

      {result && !result.insights ? (
        <Notice title={text.unsupportedTitle} description={text.unsupportedDescription} />
      ) : null}
      {result?.insights && result.insights.playCount === 0 ? (
        <Notice title={text.noPlaysTitle} description={text.noPlaysDescription} />
      ) : null}
      {result?.insights && result.insights.playCount > 0 ? (
        <Insights insights={result.insights} game={game} />
      ) : null}

      <p className="text-sm font-semibold text-ink-soft">{text.privacy}</p>
    </div>
  )
}

function Notice({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-2 border-dashed border-line shadow-none">
      <p className="font-display text-xl font-extrabold">{title}</p>
      <p className="mt-1 text-base text-ink-soft">{description}</p>
    </Card>
  )
}

function Insights({ insights, game }: { insights: GameInsights; game: GameSummary }) {
  const stats = [
    { value: String(insights.playCount), label: text.statPlays },
    { value: `${toPercent(insights.correctRate)}%`, label: text.statCorrect },
    { value: formatDecimalVi(insights.avgAttemptsPerQuestion), label: text.statAttempts },
  ]

  return (
    <>
      <dl className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} padding="sm" className="flex flex-col-reverse">
            <dt className="text-sm font-bold text-ink-soft">{stat.label}</dt>
            <dd className="font-display text-3xl font-extrabold">{stat.value}</dd>
          </Card>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card as="section" aria-labelledby="results-questions">
          <h2 id="results-questions" className="font-display text-2xl font-extrabold">
            {text.questionsTitle}
          </h2>
          <ol className="mt-3 space-y-2">
            {insights.questions.map((question) => (
              <QuestionRow key={question.questionId} question={question} />
            ))}
          </ol>
        </Card>

        <ReviewCard questions={insights.questions} game={game} />
      </div>
    </>
  )
}

function QuestionRow({ question }: { question: QuestionInsight }) {
  const percent = toPercent(question.correctRate)
  const low = isLowRate(question.correctRate)

  return (
    <li className="min-h-11">
      <span className="sr-only">{text.questionLabel(question.order, question.text, percent)}</span>
      <div aria-hidden="true" className="flex min-h-11 items-center gap-3">
        <span className="w-2/5 min-w-0 break-words text-base font-bold sm:w-1/3">
          {question.order}. {question.text}
        </span>
        <span className="h-3 flex-1 overflow-hidden rounded-full bg-ink/10">
          <span
            className={`block h-full rounded-full ${low ? 'bg-sun' : 'bg-brand'}`}
            style={{ width: `${percent}%` }}
          />
        </span>
        <span className={`w-12 text-right text-base font-extrabold ${low ? 'text-warn-ink' : 'text-brand-strong'}`}>
          {percent}%
        </span>
      </div>
    </li>
  )
}

function ReviewCard({ questions, game }: { questions: ReadonlyArray<QuestionInsight>; game: GameSummary }) {
  const weakest = pickReviewQuestion(questions)
  const wrong = weakest?.commonWrong[0]?.label

  return (
    <Card as="section" aria-labelledby="results-review" className="bg-warn-soft text-warn-ink">
      <h2 id="results-review" className="font-display text-2xl font-extrabold">
        {text.reviewTitle}
      </h2>
      {weakest ? (
        <>
          <p className="mt-2 text-lg font-extrabold">{text.reviewQuestion(weakest.order, weakest.text)}</p>
          <p className="mt-1 text-base font-bold">
            {text.reviewRate(toPercent(weakest.correctRate))}
            {wrong ? ` ${text.reviewCommonWrong(wrong)}` : ''}
          </p>
          <ButtonLink to={reviewLink(game)} variant="accent" className="mt-4">
            {text.reviewCreate}
          </ButtonLink>
          <p className="mt-2 text-sm font-bold">{text.reviewHint}</p>
        </>
      ) : (
        <p className="mt-2 text-base font-bold">{text.reviewGood}</p>
      )}
    </Card>
  )
}
