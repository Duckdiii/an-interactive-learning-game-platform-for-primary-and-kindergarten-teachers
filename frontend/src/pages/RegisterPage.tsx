import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerTeacher } from '../api/authApi'
import Button from '../components/Button'
import { ROUTES } from '../routes/paths'
import { parseApiError } from '../utils/apiError'

interface RegisterForm {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

type FieldErrors = Partial<Record<keyof RegisterForm | 'form', string>>

const initialForm: RegisterForm = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateForm(form: RegisterForm): FieldErrors {
  const errors: FieldErrors = {}

  if (!form.fullName.trim()) {
    errors.fullName = 'Vui lòng nhập họ và tên'
  }

  if (!emailPattern.test(form.email.trim())) {
    errors.email = 'Email không đúng định dạng'
  }

  if (form.password.length < 8) {
    errors.password = 'Mật khẩu phải có ít nhất 8 ký tự'
  }

  if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp'
  }

  return errors
}

export default function RegisterPage() {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const updateField = (field: keyof RegisterForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationErrors = validateForm(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors({})
    setIsSubmitting(true)

    try {
      await registerTeacher({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      navigate(ROUTES.login, {
        replace: true,
        state: { successMessage: 'Đăng ký thành công, mời đăng nhập' },
      })
    } catch (error) {
      const parsedError = parseApiError(error, 'Không thể đăng ký lúc này')
      const knownFieldErrors: FieldErrors = {}

      for (const field of [
        'fullName',
        'email',
        'password',
        'confirmPassword',
      ] as const) {
        if (parsedError.fieldErrors[field]) {
          knownFieldErrors[field] = parsedError.fieldErrors[field]
        }
      }

      if (Object.keys(knownFieldErrors).length === 0) {
        knownFieldErrors.form = parsedError.message
      }

      setErrors(knownFieldErrors)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
          Teacher access
        </p>
        <h2 className="mt-2 text-3xl font-semibold">Tạo tài khoản</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Đăng ký tài khoản giáo viên để bắt đầu xây dựng trò chơi học tập.
        </p>
      </div>

      {errors.form ? (
        <p
          role="alert"
          className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          {errors.form}
        </p>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <Field
          label="Họ và tên"
          name="fullName"
          type="text"
          value={form.fullName}
          error={errors.fullName}
          autoComplete="name"
          placeholder="Nguyễn Văn An"
          onChange={(value) => updateField('fullName', value)}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          value={form.email}
          error={errors.email}
          autoComplete="email"
          placeholder="teacher@example.com"
          onChange={(value) => updateField('email', value)}
        />
        <Field
          label="Mật khẩu"
          name="password"
          type="password"
          value={form.password}
          error={errors.password}
          autoComplete="new-password"
          placeholder="Tối thiểu 8 ký tự"
          onChange={(value) => updateField('password', value)}
        />
        <Field
          label="Xác nhận mật khẩu"
          name="confirmPassword"
          type="password"
          value={form.confirmPassword}
          error={errors.confirmPassword}
          autoComplete="new-password"
          placeholder="Nhập lại mật khẩu"
          onChange={(value) => updateField('confirmPassword', value)}
        />

        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Đang đăng ký...' : 'Đăng ký'}
        </Button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        Đã có tài khoản?{' '}
        <Link to={ROUTES.login} className="font-semibold text-emerald-700">
          Đăng nhập
        </Link>
      </p>
    </div>
  )
}

interface FieldProps {
  label: string
  name: string
  type: 'text' | 'email' | 'password'
  value: string
  error?: string
  autoComplete: string
  placeholder: string
  onChange: (value: string) => void
}

function Field({
  label,
  name,
  type,
  value,
  error,
  autoComplete,
  placeholder,
  onChange,
}: FieldProps) {
  const errorId = `${name}-error`

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={[
          'mt-2 h-11 w-full rounded-md border px-3 text-sm outline-none transition focus:ring-2',
          error
            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
            : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-100',
        ].join(' ')}
      />
      {error ? (
        <span id={errorId} className="mt-1 block text-xs text-rose-700">
          {error}
        </span>
      ) : null}
    </label>
  )
}
