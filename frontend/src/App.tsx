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
const ResultsPage = lazy(() => import('./pages/ResultsPage'))
const WorkspaceEditor = lazy(() => import('./pages/WorkspaceEditor'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const PlayPage = lazy(() => import('./player/pages/PlayPage'))
const JoinPage = lazy(() => import('./player/pages/JoinPage'))
const PresentPage = lazy(() => import('./player/pages/PresentPage'))
const RoomHostPage = lazy(() => import('./player/pages/RoomHostPage'))
const RoomJoinPage = lazy(() => import('./player/pages/RoomJoinPage'))
const NotFound = lazy(() => import('./pages/NotFound'))
const CanvasSandbox = lazy(() => import('./pages/dev/CanvasSandbox'))
const UiKit = lazy(() => import('./pages/dev/UiKit'))
const RoomSandbox = lazy(() => import('./pages/dev/RoomSandbox'))
const PipelinePlayground = lazy(() => import('./experiments/pipeline/PipelinePlayground'))

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
        {import.meta.env.DEV && <Route path="/dev/ui-kit" element={<UiKit />} />}
        {import.meta.env.DEV && <Route path="/dev/room-sandbox" element={<RoomSandbox />} />}
        {import.meta.env.DEV && (
          <Route path="/dev/type-specimen" element={<Navigate to="/dev/ui-kit" replace />} />
        )}
        {import.meta.env.DEV && (
          <Route path={ROUTES.pipelinePlayground} element={<PipelinePlayground />} />
        )}

        <Route element={<AuthLayout />}>
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route path={ROUTES.register} element={<RegisterPage />} />
        </Route>

        {/* Học sinh vào bằng mã, không cần tài khoản: nằm ngoài ProtectedRoute. */}
        <Route path={ROUTES.play} element={<PlayPage />} />
        <Route path={ROUTES.join} element={<JoinPage />} />
        <Route path={ROUTES.roomJoin} element={<RoomJoinPage />} />

        {/* Trình chiếu: cần đăng nhập giáo viên nhưng chiếm cả màn hình, không nằm trong AppLayout. */}
        <Route
          path={ROUTES.present}
          element={
            <ProtectedRoute>
              <PresentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.roomHost}
          element={
            <ProtectedRoute>
              <RoomHostPage />
            </ProtectedRoute>
          }
        />

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
          <Route path={ROUTES.results} element={<ResultsPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

export default App
