import { Link, NavLink, Outlet } from 'react-router-dom'
import Icon from '../components/ui/Icon'
import LetterTiles from '../components/ui/LetterTiles'
import { MIXED_TILES } from '../components/ui/tileSets'
import { viText } from '../constants/viText'
import { ROUTES } from '../routes/paths'

const authNavigation = [
  { label: viText.auth.tabLogin, to: ROUTES.login },
  { label: viText.auth.tabRegister, to: ROUTES.register },
]

export default function AuthLayout() {
  return (
    <main className="min-h-screen bg-paper text-ink lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Điện thoại: chỉ một thanh thương hiệu gọn để form đăng nhập nằm ngay màn hình đầu tiên. */}
      <section className="relative overflow-hidden bg-brand-strong px-6 py-4 text-white sm:px-10 lg:flex lg:min-h-screen lg:flex-col lg:justify-between lg:px-14 lg:py-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 hidden h-96 w-96 rounded-full bg-white/5 lg:block"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 hidden h-96 w-96 rounded-full bg-white/5 lg:block"
        />

        <Link
          to={ROUTES.login}
          className="relative inline-flex min-h-11 items-center gap-3"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-sun text-lg font-extrabold text-ink">
            AI
          </span>
          <span className="text-lg font-bold">{viText.appName}</span>
        </Link>

        <div className="relative hidden lg:block">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-sun-soft">
            {viText.auth.heroKicker}
          </p>
          <p className="max-w-xl text-5xl font-extrabold leading-tight">
            {viText.auth.heroTitle}
          </p>
          <p className="mt-5 max-w-lg text-lg leading-8 text-white/90">
            {viText.auth.heroDescription}
          </p>
          <ul className="mt-8 space-y-3">
            {viText.auth.heroPoints.map((point) => (
              <li key={point} className="flex items-start gap-3 text-base">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sun text-ink">
                  <Icon name="check" className="h-4 w-4" />
                </span>
                {point}
              </li>
            ))}
          </ul>
          <LetterTiles tiles={MIXED_TILES} size="lg" className="mt-12" />
        </div>

        <p className="relative hidden text-sm text-white/85 lg:block">
          {viText.auth.footer}
        </p>
      </section>

      <section className="flex justify-center px-6 py-8 sm:px-10 lg:items-center lg:py-12">
        <div className="w-full max-w-md">
          <nav
            aria-label="Đăng nhập hoặc đăng ký"
            className="mb-8 grid grid-cols-2 rounded-xl border-2 border-ink/10 bg-white p-1"
          >
            {authNavigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) =>
                  [
                    'flex min-h-12 items-center justify-center rounded-lg text-base font-semibold transition',
                    isActive
                      ? 'bg-brand text-white shadow-sm'
                      : 'text-ink-soft hover:bg-brand-soft hover:text-brand-strong',
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
    </main>
  )
}
