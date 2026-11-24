import { useState } from 'react'
import type { FormEvent } from 'react'
import Button from '../components/Button'
import LoadingSpinner from '../components/LoadingSpinner'
import Card from '../components/ui/Card'
import ErrorNotice from '../components/ui/ErrorNotice'
import FormField from '../components/ui/FormField'
import { describedBy, inputClass, textareaClass } from '../components/ui/formStyles'
import { GRADE_LEVEL_VALUES, gradeLevelLabel } from '../constants/labels'
import { viText } from '../constants/viText'
import { useClassroomActions, useClassrooms } from '../hooks/useClassrooms'
import { usePageTitle } from '../hooks/usePageTitle'
import type { Classroom } from '../types/classroom.types'
import { parseApiError } from '../utils/apiError'

const text = viText.classrooms
const EMPTY_FORM = {
  className: '', schoolYear: '', schoolName: '', gradeLevel: '', studentCount: '',
  knowledgeScope: '', characteristics: '', favoriteTopics: '',
}
const textFields = [
  ['className', text.nameLabel, text.nameHint, 100],
  ['schoolYear', text.yearLabel, text.yearHint, 20],
  ['schoolName', text.schoolLabel, text.schoolHint, 100],
] as const
const learningFields = [
  ['knowledgeScope', 'Phạm vi kiến thức đã học'],
  ['characteristics', 'Đặc điểm chung của lớp'],
  ['favoriteTopics', 'Chủ đề yêu thích của lớp'],
] as const

export default function ClassroomsPage() {
  usePageTitle(text.title)

  return <ClassroomsSection />
}

