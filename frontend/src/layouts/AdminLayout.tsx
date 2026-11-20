import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Icon from '../components/ui/Icon'
import { ROUTES } from '../routes/paths'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate(ROUTES.login, { replace: true })
  }

  const navItems = [
    {
      to: ROUTES.adminDashboard,
      label: 'Giám sát & Chi phí',
      iconName: 'chart' as const,
    },
    {
      to: ROUTES.adminTeachers,
      label: 'Quản lý giáo viên',
      iconName: 'user' as const,
    },
    {
      to: ROUTES.adminAiConfig,
      label: 'Cài đặt bộ não AI',
      iconName: 'sparkles' as const,
    },
    {
      to: ROUTES.adminAuditLogs,
      label: 'Nhật ký Audit Log',
      iconName: 'clock' as const,
    },
  ]

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between shrink-0 shadow-sm">
        <div>
          {/* Brand header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-indigo-100 shadow-lg">
                <Icon name="sparkles" className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-base text-slate-800 leading-tight">AI-Game Platform</h1>
                <span className="inline-block text-[11px] font-semibold tracking-wider text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded mt-0.5">
                  Admin Portal
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5" aria-label="Menu quản trị">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center px-3.5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <div className="flex items-center space-x-3">
                  <Icon name={item.iconName} className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer / User Badge */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {user?.fullName || 'Quản trị viên'}
              </p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
            </div>
            <span className="shrink-0 text-[10px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              Admin
            </span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
          >
            <Icon name="logout" className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
