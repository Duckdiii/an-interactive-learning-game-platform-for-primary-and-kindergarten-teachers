import { useEffect, useRef, useState } from 'react'
import { isMock } from '../config/mockMode'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import ButtonLink from '../components/ButtonLink'
import GameCard from '../components/GameCard'
import ErrorNotice from '../components/ui/ErrorNotice'
import Icon from '../components/ui/Icon'
import SubjectChip from '../components/ui/SubjectChip'
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
  countBySubject,
  filterGames,
  hasActiveFilter,
} from '../utils/gameFilters'
import type { GameListFilters } from '../utils/gameFilters'

// Bộ lọc nằm trên địa chỉ (?q=...&status=...): tải lại trang, bấm Quay lại hoặc gửi đường dẫn cho đồng nghiệp
// đều giữ nguyên danh sách đang xem, và các nút thống kê ở Trang chủ dẫn thẳng tới đúng bộ lọc.
const PARAM_KEYS = ['q', 'status', 'subject', 'grade'] as const

// Chip trạng thái bật/tắt (loại trừ nhau); wireframe chỉ có "Bản nháp", thêm "Đã đăng" để ?status=PUBLISHED luôn có chip tương ứng.
const STATUS_CHIPS = [
  { status: 'DRAFT', label: viText.myGames.draftChip },
  { status: 'PUBLISHED', label: viText.myGames.publishedChip },
] as const

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
  const games = gamesQuery.data ?? []
  const hasData = gamesQuery.data !== undefined
  const stats = countGames(games)
  const subjectCounts = countBySubject(games)
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

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">{viText.myGames.title}</h1>
        <ButtonLink to={ROUTES.createGame} variant="accent" className="shrink-0">
          {viText.myGames.createAction}
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
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label={viText.myGames.filtersLabel} className="flex flex-wrap items-center gap-2">
              <SubjectChip
                subject=""
                label={`${viText.myGames.statusAll} ${games.length}`}
                // "Tất cả" nghĩa là không lọc môn và không lọc trạng thái (kể cả ?status=PUBLISHED từ đường dẫn cũ).
                selected={filters.subject === '' && filters.status === ''}
                onClick={() => update({ subject: '', status: '' })}
              />
              {SUBJECT_VALUES.map((subject) => (
                <SubjectChip
                  key={subject}
                  subject={subject}
                  label={`${subjectLabel(subject)} ${subjectCounts[subject] ?? 0}`}
                  selected={filters.subject === subject}
                  onClick={() => update({ subject: filters.subject === subject ? '' : subject })}
                />
              ))}
              {STATUS_CHIPS.map(({ status, label }) => (
                <button
                  key={status}
                  type="button"
                  aria-pressed={filters.status === status}
                  onClick={() => update({ status: filters.status === status ? '' : status })}
                  className={`min-h-11 rounded-full border-2 border-line px-4 py-1 text-sm font-bold transition ${
                    filters.status === status ? 'bg-ink text-white' : 'bg-surface text-ink hover:bg-brand-soft'
                  }`}
                >
                  {`${label} ${status === 'DRAFT' ? stats.draft : stats.published}`}
                </button>
              ))}
            </div>
            <div className="relative min-w-48 flex-1 sm:max-w-xs">
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
            <div className="w-40">
              <label htmlFor="filter-grade" className="sr-only">
                {viText.myGames.gradeLabel}
              </label>
              <select
                id="filter-grade"
                value={filters.grade}
                onChange={(event) => update({ grade: event.target.value })}
                className={inputClass()}
              >
                <option value="">
                  {viText.myGames.gradeLabel}: {viText.myGames.allOption}
                </option>
                {GRADE_LEVEL_VALUES.map((grade) => (
                  <option key={grade} value={grade}>
                    {gradeLevelLabel(grade)}
                  </option>
                ))}
              </select>
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
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              <h2 className="sr-only">{viText.myGames.resultsLabel}</h2>
              {visible.map((game) => (
                <GameCard key={game.gameId} game={game} />
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
