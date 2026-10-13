import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { getGames } from '../api/gamesApi'
import Button from '../components/Button'
import ButtonLink from '../components/ButtonLink'
import LoadingSpinner from '../components/LoadingSpinner'
import PageHeader from '../components/ui/PageHeader'
import SubjectCover from '../components/ui/SubjectCover'
import { subjectTheme } from '../components/ui/subjectTheme'
import {
  compareGameStatuses,
  compareGradeLevels,
  compareSubjects,
  gameStatusLabel,
  gradeLevelLabel,
  subjectLabel,
} from '../constants/labels'
import { viText } from '../constants/viText'
import { ROUTES } from '../routes/paths'
import type { GameFilters, GameSummary } from '../types/game-summary.types'

const initialFilters: GameFilters = {
  subject: '',
  gradeLevel: '',
  status: '',
}

// Ít hơn số này thì danh sách còn ngắn, bộ lọc chỉ thêm rối mắt; đang lọc thì luôn hiện để giáo viên bỏ lọc được.
export const FILTER_MIN_GAMES = 6

// Mặc định react-query thử lại 3 lần (hơn 7 giây mới báo lỗi). Lệnh đọc danh sách chỉ thử lại 1 lần, và không thử
// lại khi đã quá hạn (máy chủ treo): thử lại chỉ làm giáo viên chờ gấp đôi mà hiếm khi có kết quả khác.
function shouldRetryGames(failureCount: number, error: unknown) {
  const isTimeout =
    axios.isAxiosError(error) &&
    (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')

  return failureCount < 1 && !isTimeout
}

export default function Dashboard() {
  const [filters, setFilters] = useState(initialFilters)

  const gamesQuery = useQuery({
    queryKey: ['games', filters],
    queryFn: () => getGames(filters),
    // Giữ danh sách cũ trong lúc tải kết quả lọc mới, để bộ lọc không biến mất và ô chọn không mất focus.
    placeholderData: keepPreviousData,
    retry: shouldRetryGames,
  })

  const games = gamesQuery.data ?? []
  const hasActiveFilter = Object.values(filters).some(Boolean)
  const showFilters = hasActiveFilter || games.length >= FILTER_MIN_GAMES
  const subjectOptions = mergeOptions(
    filters.subject ? [filters.subject] : [],
    games.map((game) => game.subject),
    compareSubjects,
  )
  const gradeOptions = mergeOptions(
    filters.gradeLevel ? [filters.gradeLevel] : [],
    games.map((game) => game.gradeLevel),
    compareGradeLevels,
  )
  const statusOptions = mergeOptions(
    ['DRAFT', 'PUBLISHED', ...(filters.status ? [filters.status] : [])],
    games.map((game) => game.status),
    compareGameStatuses,
  )

  const updateFilter = (field: keyof GameFilters, value: string) => {
    setFilters((current) => ({ ...current, [field]: value }))
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={viText.home.kicker}
        title="Trò chơi của bạn"
        description="Quản lý bản nháp, theo dõi trò chơi đã xuất bản và tiếp tục công việc đang dang dở."
      />

      <CreateGameBanner />

      {showFilters ? (
        <section
          aria-label="Bộ lọc trò chơi"
          className="grid gap-4 sm:grid-cols-3"
        >
          <FilterSelect
            label="Môn học"
            value={filters.subject}
            options={subjectOptions}
            formatOption={subjectLabel}
            onChange={(value) => updateFilter('subject', value)}
          />
          <FilterSelect
            label="Khối lớp"
            value={filters.gradeLevel}
            options={gradeOptions}
            formatOption={gradeLevelLabel}
            onChange={(value) => updateFilter('gradeLevel', value)}
          />
          <FilterSelect
            label="Trạng thái"
            value={filters.status}
            options={statusOptions}
            formatOption={gameStatusLabel}
            onChange={(value) => updateFilter('status', value)}
          />
        </section>
      ) : null}

      {gamesQuery.isPending ? <DashboardLoading /> : null}

      {gamesQuery.isError ? (
        <section
          role="alert"
          className="rounded-2xl border-2 border-rose-200 bg-white p-8 text-center"
        >
          <h3 className="text-lg font-bold text-ink">
            Không thể tải danh sách trò chơi
          </h3>
          <p className="mt-2 text-base text-ink-soft">
            Vui lòng kiểm tra kết nối mạng rồi thử lại.
          </p>
          <Button
            variant="secondary"
            className="mt-5"
            onClick={() => gamesQuery.refetch()}
          >
            Thử lại
          </Button>
        </section>
      ) : null}

      {gamesQuery.isSuccess && games.length === 0 ? (
        <EmptyState
          filtered={hasActiveFilter}
          onClearFilters={() => setFilters(initialFilters)}
        />
      ) : null}

      {gamesQuery.isSuccess && games.length > 0 ? (
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </section>
      ) : null}
    </div>
  )
}

function CreateGameBanner() {
  return (
    <section
      aria-label={viText.home.bannerTitle}
      className="rounded-3xl border-2 border-brand/20 bg-brand-soft p-6 sm:p-8"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-2xl font-bold text-ink">
              {viText.home.bannerTitle}
            </h3>
            <span className="rounded-full bg-sun-soft px-3 py-1 text-sm font-bold text-ink ring-2 ring-sun">
              {viText.home.bannerTag}
            </span>
          </div>
          <ol className="mt-4 space-y-3">
            {viText.home.bannerSteps.map((step, index) => (
              <li key={step} className="flex items-center gap-3 text-base">
                <span
                  aria-hidden="true"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-base font-bold text-brand-strong ring-2 ring-brand/30"
                >
                  {index + 1}
                </span>
                <span className="font-medium text-ink">{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <ButtonLink to={ROUTES.createGame} className="lg:min-w-48">
          + {viText.nav.createGame}
        </ButtonLink>
      </div>
    </section>
  )
}

function FilterSelect({
  label,
  value,
  options,
  formatOption,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  formatOption: (value: string) => string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="text-base font-semibold text-ink">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-xl border-2 border-ink/20 bg-white px-4 text-base text-ink focus:border-brand"
      >
        <option value="">Tất cả</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {formatOption(option)}
          </option>
        ))}
      </select>
    </label>
  )
}

function DashboardLoading() {
  return (
    <section
      role="status"
      aria-label="Đang tải trò chơi"
      className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
    >
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="overflow-hidden rounded-2xl border border-ink/10 bg-white"
        >
          <div className="grid aspect-[16/9] place-items-center bg-paper">
            <LoadingSpinner label="Đang tải trò chơi" />
          </div>
          <div className="space-y-3 p-5">
            <div className="h-5 w-1/3 rounded-full bg-ink/10" />
            <div className="h-6 w-3/4 rounded-full bg-ink/10" />
          </div>
        </div>
      ))}
    </section>
  )
}

