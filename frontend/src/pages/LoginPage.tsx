import { useState } from 'react'
import type { FormEvent } from 'react'
import axios from 'axios'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { loginTeacher } from '../api/authApi'
import Button from '../components/Button'
import { viText } from '../constants/viText'
import { useAuth } from '../hooks/useAuth'
import { ROUTES } from '../routes/paths'
import { parseApiError } from '../utils/apiError'

interface LoginForm {
  email: string
  password: string
}

interface LoginLocationState {
  successMessage?: string
}

const initialForm: LoginForm = {
  email: '',
  password: '',
}

export default function LoginPage() {
  const [form, setForm] = useState(initialForm)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as LoginLocationState | null

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const { teacher, accessToken, refreshToken } = await loginTeacher(form)
      login(teacher, accessToken, refreshToken)
      navigate(ROUTES.dashboard, { replace: true })
    } catch (error) {
      const isAuthFailure =
        axios.isAxiosError(error) && error.response?.status === 401
      setErrorMessage(
        isAuthFailure
          ? 'Email hoặc mật khẩu không đúng'
          : parseApiError(error, 'Không thể đăng nhập lúc này').message,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-strong">
          {viText.auth.loginKicker}
        </p>
        <h2 className="mt-2 text-3xl font-bold">Đăng nhập</h2>
        <p className="mt-2 text-base leading-7 text-ink-soft">
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
        <p
          role="alert"
          className="mb-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-base text-rose-900"
        >
          {errorMessage}
        </p>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-base font-semibold text-ink">Email</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
            autoComplete="email"
            required
            placeholder={viText.auth.emailPlaceholder}
            className="mt-2 h-12 w-full rounded-xl border-2 border-ink/20 px-4 text-base transition focus:border-brand"
          />
        </label>

        <label className="block">
          <span className="text-base font-semibold text-ink">Mật khẩu</span>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                password: event.target.value,
              }))
            }
            autoComplete="current-password"
            required
            placeholder="Nhập mật khẩu"
            className="mt-2 h-12 w-full rounded-xl border-2 border-ink/20 px-4 text-base transition focus:border-brand"
          />
        </label>

        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </Button>
      </form>

      <p className="mt-6 text-base text-ink-soft">
        Chưa có tài khoản?{' '}
        <Link
          to={ROUTES.register}
          className="inline-flex min-h-11 items-center px-1 font-bold text-brand-strong underline"
        >
          Đăng ký
        </Link>
      </p>
    </div>
  )
}