export function ClassroomsSection({ embedded = false }: { embedded?: boolean }) {
  const Heading = embedded ? 'h2' : 'h1'
  const FormHeading = embedded ? 'h3' : 'h2'
  const query = useClassrooms()
  const { create, update, remove } = useClassroomActions()
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [nameError, setNameError] = useState('')
  const [countError, setCountError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const action = editId ? update : create
  const saveError = action.isError ? parseApiError(action.error, text.addError) : undefined

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditId(null)
    setNameError('')
    setCountError('')
    create.reset()
    update.reset()
  }

  const editClassroom = (classroom: Classroom) => {
    resetForm()
    setSavedMessage('')
    setEditId(classroom.classroomId)
    const profile = classroom.learningProfile
    setForm({
      className: classroom.className,
      schoolYear: classroom.schoolYear ?? '',
      schoolName: classroom.schoolName ?? '',
      gradeLevel: profile?.gradeLevel ?? '',
      studentCount: profile?.studentCount?.toString() ?? '',
      knowledgeScope: profile?.knowledgeScope ?? '',
      characteristics: profile?.characteristics ?? '',
      favoriteTopics: profile?.favoriteTopics ?? '',
    })
    document.getElementById('classroom-className')?.focus()
  }

  const setField = (key: keyof typeof EMPTY_FORM, value: string) => setForm((previous) => ({ ...previous, [key]: value }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setSavedMessage('')
    const { className, schoolYear, schoolName, studentCount, ...fields } = form
    const count = studentCount === '' ? null : Number(studentCount)
    const countInvalid = count !== null && (!Number.isInteger(count) || count < 1 || count > 200)
    setNameError(className.trim() ? '' : text.nameRequired)
    setCountError(countInvalid ? 'Sĩ số phải từ 1 đến 200.' : '')
    if (!className.trim() || countInvalid) return

    const includeProfile = editId !== null || count !== null || Object.values(fields).some(Boolean)
    const input = {
      className, schoolYear, schoolName,
      ...(includeProfile ? { learningProfile: { ...fields, gradeLevel: fields.gradeLevel || null, studentCount: count } } : {}),
    }
    const onSuccess = () => {
      resetForm()
      setSavedMessage('Đã lưu lớp học.')
    }
    if (editId) update.mutate({ classroomId: editId, input }, { onSuccess })
    else create.mutate(input, { onSuccess })
  }

  const fieldError = (key: string) => saveError?.fieldErrors[key]
  const gradeError = fieldError('learningProfile.gradeLevel')
  const studentCountError = countError || fieldError('learningProfile.studentCount')

  return (
    <section className="space-y-6">
      <header>
        <Heading className="font-display text-3xl font-extrabold">{text.title}</Heading>
        <p className="mt-1 text-base font-semibold text-ink-soft">{text.intro}</p>
      </header>

      {query.isPending ? <div role="status" className="py-6"><LoadingSpinner label={text.loadingLabel} /></div> : null}
      {query.isError ? (
        <ErrorNotice title={text.errorTitle} message={parseApiError(query.error, text.errorFallback).message}
          action={<Button variant="secondary" onClick={() => query.refetch()}>{text.retry}</Button>} />
      ) : null}
      {query.data?.length === 0 ? (
        <Card className="border-2 border-dashed border-line shadow-none">
          <p className="font-display text-xl font-extrabold">{text.emptyTitle}</p>
          <p className="mt-1 text-base text-ink-soft">{text.emptyDescription}</p>
        </Card>
      ) : null}
      {query.data?.length ? (
        <ul aria-label={text.listLabel} className="grid gap-3 md:grid-cols-2">
          {query.data.map((classroom) => {
            const { classroomId, className, schoolYear, schoolName, learningProfile } = classroom
            return (
              <li key={classroomId}>
                <Card className="flex flex-col gap-2">
                  <p className="font-display text-lg font-extrabold">{className}</p>
                  <p className="text-sm font-bold text-ink-soft">
                    {[
                      schoolYear, schoolName, learningProfile?.gradeLevel && gradeLevelLabel(learningProfile.gradeLevel),
                      learningProfile?.studentCount && learningProfile.studentCount + ' học sinh',
                    ].filter(Boolean).join(' · ')}
                  </p>
                  {confirmingId === classroomId ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-ink-soft">{text.removeNote}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" disabled={remove.isPending || action.isPending}
                          onClick={() => remove.mutate(classroomId, {
                            onSuccess: () => { if (editId === classroomId) resetForm() },
                            onSettled: () => setConfirmingId(null),
                          })}>{text.confirmRemove}</Button>
                        <Button variant="secondary" onClick={() => setConfirmingId(null)}>{text.cancelRemove}</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" aria-label={'Sửa lớp ' + className}
                        disabled={action.isPending || remove.isPending} onClick={() => editClassroom(classroom)}>Sửa</Button>
                      <Button variant="secondary" aria-label={text.remove(className)}
                        disabled={action.isPending || remove.isPending} onClick={() => setConfirmingId(classroomId)}>
                        {text.removeLabel}
                      </Button>
                    </div>
                  )}
                </Card>
              </li>
            )
          })}
        </ul>
      ) : null}
      {remove.isError ? <ErrorNotice message={text.removeError} /> : null}

      <Card as="section" aria-labelledby="classroom-form-title">
        <FormHeading id="classroom-form-title" className="font-display text-2xl font-extrabold">
          {editId ? 'Sửa lớp học' : text.formTitle}
        </FormHeading>
        <form onSubmit={submit} noValidate className="mt-3 space-y-4">
          <fieldset disabled={action.isPending} className="space-y-4">
            {textFields.map(([key, label, hint, maxLength]) => {
              const id = 'classroom-' + key
              const error = (key === 'className' ? nameError : '') || fieldError(key)

              return (
                <FormField key={key} id={id} label={label} hint={hint} error={error} required={key === 'className'}>
                  <input id={id} value={form[key]} maxLength={maxLength}
                    aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy(id, { hint: true, error: Boolean(error) })}
                    className={inputClass(Boolean(error))} onChange={(event) => setField(key, event.target.value)} />
                </FormField>
              )
            })}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="classroom-grade" label="Khối lớp" error={gradeError}>
                <select id="classroom-grade" className={inputClass(Boolean(gradeError))} value={form.gradeLevel}
                  aria-invalid={Boolean(gradeError) || undefined} aria-describedby={describedBy('classroom-grade', { error: Boolean(gradeError) })}
                  onChange={(event) => setField('gradeLevel', event.target.value)}>
                  <option value="">Chưa chọn</option>
                  {GRADE_LEVEL_VALUES.map((grade) => <option value={grade} key={grade}>{gradeLevelLabel(grade)}</option>)}
                </select>
              </FormField>
              <FormField id="classroom-count" label="Sĩ số" error={studentCountError}>
                <input id="classroom-count" type="number" min={1} max={200} value={form.studentCount}
                  aria-invalid={Boolean(studentCountError) || undefined} aria-describedby={describedBy('classroom-count', { error: Boolean(studentCountError) })}
                  className={inputClass(Boolean(studentCountError))} onChange={(event) => setField('studentCount', event.target.value)} />
              </FormField>
            </div>
            {learningFields.map(([key, label]) => {
              const id = 'classroom-' + key
              const error = fieldError('learningProfile.' + key)

              return (
                <FormField key={key} id={id} label={label} error={error}>
                  <textarea id={id} rows={2} maxLength={250} value={form[key]}
                    aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy(id, { error: Boolean(error) })}
                    className={textareaClass(Boolean(error))} onChange={(event) => setField(key, event.target.value)} />
                </FormField>
              )
            })}
            {saveError ? <ErrorNotice message={saveError.code === 'UNSAFE_CONTENT' ? text.unsafe : saveError.message} /> : null}
            {savedMessage ? <p role="status">{savedMessage}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit">{action.isPending ? 'Đang lưu...' : editId ? 'Lưu lớp' : text.add}</Button>
              {editId ? <Button type="button" variant="secondary" onClick={resetForm}>Hủy sửa</Button> : null}
            </div>
          </fieldset>
        </form>
      </Card>
    </section>
  )
}
