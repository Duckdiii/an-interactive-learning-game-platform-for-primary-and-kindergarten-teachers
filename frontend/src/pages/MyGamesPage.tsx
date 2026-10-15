import { useEffect, useRef, useState } from 'react'
import { isMock } from '../config/mockMode'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import ButtonLink from '../components/ButtonLink'
import GameCard from '../components/GameCard'
import ErrorNotice from '../components/ui/ErrorNotice'
import Icon from '../components/ui/Icon'
import LetterTiles from '../components/ui/LetterTiles'
import { MIXED_TILES } from '../components/ui/tileSets'
import { inputClass } from '../components/ui/formStyles'
import {
  GRADE_LEVEL_VALUES,
  SUBJECT_VALUES,
  gradeLevelLabel,
  subjectLabel,
} from '../constants/labels'
import { viText } from '../constants/viText'
import { countGames, useGames } from '../hooks/useGames'
import { usePageTitle } from '../hooks/usePageTitle'
import { ROUTES } from '../routes/paths'
import { parseApiError } from '../utils/apiError'
import {
  EMPTY_LIST_FILTERS,
  filterGames,
  hasActiveFilter,
} from '../utils/gameFilters'
import type { GameListFilters } from '../utils/gameFilters'

// Bộ lọc nằm trên địa chỉ (?q=...&status=...): tải lại trang, bấm Quay lại hoặc gửi đường dẫn cho đồng nghiệp
// đều giữ nguyên danh sách đang xem, và các nút thống kê ở Trang chủ dẫn thẳng tới đúng bộ lọc.
const PARAM_KEYS = ['q', 'status', 'subject', 'grade'] as const

function readFilters(params: URLSearchParams): GameListFilters {
  return {
    q: params.get('q') ?? '',
    status: params.get('status') ?? '',
    subject: params.get('subject') ?? '',
    grade: params.get('grade') ?? '',
  }
}

