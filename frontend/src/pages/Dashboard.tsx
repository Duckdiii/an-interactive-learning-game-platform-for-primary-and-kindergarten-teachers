import { useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import ButtonLink from '../components/ButtonLink'
import Card from '../components/ui/Card'
import ErrorNotice from '../components/ui/ErrorNotice'
import LetterTiles from '../components/ui/LetterTiles'
import MockBadge from '../components/ui/MockBadge'
import { subjectTheme } from '../components/ui/subjectTheme'
import { MIXED_TILES } from '../components/ui/tileSets'
import { gameTypeLabel, gradeLevelLabel, subjectLabel } from '../constants/labels'
import { viText } from '../constants/viText'
import { sortByUpdatedDesc, useGames } from '../hooks/useGames'
import { useAuth } from '../hooks/useAuth'
import { useLiveSessions, useReviewNeeded } from '../hooks/useHomeData'
import { usePageTitle } from '../hooks/usePageTitle'
import { ROUTES } from '../routes/paths'
import type { LiveSession, ReviewNeeded } from '../services/home'
import type { GameSummary } from '../types/game-summary.types'
import { parseApiError } from '../utils/apiError'
import { IDEA_MAX_LENGTH } from '../utils/generateRequest'
import { resultsLink } from '../utils/insights'
import { suggestTopics, topicToCreateLink } from '../utils/topicSuggestions'

// Số bản nháp tối đa hiện ở mục "Soạn dở": đủ để chọn nhanh, không biến Trang chủ thành danh sách dài.
const RECENT_DRAFTS = 3

const createLink = (idea: string) => `${ROUTES.createGame}?${new URLSearchParams({ idea }).toString()}`

export default function Dashboard() {
  usePageTitle(viText.home.kicker)
  const { user } = useAuth()
  const gamesQuery = useGames()

  const topics = useMemo(() => suggestTopics(sortByUpdatedDesc(gamesQuery.data ?? [])), [gamesQuery.data])
  const drafts = sortByUpdatedDesc(gamesQuery.data ?? [])
    .filter((game) => game.status === 'DRAFT')
    .slice(0, RECENT_DRAFTS)
  const firstName = user?.fullName?.trim().split(/\s+/).pop()

  return (
    <div className="space-y-6">
      <Hero firstName={firstName} topics={topics} />

      <div className="grid gap-6 lg:grid-cols-2">
        <LiveSessionsSection />
        <ReviewSection />
      </div>

      <section aria-labelledby="drafts-title" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="drafts-title" className="font-display text-2xl font-extrabold">
            {viText.home.draftsTitle}
          </h2>
          <Link
            to={ROUTES.workspace}
            className="inline-flex min-h-11 items-center font-bold text-brand-strong underline underline-offset-4"
          >
            {viText.home.seeAll}
          </Link>
        </div>

        {gamesQuery.isPending ? <HomeSkeleton /> : null}

        {gamesQuery.isError ? (
          <ErrorNotice
            title={viText.home.errorTitle}
            message={parseApiError(gamesQuery.error, viText.home.errorFallback).message}
            action={
              <Button variant="secondary" onClick={() => gamesQuery.refetch()}>
                {viText.home.retry}
              </Button>
            }
          />
        ) : null}

        {gamesQuery.data && drafts.length === 0 ? (
          <p className="rounded-card border-2 border-dashed border-line bg-surface p-5 text-base text-ink-soft">
            {viText.home.draftsEmpty}
          </p>
        ) : null}

        {drafts.length > 0 ? (
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {drafts.map((game) => (
              <DraftItem key={game.gameId} game={game} />
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  )
}

function Hero({
  firstName,
  topics,
}: {
  firstName: string | undefined
  topics: ReturnType<typeof suggestTopics>
}) {
  const navigate = useNavigate()
  const [idea, setIdea] = useState('')

  // Ô trống vẫn sang trang tạo (không chặn): ở đó cô có thể chọn gợi ý hoặc tạo ngẫu nhiên.
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const text = idea.trim()
    navigate(text ? createLink(text) : ROUTES.createGame)
  }

  return (
    <section
      aria-labelledby="home-title"
      className="relative overflow-hidden rounded-card-lg bg-brand-strong p-6 text-white shadow-card sm:p-8"
    >
      <LetterTiles
        tiles={MIXED_TILES}
        size="md"
        className="pointer-events-none absolute right-8 top-6 hidden lg:flex"
      />
      <h1 id="home-title" className="font-display text-3xl font-extrabold leading-tight sm:text-4xl lg:pr-72">
        {viText.home.greeting}
        {firstName ? ` ${firstName}` : ''}, {viText.home.greetingQuestion}
      </h1>
      <p className="mb-5 mt-2 text-base font-semibold text-white/85 sm:text-lg">{viText.home.subtitle}</p>

      <form onSubmit={handleSubmit} className="flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-stretch">
        <label className="flex-1">
          <span className="sr-only">{viText.home.ideaLabel}</span>
          <textarea
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            maxLength={IDEA_MAX_LENGTH}
            rows={2}
            placeholder={viText.home.ideaPlaceholder}
            className="min-h-14 w-full resize-none rounded-2xl bg-surface px-4 py-3 text-base font-semibold text-ink placeholder:text-ink-soft"
          />
        </label>
        <Button type="submit" variant="accent" size="lg" className="sm:self-start">
          {viText.home.createAction}
        </Button>
      </form>

      <ul aria-label={viText.home.topicsLabel} className="mt-4 flex flex-wrap gap-2">
        {topics.map((topic) => (
          <li key={topic.id}>
            <Link
              to={topicToCreateLink(ROUTES.createGame, topic)}
              className="inline-flex min-h-11 items-center rounded-full bg-white/15 px-4 text-sm font-extrabold transition hover:bg-white/25"
            >
              {subjectLabel(topic.subject)} · {gradeLevelLabel(topic.gradeLevel)} · {topic.title}
            </Link>
          </li>
        ))}
        <li>
          <Link
            to={`${ROUTES.createGame}?random=1`}
            className="inline-flex min-h-11 items-center rounded-full border-2 border-white/50 px-4 text-sm font-extrabold transition hover:bg-white/15"
          >
            {viText.home.createRandom}
          </Link>
        </li>
      </ul>
    </section>
  )
}

function SectionCard({
  id,
  title,
  isSample,
  children,
}: {
  id: string
  title: string
  isSample?: boolean
  children: ReactNode
}) {
  return (
    <Card as="section" aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={id} className="font-display text-2xl font-extrabold">
          {title}
        </h2>
        {isSample ? <MockBadge /> : null}
      </div>
      {children}
    </Card>
  )
}

function SectionPending() {
  return <div aria-hidden="true" className="h-16 animate-pulse rounded-2xl bg-ink/5 motion-reduce:animate-none" />
}

function SectionError() {
  return <ErrorNotice message={viText.home.sectionError} />
}

function liveDetail(session: LiveSession) {
  const parts = [viText.home.liveStatus[session.status], `${session.participantCount} ${viText.home.liveKids}`]
  if (session.currentQuestionIndex !== null) {
    const current = session.currentQuestionIndex + 1
    const total = session.questionCount
    parts.push(`${viText.home.liveQuestion} ${total ? `${current}/${total}` : current}`)
  }

  return parts.join(' · ')
}

function LiveSessionsSection() {
  const query = useLiveSessions()
  const sessions = query.data?.items ?? []

  return (
    <SectionCard id="live-title" title={viText.home.liveTitle} isSample={query.data?.isSample}>
      {query.isPending ? <SectionPending /> : null}
      {query.isError ? <SectionError /> : null}
      {sessions.map((session) => (
        <div key={session.sessionId} className="flex flex-wrap items-center gap-3 rounded-2xl bg-sun-soft p-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-extrabold">{session.gameTitle}</p>
            <p className="text-sm font-bold text-warn-ink">{liveDetail(session)}</p>
          </div>
          {/* Chưa có màn phòng (P4/P5): nút khóa kèm chú thích thay vì dẫn tới trang chưa tồn tại. */}
          <div className="flex flex-col items-center gap-1">
            <Button disabled aria-label={`${viText.home.liveEnter}: ${session.gameTitle}`} aria-describedby={`live-soon-${session.sessionId}`}>
              {viText.home.liveEnter}
            </Button>
            <span id={`live-soon-${session.sessionId}`} className="text-xs font-semibold text-ink-soft">
              {viText.home.liveSoon}
            </span>
          </div>
        </div>
      ))}
      {query.data && sessions.length === 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-dashed border-line p-3">
          <p className="flex-1 text-base font-bold text-ink-soft">{viText.home.liveEmpty}</p>
          <ButtonLink to={ROUTES.workspace} variant="secondary">
            {viText.home.liveShowGame}
          </ButtonLink>
        </div>
      ) : null}
    </SectionCard>
  )
}

function ReviewItem({ item }: { item: ReviewNeeded }) {
  const wrong = item.commonWrong?.label

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-2xl bg-warn-soft p-3 text-warn-ink">
      <div className="min-w-0 flex-1">
        <p className="font-extrabold">{viText.home.reviewQuestion(item.questionText, item.gameTitle)}</p>
        <p className="text-sm font-bold">
          {viText.home.reviewRate(Math.round(item.correctRate * 100))}
          {wrong ? ` · ${viText.home.reviewCommonWrong(wrong)}` : ''}
        </p>
      </div>
      {/* Chỉ đưa tên game của giáo viên vào `idea`, không đưa câu trả lời của học sinh (xem API-CONTRACT 2.8). */}
      <ButtonLink to={createLink(`${viText.home.reviewIdeaPrefix}${item.gameTitle}`)} variant="accent">
        {viText.home.reviewCreate}
      </ButtonLink>
      <Link
        to={resultsLink(item.gameId)}
        aria-label={`${viText.home.reviewSeeResults}: ${item.gameTitle}`}
        className="inline-flex min-h-11 items-center font-bold underline underline-offset-4"
      >
        {viText.home.reviewSeeResults}
      </Link>
    </li>
  )
}

function ReviewSection() {
  const query = useReviewNeeded()
  const items = query.data?.items ?? []

  return (
    <SectionCard id="review-title" title={viText.home.reviewTitle} isSample={query.data?.isSample}>
      {query.isPending ? <SectionPending /> : null}
      {query.isError ? <SectionError /> : null}
      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((item) => (
            <ReviewItem key={item.questionId} item={item} />
          ))}
        </ul>
      ) : null}
      {query.data && items.length === 0 ? (
        <p className="text-base font-bold text-ink-soft">{viText.home.reviewEmpty}</p>
      ) : null}
      <p className="text-sm font-bold text-ink-soft">{viText.home.reviewNote}</p>
    </SectionCard>
  )
}

function DraftItem({ game }: { game: GameSummary }) {
  const theme = subjectTheme(game.subject)

  return (
    <li>
      <Link
        to={`${ROUTES.workspaceEditor}?gameId=${encodeURIComponent(game.gameId)}`}
        className="flex items-center gap-3 rounded-card border border-line/60 bg-surface p-3 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <span aria-hidden="true" className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl ${theme.cover}`}>
          <span
            className={`grid h-10 w-10 -rotate-6 place-items-center rounded-xl border-2 border-b-4 bg-surface font-display text-2xl font-extrabold ${theme.chipBorder} ${theme.mark}`}
          >
            {theme.tiles[0]}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-lg font-extrabold">{game.title}</span>
          <span className="block truncate text-sm font-bold text-ink-soft">
            {subjectLabel(game.subject)} · {gradeLevelLabel(game.gradeLevel)} · {gameTypeLabel(game.gameType)}
          </span>
        </span>
      </Link>
    </li>
  )
}

function HomeSkeleton() {
  return (
    <div role="status" aria-label={viText.home.loadingLabel} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-20 animate-pulse rounded-card bg-ink/5 motion-reduce:animate-none" />
      ))}
      <span className="sr-only">{viText.home.loadingLabel}</span>
    </div>
  )
}
