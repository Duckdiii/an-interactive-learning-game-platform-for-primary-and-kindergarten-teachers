import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getGames } from '../api/gamesApi'
import LoadingSpinner from '../components/LoadingSpinner'
import PageHeader from '../components/ui/PageHeader'
import { ROUTES } from '../routes/paths'
import type { GameFilters, GameSummary } from '../types/game'

const initialFilters: GameFilters = {
  subject: '',
  gradeLevel: '',
  status: '',
}

export default function Dashboard() {
  const [filters, setFilters] = useState(initialFilters)

  const gamesQuery = useQuery({
    queryKey: ['games', filters],
    queryFn: () => getGames(filters),
  })

  const games = gamesQuery.data ?? []
  const subjectOptions = mergeOptions(
    filters.subject ? [filters.subject] : [],
    games.map((game) => game.subject),
  )
  const gradeOptions = mergeOptions(
    filters.gradeLevel ? [filters.gradeLevel] : [],
    games.map((game) => game.gradeLevel),
  )
  const statusOptions = mergeOptions(
    ['DRAFT', 'PUBLISHED', ...(filters.status ? [filters.status] : [])],
    games.map((game) => game.status),
  )

  const updateFilter = (field: keyof GameFilters, value: string) => {
    setFilters((current) => ({ ...current, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Teacher Console"
        title="Trò chơi của bạn"
        description="Quản lý bản nháp, theo dõi trò chơi đã xuất bản và tiếp tục công việc đang dang dở."
        actions={
          <Link
            to={ROUTES.createGame}
            className="inline-flex min-h-11 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            + Tạo game mới
          </Link>
        }
      />

      <section
        aria-label="Bộ lọc trò chơi"
        className="grid gap-3 border-b border-slate-200 pb-6 sm:grid-cols-3"
      >
        <FilterSelect
          label="Môn học"
          value={filters.subject}
          options={subjectOptions}
          onChange={(value) => updateFilter('subject', value)}
        />
        <FilterSelect
          label="Khối lớp"
          value={filters.gradeLevel}
          options={gradeOptions}
          onChange={(value) => updateFilter('gradeLevel', value)}
        />
        <FilterSelect
          label="Trạng thái"
          value={filters.status}
          options={statusOptions}
          onChange={(value) => updateFilter('status', value)}
        />
      </section>

      {gamesQuery.isPending ? <DashboardLoading /> : null}

      {gamesQuery.isError ? (
        <section className="rounded-lg border border-rose-200 bg-white p-6 text-center">
          <h3 className="font-semibold text-slate-950">
            Không thể tải danh sách trò chơi
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Vui lòng kiểm tra kết nối hoặc thử lại sau.
          </p>
          <button
            type="button"
            onClick={() => gamesQuery.refetch()}
            className="mt-4 min-h-10 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
          >
            Thử lại
          </button>
        </section>
      ) : null}

      {gamesQuery.isSuccess && games.length === 0 ? <EmptyState /> : null}

      {gamesQuery.isSuccess && games.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </section>
      ) : null}
    </div>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
      >
        <option value="">Tất cả</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {formatLabel(option)}
          </option>
        ))}
      </select>
    </label>
  )
}

function DashboardLoading() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="min-h-72 rounded-lg border border-slate-200 bg-white p-5"
        >
          <div className="grid min-h-48 place-items-center rounded-md bg-slate-100">
            <LoadingSpinner label="Đang tải trò chơi" />
          </div>
        </div>
      ))}
    </section>
  )
}

function EmptyState() {
  return (
    <section className="grid min-h-80 place-items-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <div>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-emerald-100 text-2xl font-semibold text-emerald-800">
          +
        </div>
        <h3 className="mt-5 text-lg font-semibold">Chưa có trò chơi nào</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
          Tạo trò chơi học tập đầu tiên để bắt đầu xây dựng thư viện nội dung
          cho lớp học.
        </p>
        <Link
          to={ROUTES.createGame}
          className="mt-5 inline-flex min-h-11 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          + Tạo game mới
        </Link>
      </div>
    </section>
  )
}

function GameCard({ game }: { game: GameSummary }) {
  const isPublished = game.status === 'PUBLISHED'

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="aspect-[16/9] bg-slate-100">
        {game.thumbnailUrl ? (
          <img
            src={game.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-sm font-semibold text-slate-400">
            Chưa có hình minh họa
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {formatLabel(game.subject)} · {formatLabel(game.gradeLevel)}
            </p>
            <h3 className="mt-2 text-base font-semibold text-slate-950">
              {game.title}
            </h3>
          </div>
          <span
            className={[
              'shrink-0 rounded px-2 py-1 text-xs font-semibold',
              isPublished
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800',
            ].join(' ')}
          >
            {formatLabel(game.status)}
          </span>
        </div>
      </div>
    </article>
  )
}

function mergeOptions(current: string[], incoming: string[]) {
  return [...new Set([...current, ...incoming.filter(Boolean)])].sort()
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