export default function MyGamesPage() {
  usePageTitle(viText.myGames.title)
  const gamesQuery = useGames()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  // "Tạo N trò chơi" xong thì chuyển về đây kèm số game vừa tạo (qua trạng thái điều hướng): hiện thông báo một lần rồi xóa khỏi lịch sử để tải lại trang không hiện lại.
  const [createdCount] = useState(() => {
    const created = (location.state as { created?: unknown } | null)?.created

    return typeof created === 'number' && created > 0 ? created : 0
  })

  const clearedRef = useRef(false)

  useEffect(() => {
    if (createdCount === 0 || clearedRef.current) return

    clearedRef.current = true
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [createdCount, location.pathname, location.search, navigate])
  // Ô tìm kiếm giữ chữ gõ ở state cục bộ (gõ không bị giật/nhảy con trỏ), rồi đồng bộ lên địa chỉ; khi địa chỉ đổi từ
  // ngoài (Quay lại, "Xóa bộ lọc") thì ô tìm kiếm theo địa chỉ.
  const urlQuery = params.get('q') ?? ''
  const [search, setSearch] = useState(urlQuery)
  const [syncedQuery, setSyncedQuery] = useState(urlQuery)

  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery)
    setSearch(urlQuery)
  }

  const filters = { ...readFilters(params), q: search }
  // Thời điểm tải dữ liệu làm mốc "bây giờ": thời gian tương đối được tính lại mỗi lần danh sách được làm mới.
  const now = gamesQuery.dataUpdatedAt
  const games = gamesQuery.data ?? []
  const hasData = gamesQuery.data !== undefined
  const stats = countGames(games)
  const visible = filterGames(games, filters)
  const filtering = hasActiveFilter(filters)

  const update = (patch: Partial<GameListFilters>) => {
    const next = new URLSearchParams(params)

    for (const key of PARAM_KEYS) {
      const value = patch[key] ?? filters[key]
      if (value) next.set(key, value)
      else next.delete(key)
    }

    // replace: gõ tìm kiếm từng chữ không làm đầy lịch sử trình duyệt.
    setParams(next, { replace: true })
  }

  const statusTabs = [
    { value: '', label: viText.myGames.statusAll, count: stats.total },
    { value: 'DRAFT', label: viText.home.statsDraft, count: stats.draft },
    { value: 'PUBLISHED', label: viText.home.statsPublished, count: stats.published },
  ]

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">
            {viText.myGames.title}
          </h1>
          <p className="mt-2 text-base text-ink-soft">
            {viText.myGames.description}
          </p>
        </div>
        <ButtonLink to={ROUTES.createGame} className="gap-2 sm:shrink-0">
          <Icon name="sparkles" />
          {viText.nav.createGame}
        </ButtonLink>
      </header>

      {createdCount > 0 ? (
        <p role="status" className="rounded-2xl border-2 border-brand/30 bg-brand-soft/40 p-4 text-base font-semibold text-ink">
          {viText.generator.createdMany.replace('{n}', String(createdCount))}
          {isMock('ai') ? ` ${viText.generator.createdManyMock}` : ''}
        </p>
      ) : null}

      {gamesQuery.isPending ? <ListSkeleton /> : null}

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

      {hasData && games.length === 0 ? <EmptyLibrary /> : null}

      {hasData && games.length > 0 ? (
        <>
          <fieldset>
            <legend className="sr-only">{viText.myGames.statusTabsLabel}</legend>
            <div className="inline-flex max-w-full overflow-x-auto rounded-xl border-2 border-ink/10 bg-white p-1">
              {statusTabs.map((tab) => (
                <label key={tab.value || 'all'} className="group block shrink-0">
                  <input
                    type="radio"
                    name="status-tab"
                    value={tab.value}
                    checked={filters.status === tab.value}
                    onChange={() => update({ status: tab.value })}
                    className="peer sr-only"
                  />
                  <span className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-4 text-base font-semibold text-ink-soft transition hover:bg-brand-soft peer-checked:bg-brand peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
                    {tab.label}{' '}
                    <span className="rounded-full bg-ink/10 px-2 text-sm font-bold group-has-[:checked]:bg-white/25">
                      {tab.count}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-3 md:grid-cols-[1fr_12rem_12rem]">
            <div className="relative">
              <label htmlFor="game-search" className="sr-only">
                {viText.myGames.searchLabel}
              </label>
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft">
                <Icon name="search" />
              </span>
              <input
                id="game-search"
                type="search"
                value={filters.q}
                onChange={(event) => {
                  setSearch(event.target.value)
                  update({ q: event.target.value })
                }}
                placeholder={viText.myGames.searchPlaceholder}
                autoComplete="off"
                className={`${inputClass()} pl-12`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 md:contents">
            <FilterSelect
              id="filter-subject"
              label={viText.myGames.subjectLabel}
              value={filters.subject}
              values={SUBJECT_VALUES}
              format={subjectLabel}
              onChange={(subject) => update({ subject })}
            />
            <FilterSelect
              id="filter-grade"
              label={viText.myGames.gradeLabel}
              value={filters.grade}
              values={GRADE_LEVEL_VALUES}
              format={gradeLevelLabel}
              onChange={(grade) => update({ grade })}
            />
            </div>
          </div>

          <p role="status" className="text-base text-ink-soft">
            {filtering
              ? `Hiển thị ${visible.length} trên ${games.length} trò chơi`
              : `${games.length} trò chơi`}
          </p>

          {visible.length > 0 ? (
            <section
              aria-label={viText.myGames.resultsLabel}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <h2 className="sr-only">{viText.myGames.resultsLabel}</h2>
              {visible.map((game) => (
                <GameCard key={game.gameId} game={game} now={now} />
              ))}
            </section>
          ) : (
            <section className="rounded-2xl border-2 border-dashed border-ink/20 bg-white p-8 text-center">
              <h2 className="text-xl font-bold">{viText.myGames.noMatchTitle}</h2>
              <p className="mx-auto mt-2 max-w-md text-base leading-7 text-ink-soft">
                {viText.myGames.noMatchDescription}
              </p>
              {filtering ? (
                <Button
                  variant="secondary"
                  className="mt-5"
                  onClick={() => update({ ...EMPTY_LIST_FILTERS })}
                >
                  {viText.myGames.clearFilters}
                </Button>
              ) : null}
            </section>
          )}
        </>
      ) : null}
    </div>
  )
}

function FilterSelect({
  id,
  label,
  value,
  values,
  format,
  onChange,
}: {
  id: string
  label: string
  value: string
  values: ReadonlyArray<string>
  format: (value: string) => string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass()}
      >
        <option value="">
          {label}: {viText.myGames.allOption}
        </option>
        {values.map((option) => (
          <option key={option} value={option}>
            {format(option)}
          </option>
        ))}
      </select>
    </div>
  )
}

function EmptyLibrary() {
  return (
    <section className="rounded-3xl border-2 border-dashed border-ink/20 bg-white p-8 text-center sm:p-12">
      <LetterTiles tiles={MIXED_TILES} className="justify-center" />
      <h2 className="mt-8 text-2xl font-extrabold">{viText.myGames.emptyTitle}</h2>
      <p className="mx-auto mt-2 max-w-md text-base leading-7 text-ink-soft">
        {viText.myGames.emptyDescription}
      </p>
      <ButtonLink to={ROUTES.createGame} className="mt-6">
        {viText.myGames.emptyAction}
      </ButtonLink>
    </section>
  )
}

function ListSkeleton() {
  return (
    <div role="status" aria-label={viText.home.loadingLabel}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-56 animate-pulse rounded-2xl bg-ink/5 motion-reduce:animate-none"
          />
        ))}
      </div>
      <span className="sr-only">{viText.home.loadingLabel}</span>
    </div>
  )
}
