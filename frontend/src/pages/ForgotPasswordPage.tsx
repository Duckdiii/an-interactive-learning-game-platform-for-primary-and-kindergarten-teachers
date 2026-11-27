import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../api/authApi'
import Button from '../components/Button'
import ErrorNotice from '../components/ui/ErrorNotice'
import FormField from '../components/ui/FormField'
import { describedBy, inputClass } from '../components/ui/formStyles'
import { viText } from '../constants/viText'
import { usePageTitle } from '../hooks/usePageTitle'
import { ROUTES } from '../routes/paths'
import { parseApiError } from '../utils/apiError'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMAIL_ID = 'forgot-email'

export default function ForgotPasswordPage() {
  usePageTitle('Quên mật khẩu')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [formError, setFormError] = useState('')
  // Thông điệp của Backend luôn giống nhau dù email có tồn tại hay không: hiện nguyên văn, không tự đoán thêm.
  const [sentMessage, setSentMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')

    if (!emailPattern.test(email.trim())) {
      setEmailError('Email không đúng định dạng')
      document.getElementById(EMAIL_ID)?.focus()
      return
    }

    setEmailError('')
    setIsSubmitting(true)

    try {
      setSentMessage(await requestPasswordReset(email.trim()))
    } catch (error) {
      setFormError(parseApiError(error, 'Không thể gửi yêu cầu lúc này').message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full min-w-0">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-extrabold leading-tight">{viText.auth.forgotTitle}</h1>
        <p className="mt-1 text-base font-semibold text-ink-soft">{viText.auth.forgotDescription}</p>
      </div>

      {sentMessage ? (
        <div
          role="status"
          className="mb-4 rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 text-base text-brand-strong"
        >
          <p className="font-bold">{sentMessage}</p>
          <p className="mt-1">{viText.auth.forgotCheckMail}</p>
        </div>
      ) : (
        <>
          {formError ? <ErrorNotice message={formError} className="mb-4" /> : null}

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <FormField id={EMAIL_ID} label="Email" error={emailError}>
              <input
                id={EMAIL_ID}
                name="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setEmailError('')
                }}
                autoComplete="email"
                placeholder={viText.auth.emailPlaceholder}
                aria-invalid={emailError ? true : undefined}
                aria-describedby={describedBy(EMAIL_ID, { error: Boolean(emailError) })}
                className={inputClass(Boolean(emailError))}
              />
            </FormField>

            <Button type="submit" size="lg" fullWidth disabled={isSubmitting}>
              {isSubmitting ? viText.auth.forgotSubmitting : viText.auth.forgotSubmit}
            </Button>
          </form>
        </>
      )}

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
