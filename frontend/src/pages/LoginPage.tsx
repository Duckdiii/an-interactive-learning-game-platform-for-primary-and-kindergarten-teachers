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
import { viText } from '../constants/viText'
import { useAuth } from '../hooks/useAuth'
import { usePageTitle } from '../hooks/usePageTitle'
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
  usePageTitle('Đăng nhập')
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
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-strong">
          {viText.auth.loginKicker}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold">Đăng nhập</h1>
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

        <FormField id="login-password" label="Mật khẩu">
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
