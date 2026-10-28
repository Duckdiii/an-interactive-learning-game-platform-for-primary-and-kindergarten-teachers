import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerTeacher } from '../api/authApi'
import Button from '../components/Button'
import ErrorNotice from '../components/ui/ErrorNotice'
import FormField from '../components/ui/FormField'
import PasswordInput from '../components/ui/PasswordInput'
import { describedBy, inputClass } from '../components/ui/formStyles'
import { AUTH_FEATURES } from '../config/authFeatures'
import { viText } from '../constants/viText'
import { usePageTitle } from '../hooks/usePageTitle'
import { ROUTES } from '../routes/paths'
import { parseApiError } from '../utils/apiError'
import { passwordStrength } from '../utils/passwordStrength'

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

// Thanh 3 vạch + nhãn đọc to khi đổi; theo đúng luật Backend (xem passwordStrength) nhưng chỉ gợi ý, không chặn nộp. Không dùng đỏ: mức thấp là vàng.
function StrengthMeter({ password }: { password: string }) {
  const { level, label } = passwordStrength(password)

  return (
    <div className="mt-2">
      <div aria-hidden="true" className="flex gap-1.5">
        {[1, 2, 3].map((bar) => (
          <span
            key={bar}
            className={`h-2 flex-1 rounded-full ${
              bar > level ? 'bg-line' : level === 3 ? 'bg-brand' : 'bg-sun'
            }`}
          />
        ))}
      </div>
      <p aria-live="polite" className="mt-1 text-sm font-semibold text-ink-soft">
        <span className="sr-only">{viText.auth.strengthLabel}: </span>
        {label}
      </p>
    </div>
  )
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
    <div className="w-full min-w-0">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-extrabold leading-tight">
          {viText.auth.registerTitle}
        </h1>
        <p className="mt-1 text-base font-semibold text-ink-soft">
          {viText.auth.registerDescription}
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
          {/* Ô còn trống thì chưa chấm: không chê khi giáo viên chưa gõ gì. */}
          {form.password ? <StrengthMeter password={form.password} /> : null}
        </FormField>

        <FormField
          id={fieldId('confirmPassword')}
          label={viText.auth.confirmPassword}
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

        {AUTH_FEATURES.teachingLevel ? (
          // Chưa gửi lên API: RegisterRequest chưa có trường cấp dạy.
          <fieldset>
            <legend className="text-base font-bold">{viText.auth.teachingLevelLabel}</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {viText.auth.teachingLevels.map((level) => (
                <label
                  key={level}
                  className="inline-flex min-h-12 items-center gap-2 rounded-2xl border-2 border-line px-4 text-base font-bold has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
                >
                  <input type="radio" name="teachingLevel" value={level} className="accent-brand" />
                  {level}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <Button type="submit" size="lg" fullWidth disabled={isSubmitting}>
          {isSubmitting ? viText.auth.registerSubmitting : viText.auth.registerSubmit}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm font-bold text-ink-soft">
        {viText.auth.hasAccount}{' '}
        <Link
          to={ROUTES.login}
          className="inline-flex min-h-11 items-center px-1 font-black text-brand-strong underline"
        >
          Đăng nhập
        </Link>
      </p>
    </div>
  )
}
