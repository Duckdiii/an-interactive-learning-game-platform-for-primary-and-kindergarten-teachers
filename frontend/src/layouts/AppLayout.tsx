import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ROUTES } from '../routes/paths'

const navigationItems = [
  { label: 'Dashboard', to: ROUTES.dashboard, end: true },
  { label: 'Workspace', to: ROUTES.workspace, end: true },
  { label: 'Editor', to: ROUTES.workspaceEditor, end: true },
]

export default function AppLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white px-4 py-5 lg:block">
        <div className="flex items-center gap-3 px-2">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500 font-bold text-white">
            AI
          </span>
          <div>
            <p className="font-semibold">AI Game Platform</p>
            <p className="text-xs text-slate-500">Teacher Console</p>
          </div>
        </div>

        <nav className="mt-8 space-y-1">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition',
                  isActive
                    ? 'bg-slate-950 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Primary & Kindergarten Learning Games
              </p>
              <h1 className="text-xl font-semibold">Teacher Console</h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold">
                  {user?.email ?? 'Demo teacher'}
                </p>
                <p className="text-xs text-slate-500">
                  {user ? 'Signed in' : 'No session yet'}
                </p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="min-h-10 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
              >
                Sign out
              </button>
            </div>
          </div>

          <nav className="mt-3 flex gap-2 overflow-x-auto lg:hidden">
            {navigationItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    'min-h-10 shrink-0 rounded-md px-3 py-2 text-sm font-medium',
                    isActive
                      ? 'bg-slate-950 text-white'
                      : 'bg-slate-100 text-slate-700',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
