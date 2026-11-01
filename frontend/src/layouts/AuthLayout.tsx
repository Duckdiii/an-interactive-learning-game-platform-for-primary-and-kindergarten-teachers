import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import Card from '../components/ui/Card'
import LetterTiles from '../components/ui/LetterTiles'
import { MIXED_TILES } from '../components/ui/tileSets'
import { viText } from '../constants/viText'
import { ROUTES } from '../routes/paths'

const authNavigation = [
  { label: viText.auth.tabLogin, to: ROUTES.login },
  { label: viText.auth.tabRegister, to: ROUTES.register },
]

// Ô số bước theo màu ba môn (viết đủ lớp để Tailwind quét được), nghiêng nhẹ như LetterTiles.
const STEP_TILES = [
  'border-math-mark bg-math-soft text-math-ink -rotate-3',
  'border-viet-mark bg-viet-soft text-viet-ink rotate-2',
  'border-eng-mark bg-eng-soft text-eng-ink -rotate-2',
] as const

// Cột thương hiệu đổi nội dung theo route: đăng nhập là thông điệp + khối chữ, đăng ký là "ba bước".
function HeroContent({ isRegister }: { isRegister: boolean }) {
  if (isRegister) {
    // Như wireframe A-Register: số bước trên ô màu ba môn (khối chữ đồ chơi), ghi chú cho học sinh nằm sát đáy cột.
    return (
      <div className="relative hidden lg:flex lg:flex-1 lg:flex-col lg:pt-12">
        <p className="max-w-xl font-display text-5xl font-extrabold leading-tight">
          {viText.auth.stepsTitle}
        </p>
        <ol className="mt-8 space-y-5">
          {viText.auth.steps.map((step, index) => (
            <li key={step} className="flex items-center gap-4 text-xl font-semibold">
              <span
                aria-hidden="true"
                className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl border-2 border-b-4 font-display text-2xl font-extrabold ${STEP_TILES[index % STEP_TILES.length]}`}
              >
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <p className="mt-auto max-w-lg pt-10 text-base leading-7 text-white/90">
          {viText.auth.studentNote}
        </p>
      </div>
    )
  }

  // Như wireframe A-Login: thông điệp ngay dưới logo, khối chữ to nằm sát đáy cột.
  return (
    <div className="relative hidden lg:flex lg:flex-1 lg:flex-col lg:pt-12">
      <p className="max-w-xl font-display text-5xl font-extrabold leading-tight">
        {viText.auth.heroTitle}
      </p>
      <p className="mt-5 max-w-lg text-lg font-semibold leading-8 text-white/90">
        {viText.auth.heroDescription}
      </p>
      <LetterTiles tiles={MIXED_TILES} size="xl" className="mt-auto pt-10" />
    </div>
  )
}

export default function AuthLayout() {
  const isRegister = useLocation().pathname === ROUTES.register

  return (
    <main className="min-h-screen bg-paper text-ink lg:grid lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:p-6">
      {/* Dưới lg: chỉ một dải thương hiệu gọn để form nằm ngay màn hình đầu tiên. */}
      <section className="relative overflow-hidden bg-brand-strong px-6 py-4 text-white sm:px-10 lg:flex lg:flex-col lg:justify-between lg:rounded-[32px] lg:px-12 lg:py-11">
        <Link
          to={ROUTES.login}
          className="relative inline-flex min-h-11 items-center gap-3"
        >
          <span className="grid h-11 w-11 -rotate-6 place-items-center rounded-2xl bg-sun font-display text-lg font-extrabold text-sun-ink shadow-base-sun">
            AI
          </span>
          <span className="font-display text-xl font-extrabold">{viText.appName}</span>
        </Link>

        <HeroContent isRegister={isRegister} />
        <span aria-hidden="true" className="hidden lg:block" />
      </section>

      <section className="relative flex min-w-0 flex-col items-center px-6 py-8 sm:px-10 lg:justify-center lg:pt-20 lg:pb-12">
        <Link
          to={ROUTES.join}
          className="mb-4 inline-flex min-h-11 items-center self-end rounded-full bg-surface px-4 text-sm font-extrabold text-ink shadow-card lg:absolute lg:right-4 lg:top-4 lg:mb-0"
        >
          {viText.auth.studentLink} <span aria-hidden="true">›</span>
        </Link>
        <Card padding="lg" className="w-full min-w-0 max-w-md">
          <nav
            aria-label={viText.auth.tabsLabel}
            className="mb-6 grid grid-cols-2 rounded-2xl bg-paper p-1"
          >
            {authNavigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) =>
                  [
                    'flex min-h-12 items-center justify-center rounded-xl text-base transition',
                    isActive
                      ? 'bg-brand font-black text-white'
                      : 'font-extrabold text-ink hover:bg-brand-soft hover:text-brand-strong',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <Outlet />
        </Card>
      </section>
    </main>
  )
}