function EmptyState({
  filtered,
  onClearFilters,
}: {
  filtered: boolean
  onClearFilters: () => void
}) {
  return (
    <section className="grid min-h-64 place-items-center rounded-2xl border-2 border-dashed border-ink/20 bg-white p-8 text-center">
      <div>
        <h3 className="text-xl font-bold text-ink">
          {filtered ? viText.home.noMatchTitle : viText.home.emptyTitle}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-base leading-7 text-ink-soft">
          {filtered ? viText.home.noMatchDescription : viText.home.emptyDescription}
        </p>
        {filtered ? (
          <Button variant="secondary" className="mt-5" onClick={onClearFilters}>
            {viText.home.clearFilters}
          </Button>
        ) : null}
      </div>
    </section>
  )
}

function GameCard({ game }: { game: GameSummary }) {
  const isPublished = game.status === 'PUBLISHED'
  const theme = subjectTheme(game.subject)

  return (
    <article className="overflow-hidden rounded-2xl border border-ink/10 bg-white transition hover:border-brand/40 hover:shadow-md">
      {game.thumbnailUrl ? (
        <div className="aspect-[16/9] bg-paper">
          <img
            src={game.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <SubjectCover subject={game.subject} />
      )}
      <div className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-sm font-bold ${theme.chip}`}
          >
            {subjectLabel(game.subject)} · {gradeLevelLabel(game.gradeLevel)}
          </span>
          <span
            className={[
              'rounded-full px-3 py-1 text-sm font-bold',
              isPublished
                ? 'bg-brand-soft text-brand-strong'
                : 'bg-sun-soft text-ink ring-1 ring-sun',
            ].join(' ')}
          >
            {gameStatusLabel(game.status)}
          </span>
        </div>
        <h3 className="text-xl font-bold leading-snug text-ink">
          {game.title}
        </h3>
      </div>
    </article>
  )
}

function mergeOptions(
  current: string[],
  incoming: string[],
  compare: (a: string, b: string) => number,
) {
  return [...new Set([...current, ...incoming.filter(Boolean)])].sort(compare)
}
