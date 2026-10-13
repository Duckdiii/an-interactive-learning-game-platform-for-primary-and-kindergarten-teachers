import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingSpinner from './components/LoadingSpinner'
import AuthLayout from './layouts/AuthLayout'
import AppLayout from './layouts/AppLayout'
import { ROUTES } from './routes/paths'

// Mỗi trang tải riêng khi cần: giáo viên mở trang đăng nhập không phải tải cả trình soạn thảo và Canvas (konva nặng).
const Dashboard = lazy(() => import('./pages/Dashboard'))
const CreateGamePage = lazy(() => import('./pages/CreateGamePage'))
const MyGamesPage = lazy(() => import('./pages/MyGamesPage'))
const WorkspaceEditor = lazy(() => import('./pages/WorkspaceEditor'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const NotFound = lazy(() => import('./pages/NotFound'))
const CanvasSandbox = lazy(() => import('./pages/dev/CanvasSandbox'))

function PageFallback() {
  return (
    <div className="grid min-h-[50vh] place-items-center" role="status">
      <LoadingSpinner />
    </div>
  )
}

function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to={ROUTES.login} replace />} />
        {/* Chỉ tồn tại ở bản dev (import.meta.env.DEV=false khi `npm run build`) — route tạm để
          test Canvas Engine bằng fixture, xoá khi nối renderer vào WorkspaceEditor/GamePlayer thật. */}
        {import.meta.env.DEV && (
          <Route path="/dev/canvas-sandbox" element={<CanvasSandbox />} />
        )}

        <Route element={<AuthLayout />}>
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route path={ROUTES.register} element={<RegisterPage />} />
        </Route>

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path={ROUTES.dashboard} element={<Dashboard />} />
          <Route path={ROUTES.createGame} element={<CreateGamePage />} />
          <Route path={ROUTES.workspace} element={<MyGamesPage />} />
          <Route path={ROUTES.workspaceEditor} element={<WorkspaceEditor />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

export default App
