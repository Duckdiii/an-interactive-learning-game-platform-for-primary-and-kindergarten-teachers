import { useState } from 'react'
import type { FormEvent } from 'react'
import axios from 'axios'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { loginTeacher } from '../api/authApi'
import Button from '../components/Button'
import ErrorNotice from '../components/ui/ErrorNotice'
import FormField from '../components/ui/FormField'
import PasswordInput from '../components/ui/PasswordInput'
import { inputClass } from '../components/ui/formStyles'
import { AUTH_FEATURES } from '../config/authFeatures'
import { viText } from '../constants/viText'
import { useAuth } from '../hooks/useAuth'
import { usePageTitle } from '../hooks/usePageTitle'
import { ROUTES } from '../routes/paths'
import { parseApiError } from '../utils/apiError'

interface LoginForm {
  email: string
  password: string
  rememberMe: boolean
}

interface LoginLocationState {
  successMessage?: string
}

const initialForm: LoginForm = {
  email: '',
  password: '',
  rememberMe: false,
}

export default function LoginPage() {
  usePageTitle('Đăng nhập')
  const [form, setForm] = useState(initialForm)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as LoginLocationState | null

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const { teacher, accessToken } = await loginTeacher(form)
      // shortcut: chưa có giao diện quản trị trên main; tới khi gộp admin-portal (#72) thì chuyển ROLE_ADMIN sang route /admin.
      if (teacher.role === 'ROLE_ADMIN') {
        // Cấp phiên tạm để gọi được /auth/logout, thu hồi refresh token backend vừa đặt.
        login(teacher, accessToken)
        await logout()
        setErrorMessage('Tài khoản quản trị viên chưa có giao diện quản trị. Vui lòng liên hệ nhóm phát triển.')
        return
      }
      login(teacher, accessToken)
      navigate(ROUTES.dashboard, { replace: true })
    } catch (error) {
      const isAuthFailure =
        axios.isAxiosError(error) && error.response?.status === 401
      setErrorMessage(
        isAuthFailure
          ? 'Email hoặc mật khẩu không chính xác. Vui lòng thử lại.'
          : parseApiError(error, 'Không thể đăng nhập vào lúc này. Vui lòng thử lại sau.')
              .message,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full min-w-0">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-extrabold leading-tight">
          {viText.auth.loginTitle}
        </h1>
        <p className="mt-1 text-base font-semibold text-ink-soft">
          {viText.auth.loginDescription}
        </p>
      </div>

      {locationState?.successMessage ? (
        <p
          role="status"
          className="mb-4 rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 text-base text-brand-strong"
        >
          {locationState.successMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <ErrorNotice message={errorMessage} className="mb-4" />
      ) : null}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <FormField id="login-email" label="Email">
          <input
            id="login-email"
            type="email"
            name="email"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({ ...current, email: event.target.value }))
            }
            autoComplete="email"
            required
            placeholder={viText.auth.emailPlaceholder}
            className={inputClass()}
          />
        </FormField>

        <FormField
          id="login-password"
          label="Mật khẩu"
          aside={
            AUTH_FEATURES.forgotPassword ? (
              <Link
                to={ROUTES.forgotPassword}
                className="inline-flex min-h-11 items-center text-sm font-extrabold text-brand-strong underline"
              >
                {viText.auth.forgotPassword}
              </Link>
            ) : undefined
          }
        >
          <PasswordInput
            id="login-password"
            name="password"
            value={form.password}
            onChange={(password) =>
              setForm((current) => ({ ...current, password }))
            }
            autoComplete="current-password"
            required
            placeholder="Nhập mật khẩu"
          />
        </FormField>

        {AUTH_FEATURES.rememberMe ? (
          // Mặc định không chọn: máy ở trường thường dùng chung, chỉ giữ đăng nhập 30 ngày khi cô chủ động chọn.
          <label className="flex min-h-11 items-center gap-3 text-sm font-bold">
            <input
              type="checkbox"
              name="rememberMe"
              checked={form.rememberMe}
              onChange={(event) =>
                setForm((current) => ({ ...current, rememberMe: event.target.checked }))
              }
              className="h-5 w-5 accent-brand"
            />
            {viText.auth.rememberMe}
          </label>
        ) : null}

        <Button type="submit" size="lg" fullWidth disabled={isSubmitting}>
          {isSubmitting ? viText.auth.loginSubmitting : viText.auth.loginSubmit}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm font-bold text-ink-soft">
        {viText.auth.noAccount}{' '}
        <Link
          to={ROUTES.register}
          className="inline-flex min-h-11 items-center px-1 font-black text-brand-strong underline"
        >
          {viText.auth.createAccount}
        </Link>
      </p>
    </div>
  )
}
