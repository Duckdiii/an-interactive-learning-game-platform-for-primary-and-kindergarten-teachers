import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/authApi'
import Button from '../components/Button'
import ErrorNotice from '../components/ui/ErrorNotice'
import FormField from '../components/ui/FormField'
import PasswordInput from '../components/ui/PasswordInput'
import PasswordStrengthMeter from '../components/ui/PasswordStrengthMeter'
import { describedBy } from '../components/ui/formStyles'
import { viText } from '../constants/viText'
import { usePageTitle } from '../hooks/usePageTitle'
import { ROUTES } from '../routes/paths'
import { parseApiError } from '../utils/apiError'

const PASSWORD_ID = 'reset-password'
const CONFIRM_ID = 'reset-confirm'

interface FieldErrors {
  newPassword?: string
  confirmPassword?: string
}

export default function ResetPasswordPage() {
  usePageTitle('Đặt lại mật khẩu')
  const [searchParams, setSearchParams] = useSearchParams()
  // Giữ token trong state rồi xóa khỏi thanh địa chỉ: không để liên kết đặt lại nằm lại trong lịch sử trình duyệt.
  const [token] = useState(() => searchParams.get('token') ?? '')
  const navigate = useNavigate()

  useEffect(() => {
    if (searchParams.has('token')) setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  // Lỗi liên kết (hết hạn, đã dùng, sai) khác lỗi mật khẩu: chỉ cách khắc phục là xin liên kết mới.
  const [linkError, setLinkError] = useState(token ? '' : viText.auth.resetMissingToken)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors: FieldErrors = {}
    if (newPassword.length < 8) nextErrors.newPassword = 'Mật khẩu phải có ít nhất 8 ký tự'
    if (confirmPassword !== newPassword) nextErrors.confirmPassword = 'Mật khẩu xác nhận không khớp'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      document.getElementById(nextErrors.newPassword ? PASSWORD_ID : CONFIRM_ID)?.focus()
      return
    }

    setIsSubmitting(true)
    try {
      await resetPassword(token, newPassword)
      navigate(ROUTES.login, { replace: true, state: { successMessage: viText.auth.resetSuccess } })
    } catch (error) {
      const parsed = parseApiError(error, 'Không thể đặt lại mật khẩu lúc này')
      if (parsed.fieldErrors.newPassword) {
        setErrors({ newPassword: parsed.fieldErrors.newPassword })
        document.getElementById(PASSWORD_ID)?.focus()
      } else {
        setLinkError(parsed.message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full min-w-0">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-extrabold leading-tight">{viText.auth.resetTitle}</h1>
        <p className="mt-1 text-base font-semibold text-ink-soft">{viText.auth.resetDescription}</p>
      </div>

      {linkError ? (
        <div className="mb-4">
          <ErrorNotice message={linkError} />
          <Link
            to={ROUTES.forgotPassword}
            className="mt-3 inline-flex min-h-11 items-center px-1 font-black text-brand-strong underline"
          >
            {viText.auth.requestNewLink}
          </Link>
        </div>
      ) : null}

      {/* Liên kết đã bị báo hỏng thì không cho nhập lại với chính liên kết đó: lối duy nhất là xin liên kết mới. */}
      {token && !linkError ? (
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <FormField
            id={PASSWORD_ID}
            label={viText.auth.newPassword}
            hint={viText.auth.passwordHint}
            error={errors.newPassword}
          >
            <PasswordInput
              id={PASSWORD_ID}
              name="newPassword"
              value={newPassword}
              onChange={(value) => {
                setNewPassword(value)
                setErrors((current) => ({ ...current, newPassword: undefined }))
              }}
              autoComplete="new-password"
              invalid={Boolean(errors.newPassword)}
              describedBy={describedBy(PASSWORD_ID, { hint: true, error: Boolean(errors.newPassword) })}
            />
            {newPassword ? <PasswordStrengthMeter password={newPassword} /> : null}
          </FormField>

          <FormField id={CONFIRM_ID} label={viText.auth.confirmPassword} error={errors.confirmPassword}>
            <PasswordInput
              id={CONFIRM_ID}
              name="confirmPassword"
              value={confirmPassword}
              onChange={(value) => {
                setConfirmPassword(value)
                setErrors((current) => ({ ...current, confirmPassword: undefined }))
              }}
              autoComplete="new-password"
              placeholder="Nhập lại mật khẩu"
              invalid={Boolean(errors.confirmPassword)}
              describedBy={describedBy(CONFIRM_ID, { error: Boolean(errors.confirmPassword) })}
              toggleSuffix=" xác nhận"
            />
          </FormField>

          <Button type="submit" size="lg" fullWidth disabled={isSubmitting}>
            {isSubmitting ? viText.auth.resetSubmitting : viText.auth.resetSubmit}
          </Button>
        </form>
      ) : null}

      <p className="mt-6 text-center text-sm font-bold text-ink-soft">
        <Link
          to={ROUTES.login}
          className="inline-flex min-h-11 items-center px-1 font-black text-brand-strong underline"
        >
          {viText.auth.backToLogin}
        </Link>
      </p>
    </div>
  )
}
