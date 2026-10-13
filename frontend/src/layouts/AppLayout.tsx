import { NavLink, Outlet } from 'react-router-dom'
import { viText } from '../constants/viText'
import { useAuth } from '../hooks/useAuth'
import { ROUTES } from '../routes/paths'

// Trình soạn thảo (ROUTES.workspaceEditor) không nằm trên thanh điều hướng: giáo viên mở nó từ trang "Trò chơi của tôi",
// nên mục này không dùng `end` để vẫn được tô sáng khi đang ở trình soạn thảo.
const navigationItems = [
  { label: viText.nav.home, to: ROUTES.dashboard, end: true },
  { label: viText.nav.myGames, to: ROUTES.workspace, end: false },
  { label: viText.nav.createGame, to: ROUTES.createGame, end: true },
]

export default function AppLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-paper text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-ink/10 bg-white px-4 py-5 lg:block">
        <div className="flex items-center gap-3 px-2">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-lg font-bold text-white">
            AI
          </span>
          <div>
            <p className="font-bold">{viText.appName}</p>
            <p className="text-sm text-ink-soft">
              {viText.layout.sidebarSubtitle}
            </p>
          </div>
        </div>

        <nav
          aria-label={viText.layout.navLabel}
          className="mt-8 space-y-2"
        >
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'flex min-h-12 items-center rounded-xl px-4 text-base font-semibold transition',
                  isActive
                    ? 'bg-brand text-white'
                    : 'text-ink-soft hover:bg-brand-soft hover:text-brand-strong',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-ink/10 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink-soft">
                {viText.layout.headerKicker}
              </p>
              <h1 className="text-xl font-bold">{viText.layout.headerTitle}</h1>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-base font-semibold">
                  {user?.email ?? viText.layout.fallbackUser}
                </p>
                <p className="text-sm text-ink-soft">
                  {user ? viText.layout.signedIn : viText.layout.noSession}
                </p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="min-h-11 rounded-xl border-2 border-ink/15 px-4 text-base font-semibold text-ink-soft transition hover:border-brand hover:text-brand-strong"
              >
                {viText.layout.signOut}
              </button>
            </div>
          </div>

          <nav
            aria-label={viText.layout.navLabelCompact}
            className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden"
          >
            {navigationItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    'flex min-h-11 shrink-0 items-center rounded-xl px-4 text-base font-semibold',
                    isActive
                      ? 'bg-brand text-white'
                      : 'bg-brand-soft text-brand-strong',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
