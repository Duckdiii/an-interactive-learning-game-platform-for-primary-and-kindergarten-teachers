import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation, useNavigationType } from 'react-router-dom'
import Icon from '../components/ui/Icon'
import type { IconName } from '../components/ui/Icon'
import { viText } from '../constants/viText'
import { useAuth } from '../hooks/useAuth'
import { ROUTES } from '../routes/paths'
import { initialOf } from '../utils/initials'

// Trình soạn thảo (ROUTES.workspaceEditor) không nằm trên thanh điều hướng: giáo viên mở nó từ trang "Trò chơi của tôi",
// nên mục này không dùng `end` để vẫn được tô sáng khi đang ở trình soạn thảo.
const navigationItems: ReadonlyArray<{
  label: string
  to: string
  end: boolean
  icon: IconName
}> = [
  { label: viText.nav.home, to: ROUTES.dashboard, end: true, icon: 'home' },
  { label: viText.nav.myGames, to: ROUTES.workspace, end: false, icon: 'library' },
  { label: viText.nav.createGame, to: ROUTES.createGame, end: true, icon: 'sparkles' },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const displayName = user?.fullName || user?.email || viText.layout.fallbackUser

  // Sang trang mới (trong ứng dụng) thì đưa tiêu điểm về nội dung chính và cuộn lên đầu: người dùng bàn phím và trình
  // đọc màn hình không bị kẹt ở thanh điều hướng, người dùng điện thoại không đứng giữa trang cũ. Lúc vừa mở trang thì
  // KHÔNG chuyển tiêu điểm, để phím Tab đầu tiên vẫn tới liên kết "Bỏ qua điều hướng".
  // Mở thẳng hoặc tải lại trang (loại điều hướng POP, kể cả F5 sau khi đã đi vài trang: trình duyệt tự khôi phục vị trí
  // cuộn) thì coi như đã ở đúng trang; đến từ trang khác trong ứng dụng (vd. vừa đăng nhập xong, nút đăng nhập đã biến
  // mất, loại PUSH/REPLACE) thì vẫn đưa tiêu điểm về nội dung chính.
  const navigationType = useNavigationType()
  const lastPath = useRef<string | null>(
    navigationType === 'POP' ? location.pathname : null,
  )
  useEffect(() => {
    if (lastPath.current === location.pathname) return

    lastPath.current = location.pathname
    window.scrollTo({ top: 0 })

    // Trang mới đã tự đặt tiêu điểm vào một ô cụ thể (ví dụ ô chọn khối lớp khi vào "Tạo ngẫu nhiên") thì giữ nguyên.
    // Effect của trang con chạy trước effect của layout nên kiểm tra được ở đây.
    const main = mainRef.current
    const active = document.activeElement
    if (main && active && active !== main && main.contains(active)) return

    main?.focus({ preventScroll: true })
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-paper text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:font-semibold focus:text-brand-strong focus:shadow-lg"
      >
        {viText.layout.skipToContent}
      </a>

      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-ink/10 bg-white px-4 py-6 lg:flex">
        <Brand />

        <nav aria-label={viText.layout.navLabel} className="mt-8 space-y-2">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'flex min-h-12 items-center gap-3 rounded-xl px-4 text-base font-semibold transition',
                  isActive
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-ink-soft hover:bg-brand-soft hover:text-brand-strong',
                ].join(' ')
              }
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl bg-paper p-4">
          <div className="flex items-center gap-3">
            <Avatar name={displayName} />
            <div className="min-w-0">
              <p className="truncate text-base font-bold">{displayName}</p>
              {user?.fullName ? (
                <p className="truncate text-sm text-ink-soft">{user.email}</p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-ink/15 bg-white px-4 text-base font-semibold text-ink-soft transition hover:border-brand hover:text-brand-strong"
          >
            <Icon name="logout" />
            {viText.layout.signOut}
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-ink/10 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <Brand compact />
        <div className="flex items-center gap-2">
          <Avatar name={displayName} />
          <button
            type="button"
            onClick={logout}
            aria-label={viText.layout.signOut}
            className="grid h-11 w-11 place-items-center rounded-xl border-2 border-ink/15 text-ink-soft transition hover:border-brand hover:text-brand-strong"
          >
            <Icon name="logout" />
          </button>
        </div>
      </header>

      <main
        id="main"
        ref={mainRef}
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 outline-none sm:px-6 sm:pt-8 lg:ml-72 lg:w-auto lg:max-w-none lg:px-10 lg:pb-12"
      >
        <div key={location.pathname} className="page-in mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>

      <nav
        aria-label={viText.layout.navLabelCompact}
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-ink/10 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {navigationItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                'relative flex min-h-16 flex-col items-center justify-center gap-1 px-2 text-sm font-semibold transition',
                isActive ? 'text-brand-strong' : 'text-ink-soft',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-6 top-0 h-1 rounded-b-full bg-brand"
                  />
                ) : null}
                <Icon name={item.icon} className="h-6 w-6" />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-1">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand text-lg font-extrabold text-white">
        AI
      </span>
      <div className="min-w-0">
        <p className="truncate font-bold">{viText.appName}</p>
        {compact ? null : (
          <p className="text-sm text-ink-soft">{viText.layout.sidebarSubtitle}</p>
        )}
      </div>
    </div>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sun-soft text-lg font-extrabold text-ink ring-2 ring-sun"
    >
      {initialOf(name)}
    </span>
  )
}
