import { Link, NavLink, Outlet } from 'react-router-dom'
import { ROUTES } from '../routes/paths'

const authNavigation = [
  { label: 'Login', to: ROUTES.login },
  { label: 'Register', to: ROUTES.register },
]

export default function AuthLayout() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between px-6 py-8 sm:px-10 lg:px-12">
          <Link to={ROUTES.login} className="inline-flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-400 font-bold text-slate-950">
              AI
            </span>
            <span className="font-semibold">AI Game Platform</span>
          </Link>

          <div className="py-16 lg:py-0">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Teacher workspace
            </p>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight sm:text-5xl">
              Create playful learning sessions without rebuilding the app shell.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
              Authentication screens are isolated here so the real login flow can
              plug in later without touching dashboard or editor routes.
            </p>
          </div>

          <p className="text-sm text-slate-400">
            Frontend skeleton only. Backend integration will connect through the
            shared API layer.
          </p>
        </section>

        <section className="flex items-center bg-white px-6 py-10 text-slate-950 sm:px-10 lg:px-12">
          <div className="w-full">
            <nav className="mb-8 grid grid-cols-2 rounded-md border border-slate-200 bg-slate-100 p-1">
              {authNavigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  className={({ isActive }) =>
                    [
                      'flex min-h-10 items-center justify-center rounded text-sm font-semibold transition',
                      isActive
                        ? 'bg-white text-slate-950 shadow-sm'
                        : 'text-slate-500 hover:text-slate-950',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <Outlet />
          </div>
        </section>
      </div>
    </main>
  )
}
