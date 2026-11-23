import { useState } from 'react'
import type { FormEvent } from 'react'
import Button from '../components/Button'
import LoadingSpinner from '../components/LoadingSpinner'
import Card from '../components/ui/Card'
import ErrorNotice from '../components/ui/ErrorNotice'
import FormField from '../components/ui/FormField'
import { describedBy, inputClass } from '../components/ui/formStyles'
import { viText } from '../constants/viText'
import { useClassroomActions, useClassrooms } from '../hooks/useClassrooms'
import { usePageTitle } from '../hooks/usePageTitle'
import { parseApiError } from '../utils/apiError'

const text = viText.classrooms

const EMPTY_FORM = { className: '', schoolYear: '', schoolName: '' }

export default function ClassroomsPage() {
  usePageTitle(text.title)
  const query = useClassrooms()
  const { create, remove } = useClassroomActions()
  const [form, setForm] = useState(EMPTY_FORM)
  const [nameError, setNameError] = useState('')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const setField = (key: keyof typeof EMPTY_FORM) => (value: string) => setForm((previous) => ({ ...previous, [key]: value }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!form.className.trim()) {
      setNameError(text.nameRequired)

      return
    }
    setNameError('')
    create.mutate(
      { className: form.className, schoolYear: form.schoolYear, schoolName: form.schoolName },
      { onSuccess: () => setForm(EMPTY_FORM) },
    )
  }

  // 422 là nội dung chưa đạt chuẩn an toàn (UC-16 4b): nói rõ câu của SRS; lỗi khác dùng câu chung.
  const addErrorMessage = create.isError
    ? parseApiError(create.error, text.addError).code === 'UNSAFE_CONTENT'
      ? text.unsafe
      : text.addError
    : ''

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold">{text.title}</h1>
        <p className="mt-1 text-base font-semibold text-ink-soft">{text.intro}</p>
      </header>

      {query.isPending ? (
        <div role="status" className="py-6">
          <LoadingSpinner label={text.loadingLabel} />
        </div>
      ) : null}
      {query.isError ? (
        <ErrorNotice
          title={text.errorTitle}
          message={parseApiError(query.error, text.errorFallback).message}
          action={
            <Button variant="secondary" onClick={() => query.refetch()}>
              {text.retry}
            </Button>
          }
        />
      ) : null}

      {query.data && query.data.length === 0 ? (
        <Card className="border-2 border-dashed border-line shadow-none">
          <p className="font-display text-xl font-extrabold">{text.emptyTitle}</p>
          <p className="mt-1 text-base text-ink-soft">{text.emptyDescription}</p>
        </Card>
      ) : null}

      {query.data && query.data.length > 0 ? (
        <ul aria-label={text.listLabel} className="grid gap-3 md:grid-cols-2">
          {query.data.map((classroom) => (
            <li key={classroom.classroomId}>
              <Card className="flex flex-col gap-2">
                <p className="font-display text-lg font-extrabold">{classroom.className}</p>
                <p className="text-sm font-bold text-ink-soft">
                  {[classroom.schoolYear, classroom.schoolName].filter(Boolean).join(' · ')}
                </p>
                {confirmingId === classroom.classroomId ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-ink-soft">{text.removeNote}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => remove.mutate(classroom.classroomId, { onSettled: () => setConfirmingId(null) })}
                      >
                        {text.confirmRemove}
                      </Button>
                      <Button variant="secondary" onClick={() => setConfirmingId(null)}>
                        {text.cancelRemove}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Button
                      variant="secondary"
                      aria-label={text.remove(classroom.className)}
                      onClick={() => setConfirmingId(classroom.classroomId)}
                    >
                      {text.removeLabel}
                    </Button>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
      {remove.isError ? <ErrorNotice message={text.removeError} /> : null}

      <Card as="section" aria-labelledby="classroom-form-title">
        <h2 id="classroom-form-title" className="font-display text-2xl font-extrabold">
          {text.formTitle}
        </h2>
        <form onSubmit={submit} noValidate className="mt-3 space-y-4">
          <FormField id="classroom-name" label={text.nameLabel} hint={text.nameHint} error={nameError} required>
            <input
              id="classroom-name"
              value={form.className}
              maxLength={100}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={describedBy('classroom-name', { hint: true, error: Boolean(nameError) })}
              onChange={(event) => setField('className')(event.target.value)}
              className={inputClass(Boolean(nameError))}
            />
          </FormField>
          <FormField id="classroom-year" label={text.yearLabel} hint={text.yearHint}>
            <input
              id="classroom-year"
              value={form.schoolYear}
              maxLength={20}
              aria-describedby={describedBy('classroom-year', { hint: true })}
              onChange={(event) => setField('schoolYear')(event.target.value)}
              className={inputClass()}
            />
          </FormField>
          <FormField id="classroom-school" label={text.schoolLabel} hint={text.schoolHint}>
            <input
              id="classroom-school"
              value={form.schoolName}
              maxLength={100}
              aria-describedby={describedBy('classroom-school', { hint: true })}
              onChange={(event) => setField('schoolName')(event.target.value)}
              className={inputClass()}
            />
          </FormField>
          {addErrorMessage ? <ErrorNotice message={addErrorMessage} /> : null}
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? text.adding : text.add}
          </Button>
        </form>
      </Card>
    </div>
  )
}
