import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/Button'
import GameCard from '../components/GameCard'
import ErrorNotice from '../components/ui/ErrorNotice'
import Icon from '../components/ui/Icon'
import LetterTiles from '../components/ui/LetterTiles'
import { MIXED_TILES } from '../components/ui/tileSets'
import { gradeLevelLabel, subjectLabel } from '../constants/labels'
import { viText } from '../constants/viText'
import { countGames, sortByUpdatedDesc, useGames } from '../hooks/useGames'
import { useAuth } from '../hooks/useAuth'
import { usePageTitle } from '../hooks/usePageTitle'
import { ROUTES } from '../routes/paths'
import { subjectTheme } from '../components/ui/subjectTheme'
import type { TopicSuggestion } from '../types/game-suggestion.types'
import { parseApiError } from '../utils/apiError'
import { suggestTopics, topicToCreateLink } from '../utils/topicSuggestions'

// Số bản nháp tối đa hiện ở mục "Tiếp tục soạn": đủ để chọn nhanh, không biến Trang chủ thành danh sách dài.
const RECENT_DRAFTS = 3

export default function Dashboard() {
  usePageTitle(viText.home.kicker)
  const { user } = useAuth()
  const gamesQuery = useGames()
  // Thời điểm tải dữ liệu làm mốc "bây giờ" chung cho các thẻ (nhất quán, và tính lại mỗi lần danh sách được làm mới).
  const now = gamesQuery.dataUpdatedAt

  const games = gamesQuery.data ?? []
  const hasData = gamesQuery.data !== undefined
  const topics = useMemo(() => suggestTopics(sortByUpdatedDesc(gamesQuery.data ?? [])), [gamesQuery.data])
  const stats = countGames(games)
  const recentDrafts = sortByUpdatedDesc(games)
    .filter((game) => game.status === 'DRAFT')
    .slice(0, RECENT_DRAFTS)
  const firstName = user?.fullName?.trim().split(/\s+/).pop()

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold sm:text-4xl">
          {viText.home.greeting}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-2 text-lg text-ink-soft">{viText.home.subtitle}</p>
      </header>

      <CreateGameHero />

      {gamesQuery.isPending ? <HomeSkeleton /> : null}

      {gamesQuery.isError ? (
        <ErrorNotice
          title={viText.home.errorTitle}
          message={
            parseApiError(gamesQuery.error, viText.home.errorFallback).message
          }
          action={
            <Button variant="secondary" onClick={() => gamesQuery.refetch()}>
              {viText.home.retry}
            </Button>
          }
        />
      ) : null}

      {hasData && games.length === 0 ? <FirstTimeGuide /> : null}

      {hasData && games.length > 0 ? (
        <>
          <section aria-label={viText.home.statsLabel}>
            <ul className="grid grid-cols-3 gap-3 sm:gap-4">
              <StatLink
                to={ROUTES.workspace}
                value={stats.total}
                label={viText.home.statsTotal}
                tone="bg-white"
              />
              <StatLink
                to={`${ROUTES.workspace}?status=DRAFT`}
                value={stats.draft}
                label={viText.home.statsDraft}
                tone="bg-sun-soft"
              />
              <StatLink
                to={`${ROUTES.workspace}?status=PUBLISHED`}
                value={stats.published}
                label={viText.home.statsPublished}
                tone="bg-brand-soft"
              />
            </ul>
          </section>

          <section aria-labelledby="recent-title" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="recent-title" className="text-2xl font-extrabold">
                  {viText.home.recentTitle}
                </h2>
                <p className="mt-1 text-base text-ink-soft">
                  {viText.home.recentHint}
                </p>
              </div>
              <Link
                to={ROUTES.workspace}
                className="inline-flex min-h-11 items-center gap-1 font-bold text-brand-strong underline underline-offset-4"
              >
                {viText.home.seeAll}
              </Link>
            </div>

            {recentDrafts.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recentDrafts.map((game) => (
                  <GameCard key={game.gameId} game={game} now={now} />
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border-2 border-dashed border-ink/20 bg-white p-6 text-base text-ink-soft">
                {viText.home.recentEmpty}
              </p>
            )}
          </section>
        </>
      ) : null}

      {hasData ? <TopicSuggestions topics={topics} /> : null}
    </div>
  )
}

