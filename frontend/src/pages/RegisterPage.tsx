import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerTeacher } from '../api/authApi'
import Button from '../components/Button'
import ErrorNotice from '../components/ui/ErrorNotice'
import FormField from '../components/ui/FormField'
import PasswordInput from '../components/ui/PasswordInput'
import { describedBy, inputClass } from '../components/ui/formStyles'
import { viText } from '../constants/viText'
import { usePageTitle } from '../hooks/usePageTitle'
import { ROUTES } from '../routes/paths'
import { parseApiError } from '../utils/apiError'

interface RegisterForm {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

type FieldKey = keyof RegisterForm
type FieldErrors = Partial<Record<FieldKey | 'form', string>>

const FIELD_ORDER: ReadonlyArray<FieldKey> = [
  'fullName',
  'email',
  'password',
  'confirmPassword',
]

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

const fieldId = (field: FieldKey) => `register-${field}`

// Đưa tiêu điểm tới ô lỗi đầu tiên để giáo viên (và trình đọc màn hình) biết ngay chỗ cần sửa, không phải tự tìm.
function focusFirstError(errors: FieldErrors) {
  const first = FIELD_ORDER.find((field) => errors[field])

  if (first) document.getElementById(fieldId(first))?.focus()
}

export default function RegisterPage() {
  usePageTitle('Đăng ký')
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const updateField = (field: FieldKey, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }))
  }

  const showErrors = (next: FieldErrors) => {
    setErrors(next)
    // Chờ React vẽ xong (ô lỗi đã có aria-invalid) rồi mới chuyển tiêu điểm.
    setTimeout(() => focusFirstError(next), 0)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationErrors = validateForm(form)
    if (Object.keys(validationErrors).length > 0) {
      showErrors(validationErrors)
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

      for (const field of FIELD_ORDER) {
        if (parsedError.fieldErrors[field]) {
          knownFieldErrors[field] = parsedError.fieldErrors[field]
        }
      }

      if (Object.keys(knownFieldErrors).length === 0) {
        knownFieldErrors.form = parsedError.message
      }

      showErrors(knownFieldErrors)
    } finally {
      setIsSubmitting(false)
    }
  }

  const textField = (
    field: 'fullName' | 'email',
    label: string,
    autoComplete: string,
    placeholder: string,
    type: 'text' | 'email',
  ) => (
    <FormField id={fieldId(field)} label={label} error={errors[field]}>
      <input
        id={fieldId(field)}
        name={field}
        type={type}
        value={form[field]}
        onChange={(event) => updateField(field, event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={errors[field] ? true : undefined}
        aria-describedby={describedBy(fieldId(field), { error: Boolean(errors[field]) })}
        className={inputClass(Boolean(errors[field]))}
      />
    </FormField>
  )

  return (
    <div className="w-full">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-strong">
          {viText.auth.registerKicker}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold">Tạo tài khoản</h1>
        <p className="mt-2 text-base leading-7 text-ink-soft">
          Đăng ký tài khoản giáo viên để bắt đầu xây dựng trò chơi học tập.
        </p>
      </div>

      {errors.form ? (
        <ErrorNotice message={errors.form} className="mb-4" />
      ) : null}

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {textField('fullName', 'Họ và tên', 'name', 'Nguyễn Văn An', 'text')}
        {textField('email', 'Email', 'email', viText.auth.emailPlaceholder, 'email')}

        <FormField
          id={fieldId('password')}
          label="Mật khẩu"
          hint={viText.auth.passwordHint}
          error={errors.password}
        >
          <PasswordInput
            id={fieldId('password')}
            name="password"
            value={form.password}
            onChange={(value) => updateField('password', value)}
            autoComplete="new-password"
            invalid={Boolean(errors.password)}
            describedBy={describedBy(fieldId('password'), {
              hint: true,
              error: Boolean(errors.password),
            })}
          />
        </FormField>

        <FormField
          id={fieldId('confirmPassword')}
          label="Xác nhận mật khẩu"
          error={errors.confirmPassword}
        >
          <PasswordInput
            id={fieldId('confirmPassword')}
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={(value) => updateField('confirmPassword', value)}
            autoComplete="new-password"
            placeholder="Nhập lại mật khẩu"
            invalid={Boolean(errors.confirmPassword)}
            describedBy={describedBy(fieldId('confirmPassword'), {
              error: Boolean(errors.confirmPassword),
            })}
            toggleSuffix=" xác nhận"
          />
        </FormField>

        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Đang đăng ký...' : 'Đăng ký'}
        </Button>
      </form>

      <p className="mt-6 text-base text-ink-soft">
        Đã có tài khoản?{' '}
        <Link
          to={ROUTES.login}
          className="inline-flex min-h-11 items-center px-1 font-bold text-brand-strong underline"
        >
          Đăng nhập
        </Link>
      </p>
    </div>
  )
}
