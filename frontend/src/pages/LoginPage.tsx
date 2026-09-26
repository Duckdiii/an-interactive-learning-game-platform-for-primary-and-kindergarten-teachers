import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { loginTeacher } from '../api/authApi'
import Button from '../components/Button'
import { useAuth } from '../hooks/useAuth'
import { ROUTES } from '../routes/paths'

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
    } catch {
      setErrorMessage('Email hoặc mật khẩu không đúng')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
          Welcome back
        </p>
        <h2 className="mt-2 text-3xl font-semibold">Đăng nhập</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Tiếp tục vào Teacher Console để quản lý và xây dựng trò chơi học tập.
        </p>
      </div>

      {locationState?.successMessage ? (
        <p
          role="status"
          className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
        >
          {locationState.successMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p
          role="alert"
          className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          {errorMessage}
        </p>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Email</span>
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
            placeholder="teacher@example.com"
            className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Mật khẩu</span>
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
            className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </Button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        Chưa có tài khoản?{' '}
        <Link to={ROUTES.register} className="font-semibold text-emerald-700">
          Đăng ký
        </Link>
      </p>
    </div>
  )
}
