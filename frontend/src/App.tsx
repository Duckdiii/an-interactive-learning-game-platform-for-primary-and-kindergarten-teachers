import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AuthLayout from './layouts/AuthLayout'
import AppLayout from './layouts/AppLayout'
import Dashboard from './pages/Dashboard'
import GameGeneratorPlaceholder from './pages/GameGeneratorPlaceholder'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Workspace from './pages/Workspace'
import WorkspaceEditor from './pages/WorkspaceEditor'
import NotFound from './pages/NotFound'
import { ROUTES } from './routes/paths'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={ROUTES.login} replace />} />

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
        <Route
          path={ROUTES.createGame}
          element={<GameGeneratorPlaceholder />}
        />
        <Route path={ROUTES.workspace} element={<Workspace />} />
        <Route path={ROUTES.workspaceEditor} element={<WorkspaceEditor />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