function TopicSuggestions({ topics }: { topics: ReadonlyArray<TopicSuggestion> }) {
  if (topics.length === 0) return null

  return (
    <section aria-labelledby="topics-title" className="space-y-4">
      <div>
        <h2 id="topics-title" className="text-2xl font-extrabold">
          {viText.home.topicsTitle}
        </h2>
        <p className="mt-1 text-base text-ink-soft">{viText.home.topicsHint}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {topics.map((topic) => (
          <li key={topic.id}>
            <Link
              to={topicToCreateLink(ROUTES.createGame, topic)}
              className="group flex h-full flex-col gap-2 rounded-2xl border-2 border-ink/10 bg-white p-4 transition hover:border-brand hover:bg-brand-soft/40"
            >
              <span className={`self-start rounded-full px-3 py-1 text-sm font-bold ${subjectTheme(topic.subject).chip}`}>
                {subjectLabel(topic.subject)} · {gradeLevelLabel(topic.gradeLevel)}
              </span>
              <span className="text-lg font-bold leading-snug">{topic.title}</span>
              <span className="mt-auto flex items-center gap-2 pt-1 text-base font-bold text-brand-strong">
                <Icon name="sparkles" className="h-4 w-4" />
                {viText.home.topicsAction}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function CreateGameHero() {
  return (
    <section
      aria-labelledby="create-title"
      className="relative overflow-hidden rounded-3xl bg-brand-strong p-6 text-white sm:p-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/5"
      />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="create-title" className="text-2xl font-extrabold sm:text-3xl">
              {viText.home.createTitle}
            </h2>
          </div>
          <p className="mt-3 text-lg leading-8 text-white/90">
            {viText.home.createDescription}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              to={ROUTES.createGame}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sun px-5 text-base font-bold text-ink transition hover:bg-white"
            >
              <Icon name="sparkles" />
              {viText.home.createFromIdea}
            </Link>
            <Link
              to={`${ROUTES.createGame}?random=1`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-white/60 px-5 text-base font-bold text-white transition hover:bg-white/10"
            >
              <Icon name="dice" />
              {viText.home.createRandom}
            </Link>
          </div>
        </div>
        <LetterTiles tiles={MIXED_TILES} size="lg" className="hidden shrink-0 lg:flex" />
      </div>
    </section>
  )
}

function StatLink({
  to,
  value,
  label,
  tone,
}: {
  to: string
  value: number
  label: string
  tone: string
}) {
  return (
    <li>
      <Link
        to={to}
        className={`flex h-full flex-col items-center justify-center rounded-2xl border-2 border-ink/10 px-2 py-4 text-center transition hover:border-brand sm:items-start sm:px-5 sm:text-left ${tone}`}
      >
        <span className="text-3xl font-extrabold sm:text-4xl">{value}</span>
        <span className="mt-1 text-sm font-semibold text-ink-soft sm:text-base">
          {label}
        </span>
      </Link>
    </li>
  )
}

function FirstTimeGuide() {
  return (
    <section
      aria-labelledby="first-title"
      className="rounded-3xl border-2 border-dashed border-ink/20 bg-white p-6 sm:p-8"
    >
      <h2 id="first-title" className="text-2xl font-extrabold">
        {viText.home.firstTitle}
      </h2>
      <p className="mt-2 max-w-2xl text-base leading-7 text-ink-soft">
        {viText.home.firstDescription}
      </p>
      <ol className="mt-5 grid gap-3 sm:grid-cols-3">
        {viText.home.firstSteps.map((step, index) => (
          <li
            key={step}
            className="flex items-start gap-3 rounded-2xl bg-paper p-4 text-base font-medium"
          >
            <span
              aria-hidden="true"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-base font-extrabold text-brand-strong ring-2 ring-brand/30"
            >
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </section>
  )
}

function HomeSkeleton() {
  return (
    <div role="status" aria-label={viText.home.loadingLabel} className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-24 animate-pulse rounded-2xl bg-ink/5 motion-reduce:animate-none" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-56 animate-pulse rounded-2xl bg-ink/5 motion-reduce:animate-none" />
        ))}
      </div>
      <span className="sr-only">{viText.home.loadingLabel}</span>
    </div>
  )
}
