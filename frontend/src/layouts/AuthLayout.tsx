import { Link, NavLink, Outlet } from 'react-router-dom'
import { viText } from '../constants/viText'
import { ROUTES } from '../routes/paths'

const authNavigation = [
  { label: viText.auth.tabLogin, to: ROUTES.login },
  { label: viText.auth.tabRegister, to: ROUTES.register },
]

export default function AuthLayout() {
  return (
    <main className="min-h-screen bg-brand-strong text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between px-6 py-8 sm:px-10 lg:px-12">
          <Link
            to={ROUTES.login}
            className="inline-flex min-h-11 items-center gap-3"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-sun text-lg font-bold text-ink">
              AI
            </span>
            <span className="text-lg font-bold">{viText.appName}</span>
          </Link>

          <div className="py-16 lg:py-0">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-sun">
              {viText.auth.heroKicker}
            </p>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight sm:text-5xl">
              {viText.auth.heroTitle}
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-white/85">
              {viText.auth.heroDescription}
            </p>
          </div>

          <p className="text-sm text-white/85">{viText.auth.footer}</p>
        </section>

        <section className="flex items-center bg-white px-6 py-10 text-ink sm:px-10 lg:px-12">
          <div className="w-full">
            <nav className="mb-8 grid grid-cols-2 rounded-xl border border-ink/10 bg-paper p-1">
              {authNavigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  className={({ isActive }) =>
                    [
                      'flex min-h-12 items-center justify-center rounded-lg text-base font-semibold transition',
                      isActive
                        ? 'bg-white text-brand-strong shadow-sm'
                        : 'text-ink-soft hover:text-brand-strong',
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
